package com.asistiapp.backend.controllers;

import com.asistiapp.backend.models.dtos.tanda.TandaRequestDTO;
import com.asistiapp.backend.models.dtos.tanda.TandaResponseDTO;
import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.security.SecurityUtils;
import com.asistiapp.backend.services.TandaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controlador REST para la gestión de Tandas por parte del Organizador.
 *
 * Las tandas están anidadas bajo su evento: /eventos/{eventoId}/tandas
 * Todos los endpoints requieren rol Organizador.
 *
 * Endpoints:
 *   GET    /eventos/{eventoId}/tandas           → Listar tandas del evento
 *   GET    /eventos/{eventoId}/tandas/{id}      → Ver una tanda
 *   POST   /eventos/{eventoId}/tandas           → Crear tanda
 *   PUT    /eventos/{eventoId}/tandas/{id}      → Editar tanda
 *   DELETE /eventos/{eventoId}/tandas/{id}      → Eliminar tanda
 */
@RestController
@RequestMapping("/eventos/{eventoId}/tandas")
@RequiredArgsConstructor
@PreAuthorize("hasRole('Organizador')")
public class TandaController {

    private final TandaService tandaService;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ResponseEntity<List<TandaResponseDTO>> listarTandas(@PathVariable Long eventoId) {
        Organizador org = securityUtils.getOrganizadorAutenticado();
        return ResponseEntity.ok(tandaService.listarTandas(eventoId, org.getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TandaResponseDTO> obtenerTanda(
            @PathVariable Long eventoId,
            @PathVariable Long id) {
        Organizador org = securityUtils.getOrganizadorAutenticado();
        return ResponseEntity.ok(tandaService.obtenerTanda(eventoId, id, org.getId()));
    }

    @PostMapping
    public ResponseEntity<TandaResponseDTO> crearTanda(
            @PathVariable Long eventoId,
            @Valid @RequestBody TandaRequestDTO dto) {
        Organizador org = securityUtils.getOrganizadorAutenticado();
        TandaResponseDTO response = tandaService.crearTanda(eventoId, dto, org.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TandaResponseDTO> actualizarTanda(
            @PathVariable Long eventoId,
            @PathVariable Long id,
            @Valid @RequestBody TandaRequestDTO dto) {
        Organizador org = securityUtils.getOrganizadorAutenticado();
        return ResponseEntity.ok(tandaService.actualizarTanda(eventoId, id, dto, org.getId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarTanda(
            @PathVariable Long eventoId,
            @PathVariable Long id) {
        Organizador org = securityUtils.getOrganizadorAutenticado();
        tandaService.eliminarTanda(eventoId, id, org.getId());
        return ResponseEntity.noContent().build();
    }
}
