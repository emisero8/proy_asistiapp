package com.asistiapp.backend.controllers.admin;

import com.asistiapp.backend.models.dtos.admin.configuracion.ActualizarConfiguracionRequestDTO;
import com.asistiapp.backend.models.dtos.admin.configuracion.ConfiguracionSistemaResponseDTO;
import com.asistiapp.backend.services.admin.AdminConfiguracionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Backoffice del Administrador para configuraciones globales del sistema (CU-028).
 */
@RestController
@RequestMapping("/admin/configuraciones")
@RequiredArgsConstructor
@PreAuthorize("hasRole('Administrador')")
public class AdminConfiguracionController {

    private final AdminConfiguracionService adminConfiguracionService;

    @GetMapping
    public ResponseEntity<List<ConfiguracionSistemaResponseDTO>> listarTodas() {
        return ResponseEntity.ok(adminConfiguracionService.listarTodas());
    }

    @PutMapping("/{clave}")
    public ResponseEntity<ConfiguracionSistemaResponseDTO> actualizar(
            @PathVariable String clave, @Valid @RequestBody ActualizarConfiguracionRequestDTO dto) {
        return ResponseEntity.ok(adminConfiguracionService.actualizar(clave, dto));
    }
}
