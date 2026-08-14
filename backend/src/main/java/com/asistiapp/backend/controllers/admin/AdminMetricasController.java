package com.asistiapp.backend.controllers.admin;

import com.asistiapp.backend.models.dtos.metricas.AdminMetricasResponseDTO;
import com.asistiapp.backend.services.admin.AdminMetricasService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** KPIs globales del sistema para el dashboard del Administrador (CU-027). */
@RestController
@RequestMapping("/admin/metricas")
@RequiredArgsConstructor
@PreAuthorize("hasRole('Administrador')")
public class AdminMetricasController {

    private final AdminMetricasService adminMetricasService;

    @GetMapping
    public ResponseEntity<AdminMetricasResponseDTO> obtenerMetricasGlobales() {
        return ResponseEntity.ok(adminMetricasService.obtenerMetricasGlobales());
    }
}
