package com.asistiapp.backend.services.admin;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.dtos.evento.EventoRequestDTO;
import com.asistiapp.backend.models.dtos.evento.EventoResponseDTO;
import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.enums.EstadoEvento;
import com.asistiapp.backend.repositories.EntradaRepository;
import com.asistiapp.backend.repositories.EventoRepository;
import com.asistiapp.backend.security.audit.Auditable;
import com.asistiapp.backend.services.EventoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Gestión administrativa de eventos (CU-023, CU-024, CU-025).
 * A diferencia de EventoService (que valida propiedad y restringe estados
 * según el flujo del Organizador), acá el Admin puede editar/cancelar/eliminar
 * cualquier evento del sistema.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminEventoService {

    private final EventoRepository eventoRepository;
    private final EntradaRepository entradaRepository;
    private final EventoService eventoService;

    @Transactional(readOnly = true)
    public List<EventoResponseDTO> listarTodos() {
        return eventoRepository.findAll().stream()
                .map(eventoService::toResponseDTO)
                .toList();
    }

    @Transactional
    @Auditable(accion = "EDITAR_EVENTO_ADMIN", entidad = "Evento")
    public EventoResponseDTO editarEvento(Long idEvento, EventoRequestDTO dto) {
        Evento evento = getEventoOrThrow(idEvento);

        evento.setNombre(dto.getNombre());
        evento.setDescripcion(dto.getDescripcion());
        evento.setFechaEvento(dto.getFechaEvento());
        evento.setHoraEvento(dto.getHoraEvento());
        evento.setLugar(dto.getLugar());
        evento.setImagenPortadaUrl(dto.getImagenPortadaUrl());

        Evento saved = eventoRepository.save(evento);
        log.info("Evento editado por Admin: id={}", idEvento);
        return eventoService.toResponseDTO(saved);
    }

    @Transactional
    @Auditable(accion = "CANCELAR_EVENTO_ADMIN", entidad = "Evento")
    public EventoResponseDTO cancelarEvento(Long idEvento) {
        Evento evento = getEventoOrThrow(idEvento);

        if (evento.getEstado() == EstadoEvento.Cancelado) {
            throw new BusinessRuleException("El evento ya está cancelado");
        }

        evento.setEstado(EstadoEvento.Cancelado);
        evento.setFechaCancelacion(LocalDateTime.now());
        Evento saved = eventoRepository.save(evento);
        eventoService.notificarCancelacionACompradores(saved);
        log.info("Evento cancelado por Admin: id={}", idEvento);
        return eventoService.toResponseDTO(saved);
    }

    /** Bloquea la eliminación si el evento ya tiene entradas vendidas — cancelarlo es la vía correcta en ese caso. */
    @Transactional
    @Auditable(accion = "ELIMINAR_EVENTO_ADMIN", entidad = "Evento")
    public void eliminarEvento(Long idEvento) {
        Evento evento = getEventoOrThrow(idEvento);

        if (entradaRepository.countByEventoId(idEvento) > 0) {
            throw new BusinessRuleException(
                    "No se puede eliminar un evento con entradas vendidas. Cancelalo en su lugar.");
        }

        eventoRepository.delete(evento);
        log.info("Evento eliminado por Admin: id={}", idEvento);
    }

    private Evento getEventoOrThrow(Long idEvento) {
        return eventoRepository.findById(idEvento)
                .orElseThrow(() -> new ResourceNotFoundException("Evento no encontrado con id: " + idEvento));
    }
}
