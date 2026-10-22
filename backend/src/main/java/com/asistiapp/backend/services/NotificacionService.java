package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.ForbiddenActionException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.dtos.notificacion.NotificacionResponseDTO;
import com.asistiapp.backend.models.entities.Notificacion;
import com.asistiapp.backend.models.entities.Usuario;
import com.asistiapp.backend.models.enums.EstadoUsuario;
import com.asistiapp.backend.models.enums.OrigenNotificacion;
import com.asistiapp.backend.repositories.NotificacionRepository;
import com.asistiapp.backend.repositories.UsuarioRepository;
import com.asistiapp.backend.security.audit.Auditable;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Centro de notificaciones in-app. Dos orígenes posibles:
 *  - Sistema: la dispara otro servicio del backend ante un evento de negocio
 *    (ej. Admin cancela un evento, se reembolsa una compra de créditos).
 *  - Admin: un anuncio manual, dirigido a todos los usuarios activos.
 *
 * No hay un canal de "notificaciones al Comprador" — nunca inicia sesión,
 * así que no tiene dónde leerlas (sigue recibiendo mail, vía EmailService).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificacionService {

    private final NotificacionRepository notificacionRepository;
    private final UsuarioRepository usuarioRepository;

    /** Notificación individual, disparada por otro servicio ante un evento de negocio. */
    @Transactional
    public void crear(Long idUsuarioDestino, String titulo, String mensaje,
                       String tipoEntidadRelacionada, Long idEntidadRelacionada) {
        Notificacion notificacion = new Notificacion();
        notificacion.setIdUsuarioDestino(idUsuarioDestino);
        notificacion.setOrigen(OrigenNotificacion.Sistema);
        notificacion.setTitulo(titulo);
        notificacion.setMensaje(mensaje);
        notificacion.setTipoEntidadRelacionada(tipoEntidadRelacionada);
        notificacion.setIdEntidadRelacionada(idEntidadRelacionada);
        notificacionRepository.save(notificacion);
    }

    /**
     * Anuncio del Admin a todos los usuarios activos (cualquier rol logueado). Se
     * materializa una fila por destinatario al crearlo, no una fila compartida —
     * así "marcar leída" es siempre una operación simple sobre la propia fila.
     *
     * @return cuántos usuarios la recibieron.
     */
    @Transactional
    @Auditable(accion = "CREAR_ANUNCIO_GLOBAL", entidad = "Notificacion")
    public int crearGlobal(String titulo, String mensaje) {
        List<Usuario> destinatarios = usuarioRepository.findByEstado(EstadoUsuario.Activo);
        List<Notificacion> lote = destinatarios.stream().map(usuario -> {
            Notificacion notificacion = new Notificacion();
            notificacion.setIdUsuarioDestino(usuario.getId());
            notificacion.setOrigen(OrigenNotificacion.Admin);
            notificacion.setTitulo(titulo);
            notificacion.setMensaje(mensaje);
            return notificacion;
        }).toList();
        notificacionRepository.saveAll(lote);
        log.info("Anuncio global creado: '{}' enviado a {} usuarios", titulo, lote.size());
        return lote.size();
    }

    @Transactional(readOnly = true)
    public List<NotificacionResponseDTO> listarParaUsuario(Long idUsuario) {
        return notificacionRepository.findByIdUsuarioDestinoOrderByFechaCreacionDesc(idUsuario).stream()
                .map(this::toResponseDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public long contarNoLeidas(Long idUsuario) {
        return notificacionRepository.countByIdUsuarioDestinoAndLeidaFalse(idUsuario);
    }

    @Transactional
    public void marcarLeida(Long idNotificacion, Long idUsuario) {
        Notificacion notificacion = notificacionRepository.findById(idNotificacion)
                .orElseThrow(() -> new ResourceNotFoundException("Notificación no encontrada con id: " + idNotificacion));
        if (!notificacion.getIdUsuarioDestino().equals(idUsuario)) {
            throw new ForbiddenActionException("Esta notificación no te pertenece");
        }
        notificacion.setLeida(true);
        notificacionRepository.save(notificacion);
    }

    @Transactional
    public void marcarTodasLeidas(Long idUsuario) {
        List<Notificacion> pendientes = notificacionRepository.findByIdUsuarioDestinoAndLeidaFalse(idUsuario);
        pendientes.forEach(n -> n.setLeida(true));
        notificacionRepository.saveAll(pendientes);
    }

    private NotificacionResponseDTO toResponseDTO(Notificacion notificacion) {
        return NotificacionResponseDTO.builder()
                .id(notificacion.getId())
                .origen(notificacion.getOrigen())
                .titulo(notificacion.getTitulo())
                .mensaje(notificacion.getMensaje())
                .leida(notificacion.isLeida())
                .fechaCreacion(notificacion.getFechaCreacion())
                .tipoEntidadRelacionada(notificacion.getTipoEntidadRelacionada())
                .idEntidadRelacionada(notificacion.getIdEntidadRelacionada())
                .build();
    }
}
