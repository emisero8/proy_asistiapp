package com.asistiapp.backend.controllers;

import com.asistiapp.backend.models.dtos.credito.PaqueteCreditoDisponibleDTO;
import com.asistiapp.backend.models.dtos.publico.EstadisticasPublicasResponseDTO;
import com.asistiapp.backend.services.CreditoService;
import com.asistiapp.backend.services.EstadisticasPublicasService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Información pública para la landing (sin autenticación) — estadísticas
 * agregadas de la plataforma y el catálogo de paquetes de crédito, para que
 * un visitante anónimo vea "por qué AsistíAPP" antes de registrarse.
 * Ver `SecurityConfig` (permitAll para GET /public/**).
 */
@RestController
@RequestMapping("/public")
@RequiredArgsConstructor
public class InfoPublicaController {

    private final EstadisticasPublicasService estadisticasPublicasService;
    private final CreditoService creditoService;

    @GetMapping("/estadisticas")
    public ResponseEntity<EstadisticasPublicasResponseDTO> obtenerEstadisticas() {
        return ResponseEntity.ok(estadisticasPublicasService.obtenerEstadisticas());
    }

    @GetMapping("/paquetes-credito")
    public ResponseEntity<List<PaqueteCreditoDisponibleDTO>> listarPaquetesCredito() {
        return ResponseEntity.ok(creditoService.listarPaquetesDisponibles());
    }
}
