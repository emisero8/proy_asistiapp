package com.asistiapp.backend.controllers;

import com.asistiapp.backend.models.dtos.notificacion.NotificacionResponseDTO;
import com.asistiapp.backend.security.SecurityUtils;
import com.asistiapp.backend.services.NotificacionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Centro de notificaciones in-app, para cualquier rol logueado (el Comprador nunca lo está). */
@RestController
@RequestMapping("/notificaciones")
@RequiredArgsConstructor
public class NotificacionController {

    private final NotificacionService notificacionService;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ResponseEntity<List<NotificacionResponseDTO>> listar() {
        return ResponseEntity.ok(notificacionService.listarParaUsuario(securityUtils.getIdUsuarioAutenticado()));
    }

    @GetMapping("/no-leidas/cantidad")
    public ResponseEntity<Map<String, Long>> contarNoLeidas() {
        return ResponseEntity.ok(Map.of("cantidad", notificacionService.contarNoLeidas(securityUtils.getIdUsuarioAutenticado())));
    }

    @PatchMapping("/{id}/leer")
    public ResponseEntity<Void> marcarLeida(@PathVariable Long id) {
        notificacionService.marcarLeida(id, securityUtils.getIdUsuarioAutenticado());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/leer-todas")
    public ResponseEntity<Void> marcarTodasLeidas() {
        notificacionService.marcarTodasLeidas(securityUtils.getIdUsuarioAutenticado());
        return ResponseEntity.noContent().build();
    }
}
