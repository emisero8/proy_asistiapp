package com.asistiapp.backend.services;

import com.asistiapp.backend.models.entities.TransaccionCredito;
import com.asistiapp.backend.models.entities.TransaccionPago;
import com.asistiapp.backend.models.enums.EstadoTransaccion;
import com.asistiapp.backend.repositories.TransaccionCreditoRepository;
import com.asistiapp.backend.repositories.TransaccionPagoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Vence las órdenes de MercadoPago (entradas y créditos) que quedaron `Pendiente` y ya
 * pasaron su `fechaVencimiento` — el comprador cerró la pestaña de MercadoPago sin pagar,
 * o simplemente no volvió. Sin este job esas órdenes quedarían `Pendiente` para siempre.
 *
 * Antes de expirar cada una, reconcilia contra MercadoPago (por si pagó justo antes de
 * vencer y el webhook todavía no llegó o nunca iba a llegar): `expirarSiSigueActivaPendiente`
 * no toca una orden que la reconciliación ya haya resuelto.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class VencimientoOrdenesJob {

    private final TransaccionPagoRepository transaccionPagoRepository;
    private final TransaccionCreditoRepository transaccionCreditoRepository;
    private final PagoWebhookService pagoWebhookService;
    private final VentaService ventaService;
    private final CreditoService creditoService;

    private static final long DIEZ_MINUTOS_MS = 10 * 60 * 1000;

    @Scheduled(fixedDelay = DIEZ_MINUTOS_MS, initialDelay = DIEZ_MINUTOS_MS)
    public void vencerOrdenesAbandonadas() {
        LocalDateTime ahora = LocalDateTime.now();

        for (TransaccionPago t : transaccionPagoRepository.findByEstadoAndFechaVencimientoBefore(EstadoTransaccion.Pendiente, ahora)) {
            vencerOrdenEntradas(t.getExternalReference());
        }
        for (TransaccionCredito t : transaccionCreditoRepository.findByEstadoAndFechaVencimientoBefore(EstadoTransaccion.Pendiente, ahora)) {
            vencerOrdenCreditos(t.getExternalReference());
        }
    }

    private void vencerOrdenEntradas(String externalReference) {
        try {
            pagoWebhookService.reconciliar(externalReference);
            ventaService.expirarSiSigueActivaPendiente(externalReference);
        } catch (Exception e) {
            // Un fallo transitorio (MP caído) en una orden no debe cortar el resto del lote.
            log.error("No se pudo procesar el vencimiento de la orden de entradas {}", externalReference, e);
        }
    }

    private void vencerOrdenCreditos(String externalReference) {
        try {
            pagoWebhookService.reconciliar(externalReference);
            creditoService.expirarSiSigueActivaPendiente(externalReference);
        } catch (Exception e) {
            log.error("No se pudo procesar el vencimiento de la orden de créditos {}", externalReference, e);
        }
    }
}
