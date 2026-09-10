package com.asistiapp.backend.controllers.admin;

import com.asistiapp.backend.models.dtos.evento.EventoRequestDTO;
import com.asistiapp.backend.models.dtos.evento.EventoResponseDTO;
import com.asistiapp.backend.models.dtos.tanda.TandaRequestDTO;
import com.asistiapp.backend.models.dtos.tanda.TandaResponseDTO;
import com.asistiapp.backend.services.admin.AdminEventoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Backoffice del Administrador para la gestión de eventos de cualquier
 * Organizador (CU-023, CU-024, CU-025).
 */
@RestController
@RequestMapping("/admin/eventos")
@RequiredArgsConstructor
@PreAuthorize("hasRole('Administrador')")
public class AdminEventoController {

    private final AdminEventoService adminEventoService;

    @GetMapping
    public ResponseEntity<List<EventoResponseDTO>> listarTodos() {
        return ResponseEntity.ok(adminEventoService.listarTodos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EventoResponseDTO> obtenerEvento(@PathVariable Long id) {
        return ResponseEntity.ok(adminEventoService.obtenerEvento(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EventoResponseDTO> editarEvento(
            @PathVariable Long id, @Valid @RequestBody EventoRequestDTO dto) {
        return ResponseEntity.ok(adminEventoService.editarEvento(id, dto));
    }

    @PostMapping("/{id}/tandas")
    public ResponseEntity<TandaResponseDTO> crearTanda(
            @PathVariable Long id, @Valid @RequestBody TandaRequestDTO dto) {
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
                .body(adminEventoService.crearTanda(id, dto));
    }

    @PutMapping("/{id}/tandas/{idTanda}")
    public ResponseEntity<TandaResponseDTO> actualizarTanda(
            @PathVariable Long id, @PathVariable Long idTanda, @Valid @RequestBody TandaRequestDTO dto) {
        return ResponseEntity.ok(adminEventoService.actualizarTanda(id, idTanda, dto));
    }

    @DeleteMapping("/{id}/tandas/{idTanda}")
    public ResponseEntity<Void> eliminarTanda(@PathVariable Long id, @PathVariable Long idTanda) {
        adminEventoService.eliminarTanda(id, idTanda);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/cancelar")
    public ResponseEntity<EventoResponseDTO> cancelarEvento(@PathVariable Long id) {
        return ResponseEntity.ok(adminEventoService.cancelarEvento(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarEvento(@PathVariable Long id) {
        adminEventoService.eliminarEvento(id);
        return ResponseEntity.noContent().build();
    }
}
