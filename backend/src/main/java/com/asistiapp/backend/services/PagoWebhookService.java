package com.asistiapp.backend.services;

import com.mercadopago.resources.payment.Payment;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Procesa las notificaciones de pago de MercadoPago (webhook).
 *
 * Nunca se confía en el contenido de la notificación: solo trae el id del pago, y el
 * estado, el monto y la orden a la que corresponde se leen de la API de MercadoPago.
 *
 * Esta clase NO es transaccional a propósito: cada paso de negocio (confirmar la orden,
 * marcarla reembolsada) es su propia transacción en VentaService/CreditoService, y las
 * llamadas externas (reembolso, mail) quedan afuera de ellas — así un fallo de MP no
 * deja una transacción de base abierta, y un fallo de mail no deshace la venta.
 *
 * Si algo falla de forma transitoria (MP caído) la excepción sube y el controlador
 * responde 5xx: MercadoPago reintenta, y todo el flujo es idempotente.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PagoWebhookService {

    private final MercadoPagoService mercadoPagoService;
    private final VentaService ventaService;
    private final CreditoService creditoService;
    private final EmailService emailService;

    public void procesarNotificacionPago(Long paymentId) {
        Optional<Payment> consulta = mercadoPagoService.obtenerPago(paymentId);
        if (consulta.isEmpty()) {
            return; // el pago no existe en MP: nada que hacer (y no tiene sentido que MP reintente)
        }
        procesarPago(paymentId, consulta.get());
    }

    /**
     * Reconciliación activa: se llama al consultar una orden que sigue `Pendiente` (ver
     * VentaController/CreditoController), por si el webhook nunca llegó (el backend estuvo
     * caído, una firma rechazada antes de desactivar la validación, etc.). Busca en MercadoPago
     * los pagos de esa orden y los procesa exactamente igual que si los avisara el webhook —
     * misma idempotencia, mismos reembolsos automáticos si ya no se puede entregar.
     */
    public void reconciliar(String externalReference) {
        List<Payment> pagos = mercadoPagoService.buscarPagosPorReferencia(externalReference);
        for (Payment pago : pagos) {
            procesarPago(pago.getId(), pago);
        }
    }

    private void procesarPago(Long paymentId, Payment pago) {
        String referencia = pago.getExternalReference();
        if (referencia == null || referencia.isBlank()) {
            log.info("Pago MP {} sin external_reference: no corresponde a una orden de AsistíAPP", paymentId);
            return;
        }

        String estado = pago.getStatus();
        if ("approved".equals(estado)) {
            procesarPagoAprobado(paymentId, referencia, pago);
        } else if ("refunded".equals(estado)) {
            // Recupera el caso en que se devolvió el dinero pero no llegó a marcarse la orden.
            avisarReembolsoEntradas(ventaService.marcarOrdenReembolsada(referencia, paymentId));
            avisarReembolsoCreditos(creditoService.marcarOrdenReembolsada(referencia, paymentId));
        } else {
            // pending / in_process: todavía no hay nada que entregar. rejected / cancelled: la
            // preferencia sigue abierta y el comprador puede reintentar, así que la orden queda
            // Pendiente hasta que se pague o venza.
            log.info("Pago MP {} (orden {}) en estado '{}': sin acción", paymentId, referencia, estado);
        }
    }

    private void procesarPagoAprobado(Long paymentId, String referencia, Payment pago) {
        if (ventaService.existeOrdenEntradas(referencia)) {
            confirmarEntradas(paymentId, referencia, pago);
        } else if (creditoService.existeOrdenCredito(referencia)) {
            confirmarCreditos(paymentId, referencia, pago);
        } else {
            log.warn("Pago MP {} aprobado con external_reference {} que no coincide con ninguna orden", paymentId, referencia);
        }
    }

    private void confirmarEntradas(Long paymentId, String referencia, Payment pago) {
        VentaService.ConfirmacionEntradas confirmacion = ventaService.confirmarPagoEntradas(
                referencia, paymentId, pago.getTransactionAmount(), pago.getCurrencyId());

        switch (confirmacion.resultado()) {
            case CONFIRMADA -> emailService.enviarConfirmacionCompra(
                    confirmacion.emailComprador(),
                    confirmacion.nombreComprador(),
                    confirmacion.nombreEvento(),
                    confirmacion.nombreTanda(),
                    confirmacion.codigosQr());
            case SIN_DISPONIBILIDAD -> {
                log.warn("Pago MP {} aprobado pero la orden {} ya no se puede entregar: se reembolsa", paymentId, referencia);
                mercadoPagoService.reembolsar(paymentId);
                avisarReembolsoEntradas(ventaService.marcarOrdenReembolsada(referencia, paymentId));
            }
            case DUPLICADO -> {
                log.warn("Pago MP {} duplicado para la orden {} (ya resuelta): se reembolsa", paymentId, referencia);
                mercadoPagoService.reembolsar(paymentId);
            }
            case MONTO_INVALIDO -> log.error(
                    "Pago MP {} no coincide en monto/moneda con la orden {}: NO se entrega nada, revisar a mano", paymentId, referencia);
            case YA_PROCESADA, NO_ENCONTRADA -> log.info("Pago MP {} (orden {}): {}", paymentId, referencia, confirmacion.resultado());
        }
    }

    private void confirmarCreditos(Long paymentId, String referencia, Payment pago) {
        ResultadoPago resultado = creditoService.confirmarPagoCredito(
                referencia, paymentId, pago.getTransactionAmount(), pago.getCurrencyId());

        switch (resultado) {
            case SIN_DISPONIBILIDAD -> {
                log.warn("Pago MP {} aprobado pero la orden de créditos {} no se puede acreditar: se reembolsa", paymentId, referencia);
                mercadoPagoService.reembolsar(paymentId);
                avisarReembolsoCreditos(creditoService.marcarOrdenReembolsada(referencia, paymentId));
            }
            case DUPLICADO -> {
                log.warn("Pago MP {} duplicado para la orden de créditos {} (ya resuelta): se reembolsa", paymentId, referencia);
                mercadoPagoService.reembolsar(paymentId);
            }
            case MONTO_INVALIDO -> log.error(
                    "Pago MP {} no coincide en monto/moneda con la orden de créditos {}: NO se acredita nada, revisar a mano",
                    paymentId, referencia);
            case CONFIRMADA, YA_PROCESADA, NO_ENCONTRADA -> log.info("Pago MP {} (orden de créditos {}): {}", paymentId, referencia, resultado);
        }
    }

    /** No manda nada si la orden no se reembolsó recién ahora (ya lo estaba, o no existía). */
    private void avisarReembolsoEntradas(VentaService.ReembolsoEntradas reembolso) {
        if (reembolso.reembolsada()) {
            emailService.enviarNotificacionReembolsoEntradas(
                    reembolso.emailComprador(), reembolso.nombreComprador(), reembolso.nombreEvento());
        }
    }

    /** No manda nada si la orden no se reembolsó recién ahora, o si no se pudo ubicar al organizador. */
    private void avisarReembolsoCreditos(CreditoService.ReembolsoCreditos reembolso) {
        if (reembolso.reembolsada() && reembolso.emailOrganizador() != null) {
            emailService.enviarNotificacionReembolsoCreditos(
                    reembolso.emailOrganizador(), reembolso.nombreOrganizador(), reembolso.cantidadCreditos());
        }
    }
}
