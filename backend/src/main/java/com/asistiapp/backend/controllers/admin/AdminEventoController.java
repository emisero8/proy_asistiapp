package com.asistiapp.backend.controllers.admin;

import com.asistiapp.backend.models.dtos.evento.EventoRequestDTO;
import com.asistiapp.backend.models.dtos.evento.EventoResponseDTO;
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

    @PutMapping("/{id}")
    public ResponseEntity<EventoResponseDTO> editarEvento(
            @PathVariable Long id, @Valid @RequestBody EventoRequestDTO dto) {
        return ResponseEntity.ok(adminEventoService.editarEvento(id, dto));
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
