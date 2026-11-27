package com.asistiapp.backend.services;

import com.asistiapp.backend.models.dtos.validacion.ValidacionQRRequestDTO;
import com.asistiapp.backend.models.dtos.validacion.ValidacionQRResponseDTO;
import com.asistiapp.backend.models.entities.Entrada;
import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.entities.StaffQR;
import com.asistiapp.backend.models.entities.Tanda;
import com.asistiapp.backend.models.enums.CanalVenta;
import com.asistiapp.backend.models.enums.EstadoEntrada;
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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * "Cada entrada sirve una sola vez" (CU-018), con concurrencia REAL contra H2: varios dispositivos
 * validan el mismo QR en el mismo instante y solo uno puede dejar entrar. Se repite con varias
 * entradas porque la coincidencia depende de cómo se intercalen los hilos.
 */
@SpringBootTest
@ActiveProfiles("test")
class StaffQRConcurrencyTest {

    private static final int ENTRADAS = 20;
    private static final int PUERTAS = 8;

    @Autowired
    private StaffQRService staffQRService;
    @Autowired
    private EventoRepository eventoRepository;
    @Autowired
    private TandaRepository tandaRepository;
    @Autowired
    private EntradaRepository entradaRepository;

    @Test
    void validarQR_elMismoCodigoEnVariasPuertasALaVez_dejaEntrarUnaSolaVez() throws Exception {
        Tanda tanda = crearTanda();
        ExecutorService pool = Executors.newFixedThreadPool(PUERTAS);
        List<Integer> aceptadasPorEntrada = new ArrayList<>();
        try {
            for (int i = 0; i < ENTRADAS; i++) {
                Entrada entrada = crearEntrada(tanda);
                List<ValidacionQRResponseDTO> respuestas = validarALaVez(pool, entrada.getCodigoQr(),
                        tanda.getEvento().getId());

                List<ValidacionQRResponseDTO> aceptadas = respuestas.stream()
                        .filter(ValidacionQRResponseDTO::isValido).toList();
                aceptadasPorEntrada.add(aceptadas.size());

                // Las rechazadas dicen por qué, como cuando el segundo escaneo llega más tarde.
                assertThat(respuestas).filteredOn(r -> !r.isValido()).allSatisfy(r -> {
                    assertThat(r.getMensaje()).contains("YA UTILIZADA");
                    assertThat(r.getEstadoAnterior()).isEqualTo(EstadoEntrada.Usada);
                    assertThat(r.getFechaUso()).isNotNull();
                });
                assertThat(entradaRepository.findById(entrada.getId()).orElseThrow().getEstado())
                        .isEqualTo(EstadoEntrada.Usada);
            }
        } finally {
            pool.shutdownNow();
        }

        assertThat(aceptadasPorEntrada).as("ingresos aceptados por cada entrada").containsOnly(1);
    }

    private List<ValidacionQRResponseDTO> validarALaVez(ExecutorService pool, String codigoQr, Long idEvento)
            throws Exception {
        CountDownLatch lineaDeLargada = new CountDownLatch(1);
        List<Future<ValidacionQRResponseDTO>> pedidos = new ArrayList<>();
        for (int puerta = 0; puerta < PUERTAS; puerta++) {
            StaffQR staff = new StaffQR();
            staff.setId(1000L + puerta);
            staff.setIdEvento(idEvento);
            pedidos.add(pool.submit(() -> {
                lineaDeLargada.await();
                ValidacionQRRequestDTO dto = new ValidacionQRRequestDTO();
                dto.setCodigoQr(codigoQr);
                return staffQRService.validarQR(dto, staff);
            }));
        }
        lineaDeLargada.countDown();

        List<ValidacionQRResponseDTO> respuestas = new ArrayList<>();
        for (Future<ValidacionQRResponseDTO> pedido : pedidos) {
            respuestas.add(pedido.get(30, TimeUnit.SECONDS));
        }
        return respuestas;
    }

    private Tanda crearTanda() {
        Evento evento = new Evento();
        evento.setIdOrganizador(1L);
        evento.setNombre("Evento de puertas " + System.nanoTime());
        evento.setFechaEvento(LocalDate.now().plusDays(30));
        evento.setHoraEvento(LocalTime.of(21, 0));
        evento.setLugar("Lugar de prueba");
        evento.setEstado(EstadoEvento.Publicado);

        Tanda tanda = new Tanda();
        tanda.setEvento(eventoRepository.save(evento));
        tanda.setNombre("General");
        tanda.setPrecio(1000.0);
        tanda.setCupoMaximo(ENTRADAS);
        tanda.setCupoDisponible(ENTRADAS);
        return tandaRepository.save(tanda);
    }

    private Entrada crearEntrada(Tanda tanda) {
        Entrada entrada = new Entrada();
        entrada.setTanda(tanda);
        entrada.setCodigoQr("QR-" + UUID.randomUUID().toString().replace("-", "").toUpperCase());
        entrada.setNombreComprador("Comprador");
        entrada.setEmailComprador("comprador@test.com");
        entrada.setCanalVenta(CanalVenta.Online);
        return entradaRepository.save(entrada);
    }
}
