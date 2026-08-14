package com.asistiapp.backend.controllers;

import com.asistiapp.backend.models.dtos.entrada.*;
import com.asistiapp.backend.models.entities.StaffVendedor;
import com.asistiapp.backend.security.SecurityUtils;
import com.asistiapp.backend.services.VentaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controlador REST del Motor de Ventas — Fase 5.
 *
 * Endpoints públicos (cualquier usuario autenticado puede comprar online):
 *   POST /tickets/comprar-online       → Iniciar compra (CU-017, paso 1)
 *   POST /tickets/webhook/pago         → Confirmar pago / IPN simulado (CU-017, paso 2)
 *
 * Endpoints exclusivos Staff_Vendedor:
 *   POST /tickets/venta-manual         → Venta manual directa (CU-019)
 *
 * Endpoints para Organizador (reportes):
 *   GET  /tickets/evento/{eventoId}    → Listar entradas de un evento
 */
@RestController
@RequestMapping("/tickets")
@RequiredArgsConstructor
public class VentaController {

    private final VentaService ventaService;
    private final SecurityUtils securityUtils;

    // ─────────────────────────────────────────────
    // FLUJO ONLINE (CU-017)
    // ─────────────────────────────────────────────

    /**
     * Paso 1: Inicia el proceso de compra online.
     * Cualquier usuario autenticado puede comprar entradas.
     * Retorna la "URL de pago" de MercadoPago (simulada).
     */
    @PostMapping("/comprar-online")
    public ResponseEntity<IniciarCompraResponseDTO> iniciarCompraOnline(
            @Valid @RequestBody CompraOnlineRequestDTO dto) {
        IniciarCompraResponseDTO response = ventaService.iniciarCompraOnline(dto);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    /**
     * Paso 2: Webhook simulado — confirma el pago y genera la entrada.
     * En producción MercadoPago llamaría a este endpoint automáticamente.
     * Para testing se puede llamar manualmente con el ordenId devuelto en el paso 1.
     *
     * @param body  mapa con "ordenId" y "paymentId" (simulado)
     */
    @PostMapping("/webhook/pago")
    public ResponseEntity<EntradaResponseDTO> confirmarPago(@RequestBody Map<String, Object> body) {
        String ordenId = (String) body.get("ordenId");
        Long paymentId = Long.valueOf(body.get("paymentId").toString());
        EntradaResponseDTO entrada = ventaService.confirmarPagoWebhook(ordenId, paymentId);
        return ResponseEntity.status(HttpStatus.CREATED).body(entrada);
    }

    // ─────────────────────────────────────────────
    // VENTA MANUAL (CU-019) — Solo Staff_Vendedor
    // ─────────────────────────────────────────────

    /**
     * Venta manual de entrada — exclusivo para Staff_Vendedor.
     * Genera QR y marca la entrada como Pagada de forma inmediata.
     */
    @PostMapping("/venta-manual")
    @PreAuthorize("hasRole('Staff_Vendedor')")
    public ResponseEntity<EntradaResponseDTO> ventaManual(
            @Valid @RequestBody VentaManualRequestDTO dto) {
        StaffVendedor staff = securityUtils.getStaffVendedorAutenticado();
        EntradaResponseDTO entrada = ventaService.realizarVentaManual(dto, staff.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(entrada);
    }

    // ─────────────────────────────────────────────
    // REPORTES — Solo Organizador
    // ─────────────────────────────────────────────

    /**
     * Lista todas las entradas vendidas para un evento.
     * Útil para que el Organizador vea el estado de ventas.
     */
    @GetMapping("/evento/{eventoId}")
    @PreAuthorize("hasRole('Organizador')")
    public ResponseEntity<List<EntradaResponseDTO>> listarEntradasPorEvento(
            @PathVariable Long eventoId) {
        return ResponseEntity.ok(ventaService.listarEntradasPorEvento(eventoId));
    }

    // ─────────────────────────────────────────────
    // IMAGEN QR (Fase 16)
    // ─────────────────────────────────────────────

    /**
     * Devuelve la imagen PNG del QR de una entrada, para que el Frontend la
     * muestre en la pantalla "mi entrada" sin tener que regenerarla client-side.
     *
     * Ruta pública a nivel de Spring Security (el comprador nunca tiene JWT):
     * la autorización real ocurre en VentaService.obtenerImagenQr, que exige
     * o el codigoQr exacto (query param) o un JWT de Organizador dueño del evento.
     */
    @GetMapping("/{id}/qr-image")
    public ResponseEntity<byte[]> obtenerImagenQr(
            @PathVariable Long id,
            @RequestParam(required = false) String codigoQr) {
        byte[] png = ventaService.obtenerImagenQr(id, codigoQr);
        return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG).body(png);
    }
}
