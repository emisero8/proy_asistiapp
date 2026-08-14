package com.asistiapp.backend.controllers;

import com.asistiapp.backend.models.dtos.credito.IniciarCompraCreditoRequestDTO;
import com.asistiapp.backend.models.dtos.credito.IniciarCompraCreditoResponseDTO;
import com.asistiapp.backend.models.dtos.credito.MovimientoCreditoResponseDTO;
import com.asistiapp.backend.models.dtos.credito.PaqueteCreditoDisponibleDTO;
import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.security.SecurityUtils;
import com.asistiapp.backend.services.CreditoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controlador de créditos del Organizador — Fase 8.
 *
 * Endpoints exclusivos Organizador:
 *   POST /creditos/comprar     → Iniciar compra de créditos (CU-014, paso 1)
 *   GET  /creditos/historial   → Historial de movimientos (CU-013)
 *
 * Webhook (simulación IPN, sin restricción de rol — igual que /tickets/webhook/pago):
 *   POST /creditos/webhook/pago → Confirmar pago / acreditar créditos (CU-014, paso 2)
 */
@RestController
@RequestMapping("/creditos")
@RequiredArgsConstructor
public class CreditoController {

    private final CreditoService creditoService;
    private final SecurityUtils securityUtils;

    @PostMapping("/comprar")
    @PreAuthorize("hasRole('Organizador')")
    public ResponseEntity<IniciarCompraCreditoResponseDTO> comprar(
            @Valid @RequestBody IniciarCompraCreditoRequestDTO dto) {
        Organizador organizador = securityUtils.getOrganizadorAutenticado();
        IniciarCompraCreditoResponseDTO response = creditoService.iniciarCompraCredito(dto, organizador.getId());
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @PostMapping("/webhook/pago")
    public ResponseEntity<MovimientoCreditoResponseDTO> confirmarPago(@RequestBody Map<String, Object> body) {
        Long transaccionId = Long.valueOf(body.get("transaccionId").toString());
        Long paymentId = Long.valueOf(body.get("paymentId").toString());
        MovimientoCreditoResponseDTO movimiento = creditoService.confirmarPagoWebhook(transaccionId, paymentId);
        return ResponseEntity.status(HttpStatus.CREATED).body(movimiento);
    }

    @GetMapping("/historial")
    @PreAuthorize("hasRole('Organizador')")
    public ResponseEntity<List<MovimientoCreditoResponseDTO>> historial() {
        Organizador organizador = securityUtils.getOrganizadorAutenticado();
        return ResponseEntity.ok(creditoService.listarHistorial(organizador.getId()));
    }

    /** Catálogo de paquetes disponibles para comprar — antes solo existía la vista de Admin. */
    @GetMapping("/paquetes")
    @PreAuthorize("hasRole('Organizador')")
    public ResponseEntity<List<PaqueteCreditoDisponibleDTO>> paquetesDisponibles() {
        return ResponseEntity.ok(creditoService.listarPaquetesDisponibles());
    }
}
