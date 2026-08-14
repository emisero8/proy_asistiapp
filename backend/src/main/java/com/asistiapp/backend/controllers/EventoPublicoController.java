package com.asistiapp.backend.controllers;

import com.asistiapp.backend.models.dtos.publico.EventoPublicoDetalleDTO;
import com.asistiapp.backend.models.dtos.publico.EventoPublicoListItemDTO;
import com.asistiapp.backend.services.EventoPublicoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Catálogo público de eventos — sin autenticación (CU-015, CU-016).
 * El Comprador nunca inicia sesión; ver `SecurityConfig` (permitAll para GET /public/**).
 */
@RestController
@RequestMapping("/public/eventos")
@RequiredArgsConstructor
public class EventoPublicoController {

    private final EventoPublicoService eventoPublicoService;

    @GetMapping
    public ResponseEntity<List<EventoPublicoListItemDTO>> listarPublicados() {
        return ResponseEntity.ok(eventoPublicoService.listarPublicados());
    }

    @GetMapping("/{urlPublica}")
    public ResponseEntity<EventoPublicoDetalleDTO> obtenerDetalle(@PathVariable String urlPublica) {
        return ResponseEntity.ok(eventoPublicoService.obtenerPorUrlPublica(urlPublica));
    }
}
