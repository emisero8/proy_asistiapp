package com.asistiapp.backend.controllers;

import com.asistiapp.backend.models.dtos.credito.CreditosResumenResponseDTO;
import com.asistiapp.backend.models.dtos.credito.EstadoOrdenCreditoResponseDTO;
import com.asistiapp.backend.models.dtos.credito.IniciarCompraCreditoRequestDTO;
import com.asistiapp.backend.models.dtos.credito.IniciarCompraCreditoResponseDTO;
import com.asistiapp.backend.models.dtos.credito.MovimientoCreditoResponseDTO;
import com.asistiapp.backend.models.dtos.credito.PaqueteCreditoDisponibleDTO;
import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.models.enums.EstadoTransaccion;
import com.asistiapp.backend.security.SecurityUtils;
import com.asistiapp.backend.services.CreditoService;
import com.asistiapp.backend.services.PagoWebhookService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controlador de créditos del Organizador — Fase 8.
 *
 * Endpoints exclusivos Organizador:
 *   POST /creditos/comprar     → Iniciar compra de créditos (CU-014, paso 1)
 *   GET  /creditos/historial   → Historial de movimientos (CU-013)
 *
 * El pago se confirma por el webhook de MercadoPago (POST /payments/mercadopago/webhook).
 */
@RestController
@RequestMapping("/creditos")
@RequiredArgsConstructor
public class CreditoController {

    private final CreditoService creditoService;
    private final SecurityUtils securityUtils;
    private final PagoWebhookService pagoWebhookService;

    @PostMapping("/comprar")
    @PreAuthorize("hasRole('Organizador')")
    public ResponseEntity<IniciarCompraCreditoResponseDTO> comprar(
            @Valid @RequestBody IniciarCompraCreditoRequestDTO dto) {
        Organizador organizador = securityUtils.getOrganizadorAutenticado();
        IniciarCompraCreditoResponseDTO response = creditoService.iniciarCompraCredito(dto, organizador.getId());
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @GetMapping("/historial")
    @PreAuthorize("hasRole('Organizador')")
    public ResponseEntity<List<MovimientoCreditoResponseDTO>> historial() {
        Organizador organizador = securityUtils.getOrganizadorAutenticado();
        return ResponseEntity.ok(creditoService.listarHistorial(organizador.getId()));
    }

    /** Saldo, costo de publicar y créditos disponibles para entradas de tandas. */
    @GetMapping("/resumen")
    @PreAuthorize("hasRole('Organizador')")
    public ResponseEntity<CreditosResumenResponseDTO> resumen() {
        Organizador organizador = securityUtils.getOrganizadorAutenticado();
        return ResponseEntity.ok(creditoService.obtenerResumen(organizador.getId()));
    }

    /** Catálogo de paquetes disponibles para comprar — antes solo existía la vista de Admin. */
    @GetMapping("/paquetes")
    @PreAuthorize("hasRole('Organizador')")
    public ResponseEntity<List<PaqueteCreditoDisponibleDTO>> paquetesDisponibles() {
        return ResponseEntity.ok(creditoService.listarPaquetesDisponibles());
    }

    /**
     * Estado de una orden de créditos para la pantalla de resultado del pago.
     * A diferencia de las entradas, acá el Organizador tiene JWT: se verifica que
     * la orden sea suya.
     *
     * Si la orden sigue `Pendiente`, reconcilia contra MercadoPago antes de responder —
     * no depende solo de que el webhook haya llegado (ver DECISIONES.md).
     */
    @GetMapping("/orden/{externalReference}")
    @PreAuthorize("hasRole('Organizador')")
    public ResponseEntity<EstadoOrdenCreditoResponseDTO> obtenerEstadoOrden(
            @PathVariable String externalReference) {
        Organizador organizador = securityUtils.getOrganizadorAutenticado();
        if (creditoService.estadoActual(externalReference).filter(e -> e == EstadoTransaccion.Pendiente).isPresent()) {
            pagoWebhookService.reconciliar(externalReference);
        }
        return ResponseEntity.ok(creditoService.obtenerEstadoOrden(externalReference, organizador.getId()));
    }
}
