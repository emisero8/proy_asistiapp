package com.asistiapp.backend.controllers.admin;

import com.asistiapp.backend.models.dtos.admin.notificacion.AnuncioEnviadoResponseDTO;
import com.asistiapp.backend.models.dtos.admin.notificacion.CrearAnuncioRequestDTO;
import com.asistiapp.backend.services.NotificacionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Anuncios globales del Admin, entregados como notificación in-app a todos los usuarios activos. */
@RestController
@RequestMapping("/admin/notificaciones")
@RequiredArgsConstructor
@PreAuthorize("hasRole('Administrador')")
public class AdminNotificacionController {

    private final NotificacionService notificacionService;

    @PostMapping
    public ResponseEntity<AnuncioEnviadoResponseDTO> crearAnuncio(@Valid @RequestBody CrearAnuncioRequestDTO dto) {
        int enviadas = notificacionService.crearGlobal(dto.getTitulo(), dto.getMensaje());
        return ResponseEntity.ok(AnuncioEnviadoResponseDTO.builder().enviadas(enviadas).build());
    }
}
