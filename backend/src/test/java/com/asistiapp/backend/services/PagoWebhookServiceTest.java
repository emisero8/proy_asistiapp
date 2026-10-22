package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.PasarelaPagoException;
import com.mercadopago.resources.payment.Payment;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

/**
 * Orquestación del webhook: qué se hace con cada resultado de la confirmación.
 * La lógica de negocio de cada orden se prueba en VentaServiceTest / CreditoServiceTest.
 */
@ExtendWith(MockitoExtension.class)
class PagoWebhookServiceTest {

    private static final long PAYMENT_ID = 999L;
    private static final String REF = "ref-uuid";

    @Mock
    private MercadoPagoService mercadoPagoService;
    @Mock
    private VentaService ventaService;
    @Mock
    private CreditoService creditoService;
    @Mock
    private EmailService emailService;

    @InjectMocks
    private PagoWebhookService service;

    /** El Payment se arma ANTES de stubbear: Mockito no admite stubbear dentro del argumento de otro stub. */
    private void mpDevuelve(Payment pago) {
        when(mercadoPagoService.obtenerPago(PAYMENT_ID)).thenReturn(Optional.of(pago));
    }

    private Payment pago(String estado, String referencia) {
        Payment pago = mock(Payment.class);
        lenient().when(pago.getStatus()).thenReturn(estado);
        lenient().when(pago.getExternalReference()).thenReturn(referencia);
        return pago;
    }

    private Payment pagoAprobado() {
        Payment pago = pago("approved", REF);
        lenient().when(pago.getTransactionAmount()).thenReturn(BigDecimal.valueOf(3000));
        lenient().when(pago.getCurrencyId()).thenReturn("ARS");
        return pago;
    }

    private VentaService.ConfirmacionEntradas confirmacion(ResultadoPago resultado) {
        return new VentaService.ConfirmacionEntradas(resultado, List.of("QR-1", "QR-2"),
                "Juan", "juan@example.com", "Evento", "General");
    }

    @Test
    void pagoInexistenteEnMercadoPago_noHaceNada() {
        when(mercadoPagoService.obtenerPago(PAYMENT_ID)).thenReturn(Optional.empty());

        service.procesarNotificacionPago(PAYMENT_ID);

        verifyNoInteractions(ventaService, creditoService, emailService);
    }

    @Test
    void errorAlConsultarMercadoPago_sePropagaParaQueMercadoPagoReintente() {
        when(mercadoPagoService.obtenerPago(PAYMENT_ID)).thenThrow(new PasarelaPagoException("MP caído"));

        assertThatThrownBy(() -> service.procesarNotificacionPago(PAYMENT_ID))
                .isInstanceOf(PasarelaPagoException.class);
    }

    @Test
    void pagoSinExternalReference_seIgnora() {
        mpDevuelve(pago("approved", null));

        service.procesarNotificacionPago(PAYMENT_ID);

        verifyNoInteractions(ventaService, creditoService, emailService);
    }

    @Test
    void pagoPendienteORechazado_noEntregaNiReembolsaNada() {
        mpDevuelve(pago("pending", REF));
        service.procesarNotificacionPago(PAYMENT_ID);
        mpDevuelve(pago("rejected", REF));
        service.procesarNotificacionPago(PAYMENT_ID);

        verifyNoInteractions(ventaService, creditoService, emailService);
        verify(mercadoPagoService, never()).reembolsar(anyLong());
    }

    @Test
    void entradasConfirmadas_mandaUnSoloMailConTodosLosQr() {
        mpDevuelve(pagoAprobado());
        when(ventaService.existeOrdenEntradas(REF)).thenReturn(true);
        when(ventaService.confirmarPagoEntradas(eq(REF), eq(PAYMENT_ID), any(), eq("ARS")))
                .thenReturn(confirmacion(ResultadoPago.CONFIRMADA));

        service.procesarNotificacionPago(PAYMENT_ID);

        verify(emailService).enviarConfirmacionCompra("juan@example.com", "Juan", "Evento", "General", List.of("QR-1", "QR-2"));
        verify(mercadoPagoService, never()).reembolsar(anyLong());
    }

    @Test
    void notificacionRepetida_noMandaOtroMailNiReembolsa() {
        mpDevuelve(pagoAprobado());
        when(ventaService.existeOrdenEntradas(REF)).thenReturn(true);
        when(ventaService.confirmarPagoEntradas(eq(REF), eq(PAYMENT_ID), any(), eq("ARS")))
                .thenReturn(VentaService.ConfirmacionEntradas.sinEntradas(ResultadoPago.YA_PROCESADA));

        service.procesarNotificacionPago(PAYMENT_ID);

        verifyNoInteractions(emailService);
        verify(mercadoPagoService, never()).reembolsar(anyLong());
    }

    @Test
    void pagoSinDisponibilidad_reembolsaYMarcaLaOrdenYAvisaPorMail() {
        mpDevuelve(pagoAprobado());
        when(ventaService.existeOrdenEntradas(REF)).thenReturn(true);
        when(ventaService.confirmarPagoEntradas(eq(REF), eq(PAYMENT_ID), any(), eq("ARS")))
                .thenReturn(VentaService.ConfirmacionEntradas.sinEntradas(ResultadoPago.SIN_DISPONIBILIDAD));
        when(ventaService.marcarOrdenReembolsada(REF, PAYMENT_ID))
                .thenReturn(new VentaService.ReembolsoEntradas(true, "juan@example.com", "Juan", "Evento"));

        service.procesarNotificacionPago(PAYMENT_ID);

        verify(mercadoPagoService).reembolsar(PAYMENT_ID);
        verify(ventaService).marcarOrdenReembolsada(REF, PAYMENT_ID);
        verify(emailService).enviarNotificacionReembolsoEntradas("juan@example.com", "Juan", "Evento");
    }

    @Test
    void pagoSinDisponibilidad_laOrdenYaEstabaReembolsada_noReenviaElMail() {
        mpDevuelve(pagoAprobado());
        when(ventaService.existeOrdenEntradas(REF)).thenReturn(true);
        when(ventaService.confirmarPagoEntradas(eq(REF), eq(PAYMENT_ID), any(), eq("ARS")))
                .thenReturn(VentaService.ConfirmacionEntradas.sinEntradas(ResultadoPago.SIN_DISPONIBILIDAD));
        when(ventaService.marcarOrdenReembolsada(REF, PAYMENT_ID))
                .thenReturn(VentaService.ReembolsoEntradas.NO_HIZO_FALTA);

        service.procesarNotificacionPago(PAYMENT_ID);

        verifyNoInteractions(emailService);
    }

    @Test
    void siElReembolsoFalla_laOrdenNoSeMarcaYSePropagaElErrorParaReintentar() {
        mpDevuelve(pagoAprobado());
        when(ventaService.existeOrdenEntradas(REF)).thenReturn(true);
        when(ventaService.confirmarPagoEntradas(eq(REF), eq(PAYMENT_ID), any(), eq("ARS")))
                .thenReturn(VentaService.ConfirmacionEntradas.sinEntradas(ResultadoPago.SIN_DISPONIBILIDAD));
        org.mockito.Mockito.doThrow(new PasarelaPagoException("MP caído")).when(mercadoPagoService).reembolsar(PAYMENT_ID);

        assertThatThrownBy(() -> service.procesarNotificacionPago(PAYMENT_ID))
                .isInstanceOf(PasarelaPagoException.class);

        verify(ventaService, never()).marcarOrdenReembolsada(any(), anyLong());
    }

    @Test
    void pagoDuplicado_reembolsaPeroNoToqueLaOrdenYaResuelta() {
        mpDevuelve(pagoAprobado());
        when(ventaService.existeOrdenEntradas(REF)).thenReturn(true);
        when(ventaService.confirmarPagoEntradas(eq(REF), eq(PAYMENT_ID), any(), eq("ARS")))
                .thenReturn(VentaService.ConfirmacionEntradas.sinEntradas(ResultadoPago.DUPLICADO));

        service.procesarNotificacionPago(PAYMENT_ID);

        verify(mercadoPagoService).reembolsar(PAYMENT_ID);
        verify(ventaService, never()).marcarOrdenReembolsada(any(), anyLong());
    }

    @Test
    void montoInvalido_noEntregaNiReembolsa() {
        mpDevuelve(pagoAprobado());
        when(ventaService.existeOrdenEntradas(REF)).thenReturn(true);
        when(ventaService.confirmarPagoEntradas(eq(REF), eq(PAYMENT_ID), any(), eq("ARS")))
                .thenReturn(VentaService.ConfirmacionEntradas.sinEntradas(ResultadoPago.MONTO_INVALIDO));

        service.procesarNotificacionPago(PAYMENT_ID);

        verifyNoInteractions(emailService);
        verify(mercadoPagoService, never()).reembolsar(anyLong());
    }

    @Test
    void ordenDeCreditos_seAcreditaPorElMismoWebhook() {
        mpDevuelve(pagoAprobado());
        when(ventaService.existeOrdenEntradas(REF)).thenReturn(false);
        when(creditoService.existeOrdenCredito(REF)).thenReturn(true);
        when(creditoService.confirmarPagoCredito(eq(REF), eq(PAYMENT_ID), any(), eq("ARS")))
                .thenReturn(ResultadoPago.CONFIRMADA);

        service.procesarNotificacionPago(PAYMENT_ID);

        verify(creditoService).confirmarPagoCredito(eq(REF), eq(PAYMENT_ID), any(), eq("ARS"));
        verify(ventaService, never()).confirmarPagoEntradas(any(), anyLong(), any(), any());
        verifyNoInteractions(emailService);
    }

    @Test
    void creditosNoAcreditables_reembolsaYMarcaLaOrdenYAvisaPorMail() {
        mpDevuelve(pagoAprobado());
        when(ventaService.existeOrdenEntradas(REF)).thenReturn(false);
        when(creditoService.existeOrdenCredito(REF)).thenReturn(true);
        when(creditoService.confirmarPagoCredito(eq(REF), eq(PAYMENT_ID), any(), eq("ARS")))
                .thenReturn(ResultadoPago.SIN_DISPONIBILIDAD);
        when(creditoService.marcarOrdenReembolsada(REF, PAYMENT_ID))
                .thenReturn(new CreditoService.ReembolsoCreditos(true, "org@example.com", "Organizador", 10));

        service.procesarNotificacionPago(PAYMENT_ID);

        verify(mercadoPagoService).reembolsar(PAYMENT_ID);
        verify(creditoService).marcarOrdenReembolsada(REF, PAYMENT_ID);
        verify(emailService).enviarNotificacionReembolsoCreditos("org@example.com", "Organizador", 10);
    }

    @Test
    void referenciaDesconocida_seIgnora() {
        mpDevuelve(pagoAprobado());
        when(ventaService.existeOrdenEntradas(REF)).thenReturn(false);
        when(creditoService.existeOrdenCredito(REF)).thenReturn(false);

        service.procesarNotificacionPago(PAYMENT_ID);

        verify(ventaService, never()).confirmarPagoEntradas(any(), anyLong(), any(), any());
        verify(creditoService, never()).confirmarPagoCredito(any(), anyLong(), any(), any());
        verify(mercadoPagoService, never()).reembolsar(anyLong());
    }

    @Test
    void pagoReembolsadoDesdeMercadoPago_marcaLasOrdenesPendientesPeroNoLasEntregadas() {
        mpDevuelve(pago("refunded", REF));
        when(ventaService.marcarOrdenReembolsada(REF, PAYMENT_ID)).thenReturn(VentaService.ReembolsoEntradas.NO_HIZO_FALTA);
        when(creditoService.marcarOrdenReembolsada(REF, PAYMENT_ID)).thenReturn(CreditoService.ReembolsoCreditos.NO_HIZO_FALTA);

        service.procesarNotificacionPago(PAYMENT_ID);

        verify(ventaService).marcarOrdenReembolsada(REF, PAYMENT_ID);
        verify(creditoService).marcarOrdenReembolsada(REF, PAYMENT_ID);
    }

    @Test
    void pagoReembolsadoDesdeMercadoPago_siSeReembolsoRecienAhora_avisaPorMailAQuienCorresponda() {
        mpDevuelve(pago("refunded", REF));
        when(ventaService.marcarOrdenReembolsada(REF, PAYMENT_ID))
                .thenReturn(new VentaService.ReembolsoEntradas(true, "juan@example.com", "Juan", "Evento"));
        when(creditoService.marcarOrdenReembolsada(REF, PAYMENT_ID)).thenReturn(CreditoService.ReembolsoCreditos.NO_HIZO_FALTA);

        service.procesarNotificacionPago(PAYMENT_ID);

        verify(emailService).enviarNotificacionReembolsoEntradas("juan@example.com", "Juan", "Evento");
        verifyNoMoreInteractions(emailService);
    }

    // ─────────────────────────────────────────────
    // reconciliar — orden que sigue Pendiente, por si el webhook nunca llegó
    // ─────────────────────────────────────────────

    @Test
    void reconciliar_sinPagosEncontrados_noHaceNada() {
        when(mercadoPagoService.buscarPagosPorReferencia(REF)).thenReturn(List.of());

        service.reconciliar(REF);

        verifyNoInteractions(ventaService, creditoService, emailService);
    }

    @Test
    void reconciliar_pagoAprobadoEncontrado_loProcesaIgualQueElWebhook() {
        Payment pago = pagoAprobado();
        lenient().when(pago.getId()).thenReturn(PAYMENT_ID);
        when(mercadoPagoService.buscarPagosPorReferencia(REF)).thenReturn(List.of(pago));
        when(ventaService.existeOrdenEntradas(REF)).thenReturn(true);
        when(ventaService.confirmarPagoEntradas(eq(REF), eq(PAYMENT_ID), any(), eq("ARS")))
                .thenReturn(confirmacion(ResultadoPago.CONFIRMADA));

        service.reconciliar(REF);

        verify(emailService).enviarConfirmacionCompra("juan@example.com", "Juan", "Evento", "General", List.of("QR-1", "QR-2"));
    }

    @Test
    void reconciliar_variosPagosEncontrados_procesaCadaUnoPorSeparado() {
        Payment rechazado = pago("rejected", REF);
        lenient().when(rechazado.getId()).thenReturn(111L);
        Payment aprobado = pagoAprobado();
        lenient().when(aprobado.getId()).thenReturn(222L);
        when(mercadoPagoService.buscarPagosPorReferencia(REF)).thenReturn(List.of(rechazado, aprobado));
        when(ventaService.existeOrdenEntradas(REF)).thenReturn(true);
        when(ventaService.confirmarPagoEntradas(eq(REF), eq(222L), any(), eq("ARS")))
                .thenReturn(confirmacion(ResultadoPago.CONFIRMADA));

        service.reconciliar(REF);

        verify(ventaService, never()).confirmarPagoEntradas(eq(REF), eq(111L), any(), any());
        verify(ventaService).confirmarPagoEntradas(eq(REF), eq(222L), any(), any());
    }
}
