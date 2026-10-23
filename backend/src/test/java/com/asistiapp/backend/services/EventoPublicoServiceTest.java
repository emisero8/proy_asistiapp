package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.entities.Tanda;
import com.asistiapp.backend.models.enums.EstadoEvento;
import com.asistiapp.backend.repositories.EventoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Un evento Publicado que ya pasó su fecha y hora no es parte del catálogo que ve el
 * Comprador — el catálogo no es un archivo histórico (encontrado probando el sistema:
 * eventos vencidos seguían listados y se podía entrar a comprarles, ver DECISIONES.md).
 */
@ExtendWith(MockitoExtension.class)
class EventoPublicoServiceTest {

    @Mock
    private EventoRepository eventoRepository;
    @Mock
    private ConfiguracionService configuracionService;

    private EventoPublicoService eventoPublicoService;

    @BeforeEach
    void setUp() {
        eventoPublicoService = new EventoPublicoService(eventoRepository, configuracionService);
    }

    private Evento evento(Long id, LocalDate fecha, LocalTime hora) {
        Evento e = new Evento();
        e.setId(id);
        e.setNombre("Evento " + id);
        e.setEstado(EstadoEvento.Publicado);
        e.setFechaEvento(fecha);
        e.setHoraEvento(hora);
        e.setUrlPublica("evento-" + id);
        e.setTandas(List.of());
        return e;
    }

    @Test
    void listarPublicados_eventoFuturo_seIncluye() {
        Evento futuro = evento(1L, LocalDate.now().plusDays(10), LocalTime.of(21, 0));
        when(eventoRepository.findByEstado(EstadoEvento.Publicado)).thenReturn(List.of(futuro));

        assertThat(eventoPublicoService.listarPublicados()).hasSize(1);
    }

    @Test
    void listarPublicados_eventoYaPasado_seExcluye() {
        Evento pasado = evento(2L, LocalDate.now().minusDays(1), LocalTime.of(21, 0));
        when(eventoRepository.findByEstado(EstadoEvento.Publicado)).thenReturn(List.of(pasado));

        assertThat(eventoPublicoService.listarPublicados()).isEmpty();
    }

    @Test
    void listarPublicados_eventoHoyPeroHoraYaPaso_seExcluye() {
        Evento hoyTemprano = evento(3L, LocalDate.now(), LocalTime.MIDNIGHT);
        when(eventoRepository.findByEstado(EstadoEvento.Publicado)).thenReturn(List.of(hoyTemprano));

        assertThat(eventoPublicoService.listarPublicados()).isEmpty();
    }

    @Test
    void obtenerPorUrlPublica_eventoYaPasado_igual_seDevuelve() {
        // A propósito: la pantalla de detalle SÍ muestra un evento vencido (para no ocultar
        // la info a quien entra con el link directo) — lo único que se bloquea es comprar
        // (VentaService.validarTandaDisponible). Acá solo confirmamos que no 404.
        Evento pasado = evento(4L, LocalDate.now().minusDays(5), LocalTime.of(21, 0));
        pasado.setTandas(List.of());
        when(eventoRepository.findByUrlPublica("evento-4")).thenReturn(Optional.of(pasado));
        lenient().when(configuracionService.obtenerEntero(any(), anyInt())).thenReturn(6);

        var resultado = eventoPublicoService.obtenerPorUrlPublica("evento-4");

        assertThat(resultado.getNombre()).isEqualTo("Evento 4");
    }

    @Test
    void obtenerPorUrlPublica_eventoCancelado_lanzaResourceNotFoundException() {
        Evento cancelado = evento(5L, LocalDate.now().plusDays(10), LocalTime.of(21, 0));
        cancelado.setEstado(EstadoEvento.Cancelado);
        when(eventoRepository.findByUrlPublica("evento-5")).thenReturn(Optional.of(cancelado));

        assertThatThrownBy(() -> eventoPublicoService.obtenerPorUrlPublica("evento-5"))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
