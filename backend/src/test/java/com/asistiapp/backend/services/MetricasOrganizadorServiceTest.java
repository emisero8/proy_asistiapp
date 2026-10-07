package com.asistiapp.backend.services;

import com.asistiapp.backend.models.dtos.metricas.ResumenOrganizadorResponseDTO;
import com.asistiapp.backend.models.entities.Entrada;
import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.entities.MovimientoCredito;
import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.models.entities.Tanda;
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
        when(entradaRepository.findByEventoId(1L)).thenReturn(List.of(new Entrada(), new Entrada()));
        when(movimientoCreditoRepository.findByIdOrganizadorOrderByFechaMovimientoDesc(ID_ORG)).thenReturn(List.of());

        ResumenOrganizadorResponseDTO r = metricasService.obtenerResumen(organizador);

        assertThat(r.getEventosPublicados()).isEqualTo(1);
        assertThat(r.getEventosBorrador()).isEqualTo(1);
        assertThat(r.getEntradasVendidas()).isEqualTo(2);
        assertThat(r.getIngresosTotales()).isEqualTo(30_000.0);
        assertThat(r.getSaldoCreditos()).isEqualTo(7);
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
    void resumen_sinEventos_devuelveCeros() {
        when(eventoRepository.findByIdOrganizador(ID_ORG)).thenReturn(List.of());
        when(movimientoCreditoRepository.findByIdOrganizadorOrderByFechaMovimientoDesc(ID_ORG)).thenReturn(List.of());

        ResumenOrganizadorResponseDTO r = metricasService.obtenerResumen(organizador);

        assertThat(r.getEventosPublicados()).isZero();
        assertThat(r.getProximoEvento()).isNull();
    }
}
