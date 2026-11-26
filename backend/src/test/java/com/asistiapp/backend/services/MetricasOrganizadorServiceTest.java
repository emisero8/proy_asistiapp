package com.asistiapp.backend.services;

import com.asistiapp.backend.models.dtos.metricas.EventoMetricasResponseDTO;
import com.asistiapp.backend.models.dtos.metricas.ResumenOrganizadorResponseDTO;
import com.asistiapp.backend.models.enums.TipoEmision;
import com.asistiapp.backend.models.entities.Entrada;
import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.entities.MovimientoCredito;
import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.models.entities.Tanda;
import com.asistiapp.backend.models.enums.EstadoEntrada;
import com.asistiapp.backend.models.enums.EstadoEvento;
import com.asistiapp.backend.models.enums.TipoMovimiento;
import com.asistiapp.backend.repositories.EntradaRepository;
import com.asistiapp.backend.repositories.EventoRepository;
import com.asistiapp.backend.repositories.MovimientoCreditoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MetricasOrganizadorServiceTest {

    private static final Long ID_ORG = 10L;

    @Mock
    private EventoRepository eventoRepository;
    @Mock
    private EntradaRepository entradaRepository;
    @Mock
    private MovimientoCreditoRepository movimientoCreditoRepository;
    @InjectMocks
    private MetricasOrganizadorService metricasService;

    private Organizador organizador;

    @BeforeEach
    void setUp() {
        organizador = new Organizador();
        organizador.setId(ID_ORG);
        organizador.setSaldoCreditos(7);
    }

    private Evento evento(Long id, EstadoEvento estado, LocalDate fecha, int cupoMaximo, int cupoDisponible, double precio) {
        Evento e = new Evento();
        e.setId(id);
        e.setNombre("Evento " + id);
        e.setIdOrganizador(ID_ORG);
        e.setEstado(estado);
        e.setFechaEvento(fecha);
        Tanda t = new Tanda();
        t.setId(id * 100);
        t.setNombre("General");
        t.setPrecio(precio);
        t.setCupoMaximo(cupoMaximo);
        t.setCupoDisponible(cupoDisponible);
        t.setEvento(e);
        e.getTandas().add(t);
        return e;
    }

    private MovimientoCredito movimiento(TipoMovimiento tipo, int monto) {
        MovimientoCredito m = new MovimientoCredito();
        m.setTipoMovimiento(tipo);
        m.setMonto(monto);
        return m;
    }

    @Test
    void resumen_sumaSoloEventosPublicadosYContaLosBorradores() {
        Evento publicado = evento(1L, EstadoEvento.Publicado, LocalDate.now().plusDays(10), 100, 70, 1000); // 30 vendidas
        Evento borrador = evento(2L, EstadoEvento.Borrador, LocalDate.now().plusDays(20), 50, 50, 500);
        when(eventoRepository.findByIdOrganizador(ID_ORG)).thenReturn(List.of(publicado, borrador));
        when(eventoRepository.findById(1L)).thenReturn(Optional.of(publicado));
        when(entradaRepository.findByEventoId(1L)).thenReturn(entradasDe(publicado.getTandas().get(0), 30));
        when(movimientoCreditoRepository.findByIdOrganizadorOrderByFechaMovimientoDesc(ID_ORG)).thenReturn(List.of());

        ResumenOrganizadorResponseDTO r = metricasService.obtenerResumen(organizador);

        assertThat(r.getEventosPublicados()).isEqualTo(1);
        assertThat(r.getEventosBorrador()).isEqualTo(1);
        assertThat(r.getEntradasVendidas()).isEqualTo(30);
        assertThat(r.getIngresosTotales()).isEqualTo(30_000.0);
        assertThat(r.getSaldoCreditos()).isEqualTo(7);
    }

    private Entrada entradaDe(Tanda tanda, TipoEmision tipo) {
        Entrada e = new Entrada();
        e.setTanda(tanda);
        e.setTipoEmision(tipo);
        return e;
    }

    private List<Entrada> entradasDe(Tanda tanda, int cantidad) {
        return java.util.stream.IntStream.range(0, cantidad).mapToObj(i -> entradaDe(tanda, null)).toList();
    }

    @Test
    void metricas_cambiarElPrecioDeLaTandaNoCambiaLoYaVendido() {
        Evento publicado = evento(1L, EstadoEvento.Publicado, LocalDate.now().plusDays(10), 100, 98, 1000);
        Tanda tanda = publicado.getTandas().get(0);
        Entrada alPrecioViejo = entradaDe(tanda, null);
        alPrecioViejo.setPrecioVenta(1000.0);
        Entrada alPrecioNuevo = entradaDe(tanda, null);
        alPrecioNuevo.setPrecioVenta(1500.0);
        tanda.setPrecio(1500.0);
        when(eventoRepository.findById(1L)).thenReturn(Optional.of(publicado));
        when(entradaRepository.findByEventoId(1L)).thenReturn(List.of(alPrecioViejo, alPrecioNuevo));

        assertThat(metricasService.obtenerMetricas(1L, ID_ORG).getIngresosTotales()).isEqualTo(2500.0);
    }

    @Test
    void metricas_lasCortesiasOcupanCupoPeroNoSumanIngresos() {
        // 30 entradas salieron de la tanda ($1000 c/u): 4 son cortesías del Organizador, que no cobró.
        Evento publicado = evento(1L, EstadoEvento.Publicado, LocalDate.now().plusDays(10), 100, 70, 1000);
        Tanda tanda = publicado.getTandas().get(0);
        when(eventoRepository.findById(1L)).thenReturn(Optional.of(publicado));
        java.util.List<Entrada> salieron = new java.util.ArrayList<>(entradasDe(tanda, 26));
        for (int i = 0; i < 4; i++) {
            salieron.add(entradaDe(tanda, TipoEmision.Cortesia));
        }
        when(entradaRepository.findByEventoId(1L)).thenReturn(salieron);

        EventoMetricasResponseDTO m = metricasService.obtenerMetricas(1L, ID_ORG);

        assertThat(m.getIngresosTotales()).isEqualTo(26_000.0); // (30 - 4) x 1000
        assertThat(m.getTandas().get(0).getIngresos()).isEqualTo(26_000.0);
        assertThat(m.getTandas().get(0).getVendidas()).isEqualTo(30); // las cortesías sí ocupan cupo
        assertThat(m.getEntradasVendidas()).isEqualTo(30);
    }

    @Test
    void metricas_lasAnuladasNoSonVentasNiSumanIngresosPeroSiguenOcupandoCupo() {
        // 8.6: 30 entradas salieron de la tanda ($1000 c/u); 3 se anularon. El lugar no se libera, pero ya no es una venta.
        Evento publicado = evento(1L, EstadoEvento.Publicado, LocalDate.now().plusDays(10), 100, 70, 1000);
        Tanda tanda = publicado.getTandas().get(0);
        Entrada anulada1 = entradaDe(tanda, null);
        anulada1.setEstado(EstadoEntrada.Anulada);
        Entrada anulada2 = entradaDe(tanda, null);
        anulada2.setEstado(EstadoEntrada.Anulada);
        Entrada anulada3 = entradaDe(tanda, null);
        anulada3.setEstado(EstadoEntrada.Anulada);
        java.util.List<Entrada> salieron = new java.util.ArrayList<>(entradasDe(tanda, 27));
        salieron.forEach(e -> e.setEstado(EstadoEntrada.Pagada));
        salieron.addAll(List.of(anulada1, anulada2, anulada3));
        when(eventoRepository.findById(1L)).thenReturn(Optional.of(publicado));
        when(entradaRepository.findByEventoId(1L)).thenReturn(salieron);

        EventoMetricasResponseDTO m = metricasService.obtenerMetricas(1L, ID_ORG);

        assertThat(m.getEntradasVendidas()).isEqualTo(27);
        assertThat(m.getTandas().get(0).getVendidas()).isEqualTo(27); // 30 - 3 anuladas
        assertThat(m.getIngresosTotales()).isEqualTo(27_000.0);
        assertThat(m.getCupoDisponible()).isEqualTo(70);
    }

    @Test
    void metricas_elPagoExternoSiSumaIngresos() {
        // Cobrado por fuera de la plataforma, pero cobrado: es plata del Organizador.
        Evento publicado = evento(1L, EstadoEvento.Publicado, LocalDate.now().plusDays(10), 100, 70, 1000);
        Tanda tanda = publicado.getTandas().get(0);
        when(eventoRepository.findById(1L)).thenReturn(Optional.of(publicado));
        java.util.List<Entrada> salieron = new java.util.ArrayList<>(entradasDe(tanda, 29));
        salieron.add(entradaDe(tanda, TipoEmision.Pago_Externo));
        when(entradaRepository.findByEventoId(1L)).thenReturn(salieron);

        assertThat(metricasService.obtenerMetricas(1L, ID_ORG).getIngresosTotales()).isEqualTo(30_000.0);
    }

    @Test
    void resumen_creditosConsumidosEsNetoPublicarYTandasMenosDevoluciones() {
        when(eventoRepository.findByIdOrganizador(ID_ORG)).thenReturn(List.of());
        when(movimientoCreditoRepository.findByIdOrganizadorOrderByFechaMovimientoDesc(ID_ORG)).thenReturn(List.of(
                movimiento(TipoMovimiento.Devolucion_Tanda, 1),   // devuelve 1
                movimiento(TipoMovimiento.Consumo_Tanda, -3),     // consume 3
                movimiento(TipoMovimiento.Consumo_Publicacion, -2), // consume 2
                movimiento(TipoMovimiento.Recarga, 30)            // no cuenta como consumo
        ));

        ResumenOrganizadorResponseDTO r = metricasService.obtenerResumen(organizador);

        assertThat(r.getCreditosConsumidos()).isEqualTo(4);
    }

    @Test
    void resumen_proximoEventoEsElPublicadoMasCercanoQueTodaviaNoEmpezo() {
        Evento pasado = evento(1L, EstadoEvento.Publicado, LocalDate.now().minusDays(5), 10, 10, 100);
        Evento lejano = evento(2L, EstadoEvento.Publicado, LocalDate.now().plusDays(30), 10, 10, 100);
        Evento cercano = evento(3L, EstadoEvento.Publicado, LocalDate.now().plusDays(3), 10, 10, 100);
        when(eventoRepository.findByIdOrganizador(ID_ORG)).thenReturn(List.of(pasado, lejano, cercano));
        when(eventoRepository.findById(anyLong())).thenAnswer(inv -> {
            Long id = inv.getArgument(0);
            return Optional.of(id == 1L ? pasado : id == 2L ? lejano : cercano);
        });
        when(entradaRepository.findByEventoId(anyLong())).thenReturn(List.of());
        when(movimientoCreditoRepository.findByIdOrganizadorOrderByFechaMovimientoDesc(ID_ORG)).thenReturn(List.of());

        ResumenOrganizadorResponseDTO r = metricasService.obtenerResumen(organizador);

        assertThat(r.getProximoEvento()).isNotNull();
        assertThat(r.getProximoEvento().getId()).isEqualTo(3L);
    }

    @Test
    void resumen_proximoEventoNoIncluyeUnoDeHoyQueYaEmpezo() {
        Evento deHoy = evento(1L, EstadoEvento.Publicado, LocalDate.now(), 10, 10, 100);
        deHoy.setHoraEvento(LocalTime.MIN);
        when(eventoRepository.findByIdOrganizador(ID_ORG)).thenReturn(List.of(deHoy));
        when(eventoRepository.findById(1L)).thenReturn(Optional.of(deHoy));
        when(entradaRepository.findByEventoId(1L)).thenReturn(List.of());
        when(movimientoCreditoRepository.findByIdOrganizadorOrderByFechaMovimientoDesc(ID_ORG)).thenReturn(List.of());

        assertThat(metricasService.obtenerResumen(organizador).getProximoEvento()).isNull();
    }

    @Test
    void resumen_sinEventos_devuelveCeros() {
        when(eventoRepository.findByIdOrganizador(ID_ORG)).thenReturn(List.of());
        when(movimientoCreditoRepository.findByIdOrganizadorOrderByFechaMovimientoDesc(ID_ORG)).thenReturn(List.of());

        ResumenOrganizadorResponseDTO r = metricasService.obtenerResumen(organizador);

        assertThat(r.getEventosPublicados()).isZero();
        assertThat(r.getProximoEvento()).isNull();
    }
}
