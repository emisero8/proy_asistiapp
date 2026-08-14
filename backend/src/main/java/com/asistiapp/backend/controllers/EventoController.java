package com.asistiapp.backend.controllers;

import com.asistiapp.backend.models.dtos.evento.EventoRequestDTO;
import com.asistiapp.backend.models.dtos.evento.EventoResponseDTO;
import com.asistiapp.backend.models.dtos.metricas.EventoMetricasResponseDTO;
import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.security.SecurityUtils;
import com.asistiapp.backend.services.EventoService;
import com.asistiapp.backend.services.MetricasOrganizadorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controlador REST para la gestión de Eventos por parte del Organizador.
 *
 * Todos los endpoints requieren rol Organizador.
 * El ID del organizador se extrae automáticamente del JWT — nunca se expone en la URL.
 *
 * Endpoints:
 *   GET    /eventos              → Listar mis eventos
 *   GET    /eventos/{id}         → Ver un evento
 *   POST   /eventos              → Crear evento (Borrador)
 *   PUT    /eventos/{id}         → Editar evento (solo Borrador)
 *   PATCH  /eventos/{id}/publicar → Publicar evento (consume 1 crédito)
 *   PATCH  /eventos/{id}/cancelar → Cancelar evento
 */
@RestController
@RequestMapping("/eventos")
@RequiredArgsConstructor
@PreAuthorize("hasRole('Organizador')")
public class EventoController {

    private final EventoService eventoService;
    private final MetricasOrganizadorService metricasOrganizadorService;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ResponseEntity<List<EventoResponseDTO>> listarMisEventos() {
        Organizador org = securityUtils.getOrganizadorAutenticado();
        return ResponseEntity.ok(eventoService.listarMisEventos(org.getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EventoResponseDTO> obtenerEvento(@PathVariable Long id) {
        Organizador org = securityUtils.getOrganizadorAutenticado();
        return ResponseEntity.ok(eventoService.obtenerEvento(id, org.getId()));
    }

    @PostMapping
    public ResponseEntity<EventoResponseDTO> crearEvento(@Valid @RequestBody EventoRequestDTO dto) {
        Organizador org = securityUtils.getOrganizadorAutenticado();
        EventoResponseDTO response = eventoService.crearEvento(dto, org.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<EventoResponseDTO> actualizarEvento(
            @PathVariable Long id,
            @Valid @RequestBody EventoRequestDTO dto) {
        Organizador org = securityUtils.getOrganizadorAutenticado();
        return ResponseEntity.ok(eventoService.actualizarEvento(id, dto, org.getId()));
    }

    @PatchMapping("/{id}/publicar")
    public ResponseEntity<EventoResponseDTO> publicarEvento(@PathVariable Long id) {
        Organizador org = securityUtils.getOrganizadorAutenticado();
        return ResponseEntity.ok(eventoService.publicarEvento(id, org.getId()));
    }

    @PatchMapping("/{id}/cancelar")
    public ResponseEntity<EventoResponseDTO> cancelarEvento(@PathVariable Long id) {
        Organizador org = securityUtils.getOrganizadorAutenticado();
        return ResponseEntity.ok(eventoService.cancelarEvento(id, org.getId()));
    }

    /** Dashboard en tiempo real del evento: vendidas, ingresos, aforo (CU-012). */
    @GetMapping("/{id}/metricas")
    public ResponseEntity<EventoMetricasResponseDTO> obtenerMetricas(@PathVariable Long id) {
        Organizador org = securityUtils.getOrganizadorAutenticado();
        return ResponseEntity.ok(metricasOrganizadorService.obtenerMetricas(id, org.getId()));
    }
}
