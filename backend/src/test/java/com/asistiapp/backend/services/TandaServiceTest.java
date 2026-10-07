package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.models.dtos.tanda.TandaRequestDTO;
import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.models.entities.Tanda;
import com.asistiapp.backend.models.enums.EstadoEvento;
import com.asistiapp.backend.repositories.EventoRepository;
import com.asistiapp.backend.repositories.OrganizadorRepository;
import com.asistiapp.backend.repositories.TandaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Créditos y tandas (Fase 18.7): cada entrada de una tanda consume 1 crédito.
 * Crear descuenta el cupo; subir el cupo cobra la diferencia; bajarlo o eliminar
 * la tanda devuelve créditos. Nunca se puede superar el saldo disponible.
 */
@ExtendWith(MockitoExtension.class)
class TandaServiceTest {

    private static final Long ID_ORG = 10L;
    private static final Long ID_EVENTO = 20L;
    private static final Long ID_TANDA = 30L;

    @Mock
    private TandaRepository tandaRepository;
    @Mock
    private EventoRepository eventoRepository;
    @Mock
    private OrganizadorRepository organizadorRepository;
    @Mock
    private CreditoLedgerService creditoLedgerService;
    @Mock
    private CreditoService creditoService;
    @InjectMocks
    private TandaService tandaService;

    private Organizador organizador;
    private Evento evento;

    @BeforeEach
    void setUp() {
        organizador = new Organizador();
        organizador.setId(ID_ORG);
        organizador.setSaldoCreditos(10);

        evento = new Evento();
        evento.setId(ID_EVENTO);
        evento.setIdOrganizador(ID_ORG);
        evento.setEstado(EstadoEvento.Borrador);
        evento.setFechaEvento(LocalDate.now().plusMonths(2));
        evento.setHoraEvento(LocalTime.of(21, 0));

        // Regla real de CreditoService: saldo menos 1 crédito reservado para publicar
        lenient().when(creditoService.creditosDisponiblesParaEntradas(any(Organizador.class)))
                .thenAnswer(inv -> Math.max(0, ((Organizador) inv.getArgument(0)).getSaldoCreditos() - 1));
    }

    private TandaRequestDTO dto(int cupo) {
        TandaRequestDTO dto = new TandaRequestDTO();
        dto.setNombre("General");
        dto.setPrecio(1000.0);
        dto.setCupoMaximo(cupo);
        return dto;
    }

    private Tanda tandaExistente(int cupoMaximo, int cupoDisponible) {
        Tanda tanda = new Tanda();
        tanda.setId(ID_TANDA);
        tanda.setEvento(evento);
        tanda.setNombre("General");
        tanda.setPrecio(1000.0);
        tanda.setCupoMaximo(cupoMaximo);
        tanda.setCupoDisponible(cupoDisponible);
        return tanda;
    }

    private void stubOrganizadorYEvento() {
        when(eventoRepository.findById(ID_EVENTO)).thenReturn(Optional.of(evento));
        when(organizadorRepository.findById(ID_ORG)).thenReturn(Optional.of(organizador));
    }

    // ── Crear ───────────────────────────────────────────────

    @Test
    void crearTanda_conSaldoSuficiente_consumeUnCreditoPorEntrada() {
        stubOrganizadorYEvento();
        when(tandaRepository.save(any(Tanda.class))).thenAnswer(inv -> inv.getArgument(0));

        tandaService.crearTanda(ID_EVENTO, dto(4), ID_ORG);

        verify(creditoLedgerService).registrarConsumoTanda(organizador, 4, ID_EVENTO);
    }

    @Test
    void crearTanda_conMasEntradasQueCreditos_lanzaBusinessRuleExceptionYNoGuarda() {
        stubOrganizadorYEvento();

        assertThatThrownBy(() -> tandaService.crearTanda(ID_EVENTO, dto(11), ID_ORG))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("No tenés créditos suficientes para 11 entradas");
        verify(tandaRepository, never()).save(any());
        verifyNoInteractions(creditoLedgerService);
    }

    // ── Actualizar cupo ─────────────────────────────────────

    @Test
    void actualizarTanda_subeElCupo_consumeLaDiferencia() {
        stubOrganizadorYEvento();
        when(tandaRepository.findById(ID_TANDA)).thenReturn(Optional.of(tandaExistente(4, 4)));
        when(tandaRepository.save(any(Tanda.class))).thenAnswer(inv -> inv.getArgument(0));

        tandaService.actualizarTanda(ID_EVENTO, ID_TANDA, dto(7), ID_ORG);

        verify(creditoLedgerService).registrarConsumoTanda(organizador, 3, ID_EVENTO);
        verify(creditoLedgerService, never()).registrarDevolucionTanda(any(), anyInt(), any());
    }

    @Test
    void actualizarTanda_subeElCupoMasAllaDelSaldo_lanzaBusinessRuleExceptionYNoCobra() {
        stubOrganizadorYEvento();
        when(tandaRepository.findById(ID_TANDA)).thenReturn(Optional.of(tandaExistente(4, 4)));

        assertThatThrownBy(() -> tandaService.actualizarTanda(ID_EVENTO, ID_TANDA, dto(15), ID_ORG))
                .isInstanceOf(BusinessRuleException.class);
        verify(creditoLedgerService, never()).registrarConsumoTanda(any(), anyInt(), any());
        verify(tandaRepository, never()).save(any());
    }

    @Test
    void actualizarTanda_bajaElCupo_devuelveLaDiferencia() {
        stubOrganizadorYEvento();
        when(tandaRepository.findById(ID_TANDA)).thenReturn(Optional.of(tandaExistente(8, 8)));
        when(tandaRepository.save(any(Tanda.class))).thenAnswer(inv -> inv.getArgument(0));

        tandaService.actualizarTanda(ID_EVENTO, ID_TANDA, dto(5), ID_ORG);

        verify(creditoLedgerService).registrarDevolucionTanda(organizador, 3, ID_EVENTO);
        verify(creditoLedgerService, never()).registrarConsumoTanda(any(), anyInt(), any());
    }

    // ── Eliminar ────────────────────────────────────────────

    @Test
    void eliminarTanda_sinVentas_devuelveTodosSusCreditos() {
        stubOrganizadorYEvento();
        when(tandaRepository.findById(ID_TANDA)).thenReturn(Optional.of(tandaExistente(6, 6)));

        tandaService.eliminarTanda(ID_EVENTO, ID_TANDA, ID_ORG);

        verify(creditoLedgerService).registrarDevolucionTanda(organizador, 6, ID_EVENTO);
        verify(tandaRepository).delete(any(Tanda.class));
    }

    @Test
    void eliminarTanda_conVentas_lanzaBusinessRuleExceptionYNoDevuelveCreditos() {
        when(eventoRepository.findById(ID_EVENTO)).thenReturn(Optional.of(evento));
        when(tandaRepository.findById(ID_TANDA)).thenReturn(Optional.of(tandaExistente(6, 4)));

        assertThatThrownBy(() -> tandaService.eliminarTanda(ID_EVENTO, ID_TANDA, ID_ORG))
                .isInstanceOf(BusinessRuleException.class);
        verifyNoInteractions(creditoLedgerService);
        verify(tandaRepository, never()).delete(any(Tanda.class));
    }
}
