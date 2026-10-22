package com.asistiapp.backend.services;

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
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
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

    /** mercadopago_payment_id es único y los tests comparten base: cada pago simulado necesita su propio id. */
    private static final java.util.concurrent.atomic.AtomicLong PROXIMO_PAGO = new java.util.concurrent.atomic.AtomicLong(1000);

    @Autowired
    private VentaService ventaService;
    @Autowired
    private EventoRepository eventoRepository;
    @Autowired
    private TandaRepository tandaRepository;
    @Autowired
    private EntradaRepository entradaRepository;

    /** No se le pega a MercadoPago de verdad: acá solo se prueba el anti-sobreventa. */
    @MockBean
    private MercadoPagoService mercadoPagoService;

    @org.junit.jupiter.api.BeforeEach
    void mockearMercadoPago() {
        org.mockito.Mockito.when(mercadoPagoService.calcularVencimiento())
                .thenReturn(java.time.LocalDateTime.now().plusMinutes(30));
        org.mockito.Mockito.when(mercadoPagoService.crearPreferencia(org.mockito.ArgumentMatchers.any()))
                .thenReturn(new MercadoPagoService.PreferenciaCreada("pref", "https://mp.test/init"));
    }

    @Test
    void confirmarPagoEntradas_bajoConcurrencia_nuncaVendeMasEntradasQueElCupo() throws Exception {
        Tanda tanda = crearEventoPublicadoConTanda(CUPO_MAXIMO);

        // Cada comprador inicia su compra ANTES de la línea de largada —
        // así todos llegan a confirmarPagoEntradas() con el pago "aprobado"
        // al mismo tiempo, que es el escenario real de riesgo de sobreventa.
        List<String> referencias = iniciarCompras(tanda, COMPRADORES_CONCURRENTES, 1);

        Resultados r = confirmarTodosAlMismoTiempo(referencias, BigDecimal.valueOf(1000.0));

        assertThat(r.confirmadas.get()).isEqualTo(CUPO_MAXIMO);
        assertThat(r.sinDisponibilidad.get()).isEqualTo(COMPRADORES_CONCURRENTES - CUPO_MAXIMO);

        Tanda tandaFinal = tandaRepository.findById(tanda.getId()).orElseThrow();
        assertThat(tandaFinal.getCupoDisponible()).isZero(); // nunca negativo, nunca sobrevendido
        assertThat(entradaRepository.findByEventoId(tanda.getEvento().getId())).hasSize(CUPO_MAXIMO);
    }

    @Test
    void confirmarPagoEntradas_ordenesDeVariasEntradas_sonTodoONadaYNuncaSobrevenden() throws Exception {
        Tanda tanda = crearEventoPublicadoConTanda(CUPO_MAXIMO);

        // 20 órdenes de 2 entradas para un cupo de 5: solo caben 2 órdenes completas (4 entradas).
        // Ninguna orden se confirma a medias: la quinta entrada queda libre.
        List<String> referencias = iniciarCompras(tanda, COMPRADORES_CONCURRENTES, 2);

        Resultados r = confirmarTodosAlMismoTiempo(referencias, BigDecimal.valueOf(2000.0));

        assertThat(r.confirmadas.get()).isEqualTo(2);
        assertThat(r.sinDisponibilidad.get()).isEqualTo(COMPRADORES_CONCURRENTES - 2);

        Tanda tandaFinal = tandaRepository.findById(tanda.getId()).orElseThrow();
        assertThat(tandaFinal.getCupoDisponible()).isEqualTo(1);
        assertThat(entradaRepository.findByEventoId(tanda.getEvento().getId())).hasSize(4);
    }

    @Test
    void confirmarPagoEntradas_elMismoPagoNotificadoEnParalelo_seProcesaUnaSolaVez() throws Exception {
        Tanda tanda = crearEventoPublicadoConTanda(CUPO_MAXIMO);
        String referencia = iniciarCompras(tanda, 1, 2).get(0);
        long paymentIdUnico = PROXIMO_PAGO.getAndIncrement();

        // MercadoPago reintenta: la misma notificación llega 10 veces a la vez.
        ExecutorService pool = Executors.newFixedThreadPool(10);
        CountDownLatch lineaDeLargada = new CountDownLatch(1);
        AtomicInteger confirmadas = new AtomicInteger();
        AtomicInteger yaProcesadas = new AtomicInteger();
        List<Future<?>> futures = new java.util.ArrayList<>();
        for (int i = 0; i < 10; i++) {
            futures.add(pool.submit(() -> {
                try {
                    lineaDeLargada.await();
                    var res = ventaService.confirmarPagoEntradas(referencia, paymentIdUnico, BigDecimal.valueOf(2000.0), "ARS");
                    if (res.resultado() == ResultadoPago.CONFIRMADA) confirmadas.incrementAndGet();
                    if (res.resultado() == ResultadoPago.YA_PROCESADA) yaProcesadas.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }));
        }
        lineaDeLargada.countDown();
        for (Future<?> f : futures) {
            f.get(30, TimeUnit.SECONDS);
        }
        pool.shutdown();

        assertThat(confirmadas.get()).isEqualTo(1);
        assertThat(yaProcesadas.get()).isEqualTo(9);
        assertThat(entradaRepository.findByEventoId(tanda.getEvento().getId())).hasSize(2); // una orden de 2, una sola vez
    }

    private static class Resultados {
        final AtomicInteger confirmadas = new AtomicInteger();
        final AtomicInteger sinDisponibilidad = new AtomicInteger();
    }

    private List<String> iniciarCompras(Tanda tanda, int compradores, int cantidad) {
        List<String> referencias = new java.util.ArrayList<>();
        for (int i = 0; i < compradores; i++) {
            CompraOnlineRequestDTO dto = new CompraOnlineRequestDTO();
            dto.setIdTanda(tanda.getId());
            dto.setCantidad(cantidad);
            dto.setNombreComprador("Comprador " + i);
            dto.setEmailComprador("comprador" + i + "-" + System.nanoTime() + "@test.com");
            IniciarCompraResponseDTO orden = ventaService.iniciarCompraOnline(dto);
            referencias.add(orden.getOrdenId());
        }
        return referencias;
    }

    private Resultados confirmarTodosAlMismoTiempo(List<String> referencias, BigDecimal monto) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(referencias.size());
        CountDownLatch lineaDeLargada = new CountDownLatch(1);
        Resultados r = new Resultados();

        List<Future<?>> futures = new java.util.ArrayList<>();
        for (int i = 0; i < referencias.size(); i++) {
            String referencia = referencias.get(i);
            long paymentId = PROXIMO_PAGO.getAndIncrement();
            futures.add(pool.submit(() -> {
                try {
                    lineaDeLargada.await();
                    var res = ventaService.confirmarPagoEntradas(referencia, paymentId, monto, "ARS");
                    if (res.resultado() == ResultadoPago.CONFIRMADA) r.confirmadas.incrementAndGet();
                    if (res.resultado() == ResultadoPago.SIN_DISPONIBILIDAD) r.sinDisponibilidad.incrementAndGet();
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
        return r;
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
