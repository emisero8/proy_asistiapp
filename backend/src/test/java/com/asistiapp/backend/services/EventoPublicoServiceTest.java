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
 * eventos vencidos seguían listados y se podía entrar a comprarles, ver docs/proyecto/DECISIONES.md).
 */
@ExtendWith(MockitoExtension.class)
class EventoPublicoServiceTest {

    @Mock
    private EventoRepository eventoRepository;
    @Mock
    private LimiteCompradorService limiteCompradorService;

    private EventoPublicoService eventoPublicoService;

    @BeforeEach
    void setUp() {
        eventoPublicoService = new EventoPublicoService(eventoRepository, limiteCompradorService);
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
        lenient().when(limiteCompradorService.limiteParaOrganizador(any())).thenReturn(6);

        var resultado = eventoPublicoService.obtenerPorUrlPublica("evento-4");

        assertThat(resultado.getNombre()).isEqualTo("Evento 4");
    }

    @Test
    void obtenerPorUrlPublica_informaElTopeDeEntradasDelOrganizadorDelEvento() {
        // 8.9: la pantalla de compra no deja elegir más de lo que el Organizador permite.
        Evento ev = evento(6L, LocalDate.now().plusDays(10), LocalTime.of(21, 0));
        ev.setIdOrganizador(55L);
        ev.setTandas(List.of());
        when(eventoRepository.findByUrlPublica("evento-6")).thenReturn(Optional.of(ev));
        when(limiteCompradorService.limiteParaOrganizador(55L)).thenReturn(3);

        assertThat(eventoPublicoService.obtenerPorUrlPublica("evento-6").getMaxEntradasPorCompra()).isEqualTo(3);
    }

    private com.asistiapp.backend.models.entities.Tanda tanda(Long id, String nombre, double precio, boolean soloEmision) {
        var t = new com.asistiapp.backend.models.entities.Tanda();
        t.setId(id);
        t.setNombre(nombre);
        t.setPrecio(precio);
        t.setCupoMaximo(10);
        t.setCupoDisponible(10);
        t.setSoloEmision(soloEmision);
        return t;
    }

    @Test
    void obtenerPorUrlPublica_noMuestraLasTandasDeSoloEmision() {
        Evento ev = evento(7L, LocalDate.now().plusDays(10), LocalTime.of(21, 0));
        ev.setTandas(List.of(tanda(1L, "General", 1500, false), tanda(2L, "Prensa", 0, true)));
        when(eventoRepository.findByUrlPublica("evento-7")).thenReturn(Optional.of(ev));

        var detalle = eventoPublicoService.obtenerPorUrlPublica("evento-7");

        assertThat(detalle.getTandas()).extracting(t -> t.getNombre()).containsExactly("General");
    }

    @Test
    void listarPublicados_elPrecioDesdeIgnoraLasTandasDeSoloEmision() {
        Evento ev = evento(8L, LocalDate.now().plusDays(10), LocalTime.of(21, 0));
        ev.setTandas(List.of(tanda(1L, "General", 1500, false), tanda(2L, "Prensa", 0, true)));
        when(eventoRepository.findByEstado(EstadoEvento.Publicado)).thenReturn(List.of(ev));

        assertThat(eventoPublicoService.listarPublicados().get(0).getPrecioDesde()).isEqualTo(1500.0);
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
