package com.asistiapp.backend.controllers.admin;

import com.asistiapp.backend.models.dtos.admin.paquete.PaqueteCreditoRequestDTO;
import com.asistiapp.backend.models.dtos.admin.paquete.PaqueteCreditoResponseDTO;
import com.asistiapp.backend.services.admin.AdminPaqueteCreditoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Backoffice del Administrador para el catálogo de paquetes de crédito (Fase 7).
 */
@RestController
@RequestMapping("/admin/paquetes-credito")
@RequiredArgsConstructor
@PreAuthorize("hasRole('Administrador')")
public class AdminPaqueteCreditoController {

    private final AdminPaqueteCreditoService adminPaqueteCreditoService;

    @GetMapping
    public ResponseEntity<List<PaqueteCreditoResponseDTO>> listarTodos() {
        return ResponseEntity.ok(adminPaqueteCreditoService.listarTodos());
    }

    @PostMapping
    public ResponseEntity<PaqueteCreditoResponseDTO> crear(@Valid @RequestBody PaqueteCreditoRequestDTO dto) {
        return ResponseEntity.ok(adminPaqueteCreditoService.crear(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PaqueteCreditoResponseDTO> actualizar(
            @PathVariable Long id, @Valid @RequestBody PaqueteCreditoRequestDTO dto) {
        return ResponseEntity.ok(adminPaqueteCreditoService.actualizar(id, dto));
    }

    @PatchMapping("/{id}/deshabilitar")
    public ResponseEntity<PaqueteCreditoResponseDTO> deshabilitar(@PathVariable Long id) {
        return ResponseEntity.ok(adminPaqueteCreditoService.deshabilitar(id));
    }

    @PatchMapping("/{id}/habilitar")
    public ResponseEntity<PaqueteCreditoResponseDTO> habilitar(@PathVariable Long id) {
        return ResponseEntity.ok(adminPaqueteCreditoService.habilitar(id));
    }
}
