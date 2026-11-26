package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.ForbiddenActionException;
import com.asistiapp.backend.models.dtos.entrada.EntradaResponseDTO;
import com.asistiapp.backend.models.entities.Entrada;
import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.models.entities.Tanda;
import com.asistiapp.backend.models.entities.TransaccionPago;
import com.asistiapp.backend.models.enums.EstadoEntrada;
import com.asistiapp.backend.models.enums.EstadoEvento;
import com.asistiapp.backend.repositories.EntradaRepository;
import com.asistiapp.backend.repositories.EventoRepository;
import com.asistiapp.backend.repositories.OrganizadorRepository;
import com.asistiapp.backend.repositories.TransaccionPagoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** Los pasos con base de datos de anular y reembolsar entradas (8.6). */
@ExtendWith(MockitoExtension.class)
class AnulacionEntradaServiceTest {

    private static final Long ORG = 7L;
    private static final Long ID_ENTRADA = 50L;

    @Mock
    private EntradaRepository entradaRepository;
    @Mock
    private EventoRepository eventoRepository;
    @Mock
    private TransaccionPagoRepository transaccionPagoRepository;
    @Mock
    private OrganizadorRepository organizadorRepository;
    @Mock
    private CreditoLedgerService creditoLedgerService;
    @Mock
    private VentaService ventaService;
    @InjectMocks
    private AnulacionEntradaService service;

    private Evento evento;
    private Tanda tanda;
    private Entrada entrada;
    private Organizador organizador;

    @BeforeEach
    void setUp() {
        evento = new Evento();
        evento.setId(3L);
        evento.setIdOrganizador(ORG);
        evento.setNombre("Recital");
        evento.setEstado(EstadoEvento.Publicado);
        tanda = new Tanda();
        tanda.setId(9L);
        tanda.setEvento(evento);
        tanda.setPrecio(1500.0);
        entrada = new Entrada();
        entrada.setId(ID_ENTRADA);
        entrada.setTanda(tanda);
        entrada.setEstado(EstadoEntrada.Pagada);
        entrada.setNombreComprador("Juan");
        entrada.setEmailComprador("juan@mail.com");
        entrada.setIdTransaccionPago(11L);
        organizador = new Organizador();
        organizador.setId(ORG);
        lenient().when(entradaRepository.findById(ID_ENTRADA)).thenReturn(Optional.of(entrada));
        lenient().when(organizadorRepository.findById(ORG)).thenReturn(Optional.of(organizador));
        lenient().when(eventoRepository.findById(3L)).thenReturn(Optional.of(evento));
        lenient().when(ventaService.toResponseDTOParaOrganizador(any())).thenReturn(EntradaResponseDTO.builder().id(ID_ENTRADA).build());
    }

    private void ordenConPago(String paymentId) {
        TransaccionPago orden = new TransaccionPago();
        orden.setMercadopagoPaymentId(paymentId);
        when(transaccionPagoRepository.findById(11L)).thenReturn(Optional.of(orden));
    }

    // ── anular ──────────────────────────────────────────────

    @Test
    void anular_marcaLaEntradaAnuladaConSuMotivoYDevuelveElCredito() {
        var resultado = service.anular(ID_ENTRADA, ORG, "  pidió que la anulemos  ");

        assertThat(entrada.getEstado()).isEqualTo(EstadoEntrada.Anulada);
        assertThat(entrada.getFechaAnulacion()).isNotNull();
        assertThat(entrada.getMotivoAnulacion()).isEqualTo("pidió que la anulemos");
        assertThat(entrada.isCreditoDevuelto()).isTrue();
        verify(creditoLedgerService).registrarDevolucionTanda(organizador, 1, 3L);
        verify(entradaRepository).save(entrada);
        assertThat(resultado.datos().emailComprador()).isEqualTo("juan@mail.com");
    }

    @Test
    void anular_enUnEventoFinalizado_anulaPeroNoDevuelveElCredito() {
        evento.setFechaEvento(java.time.LocalDate.now().minusDays(2));
        evento.setHoraEvento(java.time.LocalTime.of(22, 0));

        service.anular(ID_ENTRADA, ORG, null);

        assertThat(entrada.getEstado()).isEqualTo(EstadoEntrada.Anulada);
        assertThat(entrada.isCreditoDevuelto()).isFalse();
        verifyNoInteractions(creditoLedgerService);
    }

    @Test
    void anular_sinMotivo_loDejaNull() {
        service.anular(ID_ENTRADA, ORG, "   ");

        assertThat(entrada.getMotivoAnulacion()).isNull();
    }

    @Test
    void anular_entradaDeOtroOrganizador_lanzaForbiddenActionExceptionYNoToca() {
        assertThatThrownBy(() -> service.anular(ID_ENTRADA, 99L, null)).isInstanceOf(ForbiddenActionException.class);

        assertThat(entrada.getEstado()).isEqualTo(EstadoEntrada.Pagada);
        verifyNoInteractions(creditoLedgerService);
    }

    @Test
    void anular_entradaYaUsada_lanzaBusinessRuleException() {
        entrada.setEstado(EstadoEntrada.Usada);

        assertThatThrownBy(() -> service.anular(ID_ENTRADA, ORG, null))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("ya se usó");
        verifyNoInteractions(creditoLedgerService);
    }

    @Test
    void anular_entradaYaAnulada_lanzaBusinessRuleExceptionYNoDevuelveOtroCredito() {
        entrada.setEstado(EstadoEntrada.Anulada);

        assertThatThrownBy(() -> service.anular(ID_ENTRADA, ORG, null))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("ya está anulada");
        verifyNoInteractions(creditoLedgerService);
    }

    // ── prepararReembolso ───────────────────────────────────

    @Test
    void prepararReembolso_deUnaEntradaAnuladaOnline_tomaElTurnoYDevuelveElPlan() {
        entrada.setEstado(EstadoEntrada.Anulada);
        ordenConPago("12345");
        when(entradaRepository.reservarReembolso(ID_ENTRADA)).thenReturn(1);

        var plan = service.prepararReembolso(ID_ENTRADA, ORG);

        assertThat(plan.paymentId()).isEqualTo(12345L);
        assertThat(plan.monto()).isEqualByComparingTo(BigDecimal.valueOf(1500));
    }

    @Test
    void prepararReembolso_devuelveElPrecioPagadoYNoElActualDeLaTanda() {
        entrada.setEstado(EstadoEntrada.Anulada);
        entrada.setPrecioVenta(1500.0);
        entrada.getTanda().setPrecio(9000.0);
        ordenConPago("12345");
        when(entradaRepository.reservarReembolso(ID_ENTRADA)).thenReturn(1);

        assertThat(service.prepararReembolso(ID_ENTRADA, ORG).monto()).isEqualByComparingTo("1500");
    }

    @Test
    void prepararReembolso_siElCompradorPagoCargoPorProcesamiento_tambienSeLoDevuelve() {
        // El Organizador le trasladó la comisión de Mercado Pago: la entrada costó $1500 + $123,57 de cargo.
        entrada.setEstado(EstadoEntrada.Anulada);
        TransaccionPago orden = new TransaccionPago();
        orden.setMercadopagoPaymentId("12345");
        orden.setCargoServicioUnitario(123.57);
        when(transaccionPagoRepository.findById(11L)).thenReturn(Optional.of(orden));
        when(entradaRepository.reservarReembolso(ID_ENTRADA)).thenReturn(1);

        var plan = service.prepararReembolso(ID_ENTRADA, ORG);

        assertThat(plan.monto()).isEqualByComparingTo("1623.57");
        // El mail al comprador informa lo que se le devuelve de verdad.
        assertThat(plan.entrada().precio()).isEqualTo(1623.57);
    }

    @Test
    void prepararReembolso_deUnaEntradaVigenteEnUnEventoActivo_pideAnularlaPrimero() {
        assertThatThrownBy(() -> service.prepararReembolso(ID_ENTRADA, ORG))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("Primero anulá");
        verify(entradaRepository, never()).reservarReembolso(any());
    }

    @Test
    void prepararReembolso_deUnaEntradaVigenteEnUnEventoCancelado_loPermite() {
        evento.setEstado(EstadoEvento.Cancelado);
        ordenConPago("12345");
        when(entradaRepository.reservarReembolso(ID_ENTRADA)).thenReturn(1);

        assertThat(service.prepararReembolso(ID_ENTRADA, ORG).paymentId()).isEqualTo(12345L);
    }

    @Test
    void prepararReembolso_deUnaEntradaQueNoSePagoPorMercadoPago_lanzaBusinessRuleException() {
        entrada.setEstado(EstadoEntrada.Anulada);
        entrada.setIdTransaccionPago(null); // venta manual o emitida por el Organizador

        assertThatThrownBy(() -> service.prepararReembolso(ID_ENTRADA, ORG))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("no se pagó por Mercado Pago");
    }

    @Test
    void prepararReembolso_deUnaCortesiaOGratis_lanzaBusinessRuleException() {
        entrada.setEstado(EstadoEntrada.Anulada);
        tanda.setPrecio(0.0);

        assertThatThrownBy(() -> service.prepararReembolso(ID_ENTRADA, ORG)).isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void prepararReembolso_siYaFueReembolsada_lanzaBusinessRuleException() {
        entrada.setEstado(EstadoEntrada.Anulada);
        entrada.setReembolsadaEn(LocalDateTime.now());

        assertThatThrownBy(() -> service.prepararReembolso(ID_ENTRADA, ORG))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("ya fue reembolsada");
    }

    @Test
    void prepararReembolso_siOtroPedidoYaTomoElTurno_lanzaBusinessRuleExceptionParaNoDevolverDosVeces() {
        entrada.setEstado(EstadoEntrada.Anulada);
        ordenConPago("12345");
        when(entradaRepository.reservarReembolso(ID_ENTRADA)).thenReturn(0);

        assertThatThrownBy(() -> service.prepararReembolso(ID_ENTRADA, ORG))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("en curso");
    }

    @Test
    void prepararReembolso_deOtroOrganizador_lanzaForbiddenActionException() {
        entrada.setEstado(EstadoEntrada.Anulada);

        assertThatThrownBy(() -> service.prepararReembolso(ID_ENTRADA, 99L)).isInstanceOf(ForbiddenActionException.class);
        verify(entradaRepository, never()).reservarReembolso(any());
    }

    @Test
    void prepararReembolso_sinPagoDeMercadoPagoEnLaOrden_lanzaBusinessRuleException() {
        entrada.setEstado(EstadoEntrada.Anulada);
        ordenConPago(null);

        assertThatThrownBy(() -> service.prepararReembolso(ID_ENTRADA, ORG))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("pago de Mercado Pago");
        verify(entradaRepository, never()).reservarReembolso(any());
    }

    // ── completarReembolso ──────────────────────────────────

    @Test
    void completarReembolso_deUnaEntradaAnulada_dejaConstanciaYDevuelveElCredito() {
        entrada.setEstado(EstadoEntrada.Anulada);
        entrada.setReembolsoEnCurso(true);

        service.completarReembolso(ID_ENTRADA, ORG);

        assertThat(entrada.getReembolsadaEn()).isNotNull();
        assertThat(entrada.isReembolsoEnCurso()).isFalse();
        verify(creditoLedgerService).registrarDevolucionTanda(organizador, 1, 3L);
    }

    @Test
    void completarReembolso_deUnaEntradaVigenteDeUnEventoCancelado_laAnulaYDevuelveElCredito() {
        service.completarReembolso(ID_ENTRADA, ORG);

        assertThat(entrada.getEstado()).isEqualTo(EstadoEntrada.Anulada);
        assertThat(entrada.getReembolsadaEn()).isNotNull();
        verify(creditoLedgerService).registrarDevolucionTanda(organizador, 1, 3L);
    }

    @Test
    void completarReembolso_siElCreditoYaSeDevolvioAlAnular_noLoDevuelveDeNuevo() {
        entrada.setEstado(EstadoEntrada.Anulada);
        entrada.setCreditoDevuelto(true);

        service.completarReembolso(ID_ENTRADA, ORG);

        verifyNoInteractions(creditoLedgerService);
    }

    @Test
    void completarReembolso_deUnaEntradaYaUsada_noLaAnulaNiDevuelveElCredito() {
        entrada.setEstado(EstadoEntrada.Usada);

        service.completarReembolso(ID_ENTRADA, ORG);

        assertThat(entrada.getEstado()).isEqualTo(EstadoEntrada.Usada);
        assertThat(entrada.getReembolsadaEn()).isNotNull();
        verifyNoInteractions(creditoLedgerService);
    }

    // ── pendientes y reembolso masivo ───────────────────────

    @Test
    void pendientesDeReembolso_devuelveLasDelRepositorio() {
        when(entradaRepository.findPendientesDeReembolso(3L)).thenReturn(List.of(entrada));

        assertThat(service.pendientesDeReembolso(3L, ORG)).hasSize(1);
    }

    @Test
    void pendientesDeReembolso_deUnEventoAjeno_lanzaForbiddenActionException() {
        assertThatThrownBy(() -> service.pendientesDeReembolso(3L, 99L)).isInstanceOf(ForbiddenActionException.class);
    }

    @Test
    void idsParaReembolsoMasivo_conElEventoActivo_lanzaBusinessRuleException() {
        assertThatThrownBy(() -> service.idsParaReembolsoMasivo(3L, ORG))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("evento cancelado");
    }

    @Test
    void idsParaReembolsoMasivo_conElEventoCancelado_devuelveLosIdsPendientes() {
        evento.setEstado(EstadoEvento.Cancelado);
        when(entradaRepository.findPendientesDeReembolso(3L)).thenReturn(List.of(entrada));

        assertThat(service.idsParaReembolsoMasivo(3L, ORG)).containsExactly(ID_ENTRADA);
    }

    @Test
    void liberarReembolso_sueltaElTurno() {
        service.liberarReembolso(ID_ENTRADA);

        verify(entradaRepository).liberarReembolso(eq(ID_ENTRADA));
    }
}
