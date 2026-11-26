package com.asistiapp.backend.controllers;

import com.asistiapp.backend.models.dtos.entrada.*;
import com.asistiapp.backend.models.entities.StaffVendedor;
import com.asistiapp.backend.models.enums.EstadoTransaccion;
import com.asistiapp.backend.security.SecurityUtils;
import com.asistiapp.backend.services.EmailService;
import com.asistiapp.backend.services.PagoWebhookService;
import com.asistiapp.backend.services.VentaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controlador REST del Motor de Ventas — Fase 5.
 *
 * Endpoints públicos (cualquier usuario autenticado puede comprar online):
 *   POST /tickets/comprar-online       → Iniciar compra (CU-017): devuelve el init_point de MercadoPago
 *   (la confirmación del pago llega por POST /payments/mercadopago/webhook)
 *
 * Endpoints exclusivos Staff_Vendedor:
 *   POST /tickets/venta-manual         → Venta manual directa de 1..20 entradas, todo o nada (CU-019)
 *   GET  /tickets/mi-tope              → Cuánto le queda del tope que le fijó el Organizador
 *
 * Endpoints para Organizador (reportes):
 *   GET  /tickets/evento/{eventoId}    → Listar entradas de un evento
 */
@Slf4j
@RestController
@RequestMapping("/tickets")
@RequiredArgsConstructor
public class VentaController {

    private final VentaService ventaService;
    private final SecurityUtils securityUtils;
    private final PagoWebhookService pagoWebhookService;
    private final EmailService emailService;

    // ─────────────────────────────────────────────
    // FLUJO ONLINE (CU-017)
    // ─────────────────────────────────────────────

    /**
     * Paso 1: Inicia el proceso de compra online.
     * Cualquier usuario autenticado puede comprar entradas.
     * Retorna el init_point de MercadoPago al que hay que redirigir al comprador.
     */
    @PostMapping("/comprar-online")
    public ResponseEntity<IniciarCompraResponseDTO> iniciarCompraOnline(
            @Valid @RequestBody CompraOnlineRequestDTO dto) {
        IniciarCompraResponseDTO response = ventaService.iniciarCompraOnline(dto);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    /**
     * Estado de una orden para la pantalla de resultado del pago
     * (a la que MercadoPago devuelve al comprador tras pagar).
     *
     * Si la orden sigue `Pendiente`, reconcilia contra MercadoPago antes de responder —
     * no depende solo de que el webhook haya llegado (ver docs/proyecto/DECISIONES.md).
     */
    @GetMapping("/orden/{externalReference}")
    public ResponseEntity<EstadoOrdenEntradasResponseDTO> obtenerEstadoOrden(
            @PathVariable String externalReference) {
        if (ventaService.estadoActual(externalReference).filter(e -> e == EstadoTransaccion.Pendiente).isPresent()) {
            pagoWebhookService.reconciliarSiCorresponde(externalReference);
        }
        return ResponseEntity.ok(ventaService.obtenerEstadoOrden(externalReference));
    }

    // ─────────────────────────────────────────────
    // VENTA MANUAL (CU-019) — Solo Staff_Vendedor
    // ─────────────────────────────────────────────

    /**
     * Venta manual de una o más entradas — exclusivo para Staff_Vendedor.
     * Genera un QR por entrada y las marca como Pagadas de forma inmediata; es todo o nada.
     * Después de confirmada la venta, el comprador recibe un solo mail con todas sus entradas.
     */
    @PostMapping("/venta-manual")
    @PreAuthorize("hasRole('Staff_Vendedor')")
    public ResponseEntity<List<EntradaResponseDTO>> ventaManual(
            @Valid @RequestBody VentaManualRequestDTO dto) {
        StaffVendedor staff = securityUtils.getStaffVendedorAutenticado();
        List<EntradaResponseDTO> entradas = ventaService.realizarVentaManual(dto, staff.getId());
        enviarMailAlDestinatario(dto.getEmailComprador(), dto.getNombreComprador(), entradas);
        return ResponseEntity.status(HttpStatus.CREATED).body(entradas);
    }

    /**
     * El mail sale acá, ya con la venta o emisión confirmada (igual que en PagoWebhookService). Si algo
     * falla al encolarlo se loguea y se sigue: devolver un error con todo ya guardado haría que quien
     * operó lo reintente y se duplique.
     */
    private void enviarMailAlDestinatario(String email, String nombre, List<EntradaResponseDTO> entradas) {
        try {
            EntradaResponseDTO primera = entradas.get(0);
            emailService.enviarConfirmacionCompra(
                    email,
                    nombre,
                    primera.getNombreEvento(),
                    primera.getNombreTanda(),
                    entradas.stream().map(EntradaResponseDTO::getCodigoQr).toList());
        } catch (RuntimeException e) {
            log.error("Las entradas se confirmaron pero no se pudo mandar el mail a {}: {}", email, e.getMessage());
        }
    }

    /**
     * Cuántas entradas más se le pueden vender a un comprador (por mail) para este
     * evento, respetando el tope por comprador — el POS la consulta para no dejar
     * elegir una cantidad que el backend va a rechazar a mitad de la venta.
     */
    @GetMapping("/disponibilidad-comprador")
    @PreAuthorize("hasRole('Staff_Vendedor')")
    public ResponseEntity<DisponibilidadCompradorResponseDTO> consultarDisponibilidadComprador(
            @RequestParam Long idEvento,
            @RequestParam(required = false) String email) {
        return ResponseEntity.ok(ventaService.consultarDisponibilidadComprador(idEvento, email));
    }

    /** El tope de entradas del vendedor autenticado y cuánto le queda. */
    @GetMapping("/mi-tope")
    @PreAuthorize("hasRole('Staff_Vendedor')")
    public ResponseEntity<TopeVendedorResponseDTO> consultarMiTope() {
        StaffVendedor staff = securityUtils.getStaffVendedorAutenticado();
        return ResponseEntity.ok(ventaService.consultarTopeVendedor(staff.getId()));
    }

    // ─────────────────────────────────────────────
    // EMISIÓN DEL ORGANIZADOR — cortesía o pago por fuera de la plataforma
    // ─────────────────────────────────────────────

    /**
     * El Organizador emite él mismo entradas de una de sus tandas (cortesía o pago externo).
     * Salen del cupo de la tanda, ya paga en créditos. Todo o nada. El mail al destinatario es
     * opcional ({@code enviarMail}) y sale ya con la emisión confirmada.
     */
    @PostMapping("/emision-organizador")
    @PreAuthorize("hasRole('Organizador')")
    public ResponseEntity<List<EntradaResponseDTO>> emitirEntradasOrganizador(
            @Valid @RequestBody EmisionOrganizadorRequestDTO dto) {
        Long idOrganizador = securityUtils.getOrganizadorAutenticado().getId();
        List<EntradaResponseDTO> entradas = ventaService.emitirEntradasOrganizador(dto, idOrganizador);
        if (dto.isEnviarMail()) {
            enviarMailAlDestinatario(dto.getEmailDestinatario(), dto.getNombreDestinatario(), entradas);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(entradas);
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
        Long idOrganizador = securityUtils.getOrganizadorAutenticado().getId();
        return ResponseEntity.ok(ventaService.listarEntradasPorEvento(eventoId, idOrganizador));
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

    /**
     * Consulta pública de una entrada usando su código QR como identificador único.
     * El codigoQr actúa como token de acceso implícito — solo quien lo recibió
     * por email puede acceder. Usado por la página "Mi Entrada" del frontend.
     */
    @GetMapping("/by-codigo")
    public ResponseEntity<EntradaResponseDTO> obtenerEntradaPorCodigo(
            @RequestParam String codigoQr) {
        EntradaResponseDTO entrada = ventaService.obtenerEntradaPorCodigoQr(codigoQr);
        return ResponseEntity.ok(entrada);
    }
}
