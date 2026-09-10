package com.asistiapp.backend.services.admin;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.dtos.evento.EventoRequestDTO;
import com.asistiapp.backend.models.dtos.evento.EventoResponseDTO;
import com.asistiapp.backend.models.dtos.tanda.TandaRequestDTO;
import com.asistiapp.backend.models.dtos.tanda.TandaResponseDTO;
import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.enums.EstadoEvento;
import com.asistiapp.backend.repositories.EntradaRepository;
import com.asistiapp.backend.repositories.EventoRepository;
import com.asistiapp.backend.security.audit.Auditable;
import com.asistiapp.backend.services.EventoService;
import com.asistiapp.backend.services.TandaService;
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
    private final TandaService tandaService;

    @Transactional(readOnly = true)
    public EventoResponseDTO obtenerEvento(Long idEvento) {
        return eventoService.toResponseDTO(getEventoOrThrow(idEvento));
    }

    @Transactional(readOnly = true)
    public List<EventoResponseDTO> listarTodos() {
        return eventoRepository.findAll().stream()
                .map(eventoService::toResponseDTO)
                .toList();
    }

    /**
     * El Admin edita cualquier evento del sistema. Se delega en EventoService /
     * TandaService pasando el organizador dueño del evento como actor, de modo
     * que aplican exactamente las mismas reglas de negocio que ve el
     * Organizador (ventana de venta de tandas, cupo vendido, etc.).
     */
    @Transactional
    @Auditable(accion = "EDITAR_EVENTO_ADMIN", entidad = "Evento")
    public EventoResponseDTO editarEvento(Long idEvento, EventoRequestDTO dto) {
        Evento evento = getEventoOrThrow(idEvento);
        return eventoService.actualizarEvento(idEvento, dto, evento.getIdOrganizador());
    }

    @Transactional
    @Auditable(accion = "CREAR_TANDA_ADMIN", entidad = "Tanda")
    public TandaResponseDTO crearTanda(Long idEvento, TandaRequestDTO dto) {
        Evento evento = getEventoOrThrow(idEvento);
        return tandaService.crearTanda(idEvento, dto, evento.getIdOrganizador());
    }

    @Transactional
    @Auditable(accion = "EDITAR_TANDA_ADMIN", entidad = "Tanda")
    public TandaResponseDTO actualizarTanda(Long idEvento, Long idTanda, TandaRequestDTO dto) {
        Evento evento = getEventoOrThrow(idEvento);
        return tandaService.actualizarTanda(idEvento, idTanda, dto, evento.getIdOrganizador());
    }

    @Transactional
    @Auditable(accion = "ELIMINAR_TANDA_ADMIN", entidad = "Tanda")
    public void eliminarTanda(Long idEvento, Long idTanda) {
        Evento evento = getEventoOrThrow(idEvento);
        tandaService.eliminarTanda(idEvento, idTanda, evento.getIdOrganizador());
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
