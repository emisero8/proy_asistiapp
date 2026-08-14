package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.models.dtos.entrada.CompraOnlineRequestDTO;
import com.asistiapp.backend.models.dtos.entrada.IniciarCompraResponseDTO;
import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.entities.Tanda;
import com.asistiapp.backend.models.enums.EstadoEvento;
import com.asistiapp.backend.repositories.EntradaRepository;
import com.asistiapp.backend.repositories.EventoRepository;
import com.asistiapp.backend.repositories.TandaRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Prueba de concurrencia REAL contra H2 (no mocks) para el componente más
 * crítico del sistema: el anti-sobreventa de VentaService.
 *
 * Simula N compradores confirmando el pago de la ÚLTIMA tanda disponible
 * exactamente al mismo tiempo (CountDownLatch como línea de largada) y
 * verifica que, sin importar la concurrencia, nunca se vendan más entradas
 * que el cupo_maximo configurado — que es exactamente lo que el pessimistic
 * locking de TandaRepository.findByIdWithLock() + decrementarCupo() deben
 * garantizar.
 */
@SpringBootTest
@ActiveProfiles("test")
class VentaServiceConcurrencyTest {

    private static final int CUPO_MAXIMO = 5;
    private static final int COMPRADORES_CONCURRENTES = 20;

    @Autowired
    private VentaService ventaService;
    @Autowired
    private EventoRepository eventoRepository;
    @Autowired
    private TandaRepository tandaRepository;
    @Autowired
    private EntradaRepository entradaRepository;

    @Test
    void confirmarPagoWebhook_bajoConcurrencia_nuncaVendeMasEntradasQueElCupo() throws Exception {
        Tanda tanda = crearEventoPublicadoConTanda(CUPO_MAXIMO);

        // Cada comprador inicia su compra ANTES de la línea de largada —
        // así todos llegan a confirmarPagoWebhook() con el pago "aprobado"
        // al mismo tiempo, que es el escenario real de riesgo de sobreventa.
        List<String> ordenesIds = new java.util.ArrayList<>();
        for (int i = 0; i < COMPRADORES_CONCURRENTES; i++) {
            CompraOnlineRequestDTO dto = new CompraOnlineRequestDTO();
            dto.setIdTanda(tanda.getId());
            dto.setNombreComprador("Comprador " + i);
            dto.setEmailComprador("comprador" + i + "@test.com");
            IniciarCompraResponseDTO orden = ventaService.iniciarCompraOnline(dto);
            ordenesIds.add(orden.getOrdenId());
        }

        ExecutorService pool = Executors.newFixedThreadPool(COMPRADORES_CONCURRENTES);
        CountDownLatch lineaDeLargada = new CountDownLatch(1);
        AtomicInteger exitosas = new AtomicInteger();
        AtomicInteger agotadas = new AtomicInteger();

        List<Future<?>> futures = new java.util.ArrayList<>();
        for (int i = 0; i < COMPRADORES_CONCURRENTES; i++) {
            String ordenId = ordenesIds.get(i);
            long paymentId = 1000L + i;
            futures.add(pool.submit(() -> {
                try {
                    lineaDeLargada.await();
                    ventaService.confirmarPagoWebhook(ordenId, paymentId);
                    exitosas.incrementAndGet();
                } catch (BusinessRuleException e) {
                    agotadas.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }));
        }

        lineaDeLargada.countDown(); // todos arrancan a la vez
        for (Future<?> f : futures) {
            f.get(30, TimeUnit.SECONDS);
        }
        pool.shutdown();

        assertThat(exitosas.get()).isEqualTo(CUPO_MAXIMO);
        assertThat(agotadas.get()).isEqualTo(COMPRADORES_CONCURRENTES - CUPO_MAXIMO);

        Tanda tandaFinal = tandaRepository.findById(tanda.getId()).orElseThrow();
        assertThat(tandaFinal.getCupoDisponible()).isZero(); // nunca negativo, nunca sobrevendido

        long entradasCreadas = entradaRepository.findByEventoId(tanda.getEvento().getId()).size();
        assertThat(entradasCreadas).isEqualTo(CUPO_MAXIMO);
    }

    private Tanda crearEventoPublicadoConTanda(int cupoMaximo) {
        Evento evento = new Evento();
        evento.setIdOrganizador(1L);
        evento.setNombre("Evento concurrencia " + System.nanoTime());
        evento.setFechaEvento(LocalDate.now().plusDays(30));
        evento.setHoraEvento(LocalTime.of(21, 0));
        evento.setLugar("Lugar de prueba");
        evento.setEstado(EstadoEvento.Publicado);
        Evento eventoGuardado = eventoRepository.save(evento);

        Tanda tanda = new Tanda();
        tanda.setEvento(eventoGuardado);
        tanda.setNombre("Última tanda");
        tanda.setPrecio(1000.0);
        tanda.setCupoMaximo(cupoMaximo);
        tanda.setCupoDisponible(cupoMaximo);
        return tandaRepository.save(tanda);
    }
}
