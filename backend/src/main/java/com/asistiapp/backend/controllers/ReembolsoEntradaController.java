package com.asistiapp.backend.controllers;

import com.asistiapp.backend.models.dtos.entrada.AnularEntradaRequestDTO;
import com.asistiapp.backend.models.dtos.entrada.EntradaResponseDTO;
import com.asistiapp.backend.models.dtos.entrada.ResultadoAnulacionResponseDTO;
import com.asistiapp.backend.models.dtos.entrada.ResultadoReembolsoMasivoResponseDTO;
import com.asistiapp.backend.security.SecurityUtils;
import com.asistiapp.backend.services.AnulacionEntradaService;
import com.asistiapp.backend.services.ReembolsoEntradaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Anular entradas y reembolsar compras (8.6). Solo el Organizador dueño del evento; el ID sale del JWT.
 *
 *   POST /tickets/{id}/anular                       → anula la entrada (y, si se pide, devuelve el dinero)
 *   POST /tickets/{id}/reembolsar                   → devuelve el dinero de una entrada anulada (o reintenta)
 *   GET  /tickets/evento/{eventoId}/reembolsos      → compras online a las que todavía hay que devolverles el dinero
 *   POST /tickets/evento/{eventoId}/reembolsos      → reembolsa todas las compras de un evento cancelado
 */
@RestController
@RequestMapping("/tickets")
@RequiredArgsConstructor
@PreAuthorize("hasRole('Organizador')")
public class ReembolsoEntradaController {

    private final ReembolsoEntradaService reembolsoService;
    private final AnulacionEntradaService anulacionService;
    private final SecurityUtils securityUtils;

    @PostMapping("/{id}/anular")
    public ResponseEntity<ResultadoAnulacionResponseDTO> anular(@PathVariable Long id,
                                                                 @Valid @RequestBody(required = false) AnularEntradaRequestDTO dto) {
        AnularEntradaRequestDTO pedido = dto == null ? new AnularEntradaRequestDTO() : dto;
        return ResponseEntity.ok(reembolsoService.anular(
                id, securityUtils.getOrganizadorAutenticado().getId(), pedido.getMotivo(), pedido.isReembolsar()));
    }

    @PostMapping("/{id}/reembolsar")
    public ResponseEntity<EntradaResponseDTO> reembolsar(@PathVariable Long id) {
        return ResponseEntity.ok(reembolsoService.reembolsar(id, securityUtils.getOrganizadorAutenticado().getId()));
    }

    @GetMapping("/evento/{eventoId}/reembolsos")
    public ResponseEntity<List<EntradaResponseDTO>> pendientes(@PathVariable Long eventoId) {
        return ResponseEntity.ok(anulacionService.pendientesDeReembolso(
                eventoId, securityUtils.getOrganizadorAutenticado().getId()));
    }

    @PostMapping("/evento/{eventoId}/reembolsos")
    public ResponseEntity<ResultadoReembolsoMasivoResponseDTO> reembolsarTodo(@PathVariable Long eventoId) {
        return ResponseEntity.ok(reembolsoService.reembolsarTodo(
                eventoId, securityUtils.getOrganizadorAutenticado().getId()));
    }
}
