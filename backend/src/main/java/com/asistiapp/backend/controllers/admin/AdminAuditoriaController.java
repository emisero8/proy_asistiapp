package com.asistiapp.backend.controllers.admin;

import com.asistiapp.backend.models.dtos.admin.auditoria.LogAuditoriaResponseDTO;
import com.asistiapp.backend.services.AuditoriaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Consulta del historial de auditoría administrativa (Fase 7).
 */
@RestController
@RequestMapping("/admin/auditoria")
@RequiredArgsConstructor
@PreAuthorize("hasRole('Administrador')")
public class AdminAuditoriaController {

    private final AuditoriaService auditoriaService;

    @GetMapping
    public ResponseEntity<List<LogAuditoriaResponseDTO>> listarTodos() {
        return ResponseEntity.ok(auditoriaService.listarTodos());
    }
}
