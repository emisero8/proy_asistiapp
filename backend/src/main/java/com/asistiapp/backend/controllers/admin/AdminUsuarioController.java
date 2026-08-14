package com.asistiapp.backend.controllers.admin;

import com.asistiapp.backend.models.dtos.admin.ReasignarRolRequestDTO;
import com.asistiapp.backend.models.dtos.admin.UsuarioResponseDTO;
import com.asistiapp.backend.models.enums.EstadoUsuario;
import com.asistiapp.backend.models.enums.RolUsuario;
import com.asistiapp.backend.services.admin.AdminUsuarioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Backoffice del Administrador para la gestión de usuarios (Fase 7).
 */
@RestController
@RequestMapping("/admin/usuarios")
@RequiredArgsConstructor
@PreAuthorize("hasRole('Administrador')")
public class AdminUsuarioController {

    private final AdminUsuarioService adminUsuarioService;

    @GetMapping
    public ResponseEntity<List<UsuarioResponseDTO>> listarUsuarios(
            @RequestParam(required = false) RolUsuario rol,
            @RequestParam(required = false) EstadoUsuario estado) {
        return ResponseEntity.ok(adminUsuarioService.listarUsuarios(rol, estado));
    }

    @PatchMapping("/{id}/suspender")
    public ResponseEntity<UsuarioResponseDTO> suspenderUsuario(@PathVariable Long id) {
        return ResponseEntity.ok(adminUsuarioService.suspenderUsuario(id));
    }

    @PatchMapping("/{id}/activar")
    public ResponseEntity<UsuarioResponseDTO> activarUsuario(@PathVariable Long id) {
        return ResponseEntity.ok(adminUsuarioService.activarUsuario(id));
    }

    @PatchMapping("/{id}/rol")
    public ResponseEntity<UsuarioResponseDTO> reasignarRol(
            @PathVariable Long id, @Valid @RequestBody ReasignarRolRequestDTO dto) {
        return ResponseEntity.ok(adminUsuarioService.reasignarRol(id, dto.getNuevoRol()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarUsuario(@PathVariable Long id) {
        adminUsuarioService.eliminarUsuario(id);
        return ResponseEntity.noContent().build();
    }
}
