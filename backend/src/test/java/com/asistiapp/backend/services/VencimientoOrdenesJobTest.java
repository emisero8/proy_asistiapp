package com.asistiapp.backend.services;

import com.asistiapp.backend.models.entities.TransaccionCredito;
import com.asistiapp.backend.models.entities.TransaccionPago;
import com.asistiapp.backend.models.enums.EstadoTransaccion;
import com.asistiapp.backend.repositories.TransaccionCreditoRepository;
import com.asistiapp.backend.repositories.TransaccionPagoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * El job en sí solo orquesta: la lógica de "no expirar algo que la reconciliación ya
 * resolvió" vive en VentaService/CreditoService.expirarSiSigueActivaPendiente (sus propios
 * tests ya la cubren). Acá solo importa que recorra las órdenes vencidas y, para cada una,
 * reconcilie ANTES de expirar, sin que una falle y corte el resto del lote.
 */
@ExtendWith(MockitoExtension.class)
class VencimientoOrdenesJobTest {

    @Mock
    private TransaccionPagoRepository transaccionPagoRepository;
    @Mock
    private TransaccionCreditoRepository transaccionCreditoRepository;
    @Mock
    private PagoWebhookService pagoWebhookService;
    @Mock
    private VentaService ventaService;
    @Mock
    private CreditoService creditoService;
    @InjectMocks
    private VencimientoOrdenesJob job;

    private TransaccionPago ordenEntradas(String ref) {
        TransaccionPago t = new TransaccionPago();
        t.setExternalReference(ref);
        return t;
    }

    private TransaccionCredito ordenCreditos(String ref) {
        TransaccionCredito t = new TransaccionCredito();
        t.setExternalReference(ref);
        return t;
    }

    @Test
    void vencerOrdenesAbandonadas_ordenDeEntradasVencida_reconciliaYLuegoExpira() {
        when(transaccionPagoRepository.findByEstadoAndFechaVencimientoBefore(eq(EstadoTransaccion.Pendiente), any()))
                .thenReturn(List.of(ordenEntradas("ref-1")));
        when(transaccionCreditoRepository.findByEstadoAndFechaVencimientoBefore(eq(EstadoTransaccion.Pendiente), any()))
                .thenReturn(List.of());

        job.vencerOrdenesAbandonadas();

        InOrder orden = inOrder(pagoWebhookService, ventaService);
        orden.verify(pagoWebhookService).reconciliar("ref-1");
        orden.verify(ventaService).expirarSiSigueActivaPendiente("ref-1");
    }

    @Test
    void vencerOrdenesAbandonadas_ordenDeCreditosVencida_reconciliaYLuegoExpira() {
        when(transaccionPagoRepository.findByEstadoAndFechaVencimientoBefore(eq(EstadoTransaccion.Pendiente), any()))
                .thenReturn(List.of());
        when(transaccionCreditoRepository.findByEstadoAndFechaVencimientoBefore(eq(EstadoTransaccion.Pendiente), any()))
                .thenReturn(List.of(ordenCreditos("ref-2")));

        job.vencerOrdenesAbandonadas();

        InOrder orden = inOrder(pagoWebhookService, creditoService);
        orden.verify(pagoWebhookService).reconciliar("ref-2");
        orden.verify(creditoService).expirarSiSigueActivaPendiente("ref-2");
    }

    @Test
    void vencerOrdenesAbandonadas_sinOrdenesVencidas_noHaceNada() {
        when(transaccionPagoRepository.findByEstadoAndFechaVencimientoBefore(eq(EstadoTransaccion.Pendiente), any()))
                .thenReturn(List.of());
        when(transaccionCreditoRepository.findByEstadoAndFechaVencimientoBefore(eq(EstadoTransaccion.Pendiente), any()))
                .thenReturn(List.of());

        job.vencerOrdenesAbandonadas();

        verifyNoInteractions(pagoWebhookService, ventaService, creditoService);
    }

    @Test
    void vencerOrdenesAbandonadas_unaOrdenFallaAlReconciliar_siguePropagandoAlResto() {
        when(transaccionPagoRepository.findByEstadoAndFechaVencimientoBefore(eq(EstadoTransaccion.Pendiente), any()))
                .thenReturn(List.of(ordenEntradas("ref-rota"), ordenEntradas("ref-ok")));
        when(transaccionCreditoRepository.findByEstadoAndFechaVencimientoBefore(eq(EstadoTransaccion.Pendiente), any()))
                .thenReturn(List.of());
        doThrow(new RuntimeException("MP caído")).when(pagoWebhookService).reconciliar("ref-rota");

        job.vencerOrdenesAbandonadas();

        verify(ventaService, never()).expirarSiSigueActivaPendiente("ref-rota");
        verify(pagoWebhookService).reconciliar("ref-ok");
        verify(ventaService).expirarSiSigueActivaPendiente("ref-ok");
    }
}
