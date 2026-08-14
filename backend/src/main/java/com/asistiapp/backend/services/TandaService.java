package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.ForbiddenActionException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.dtos.tanda.TandaRequestDTO;
import com.asistiapp.backend.models.dtos.tanda.TandaResponseDTO;
import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.entities.Tanda;
import com.asistiapp.backend.models.enums.EstadoEvento;
import com.asistiapp.backend.repositories.EventoRepository;
import com.asistiapp.backend.repositories.TandaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Servicio de gestión de Tandas para el rol Organizador.
 *
 * Reglas de negocio:
 *  - Las tandas solo pueden crearse/editarse si el evento está en Borrador.
 *  - El cupo_disponible se inicializa igual al cupo_maximo (@PrePersist de Tanda).
 *  - Al actualizar cupo_maximo, se ajusta cupo_disponible proporcionalmente.
 *  - El Organizador solo puede gestionar tandas de sus propios eventos.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TandaService {

    private final TandaRepository tandaRepository;
    private final EventoRepository eventoRepository;

    // ─────────────────────────────────────────────
    // Consultas
    // ─────────────────────────────────────────────

    /** Lista todas las tandas de un evento. Verificando que el evento pertenezca al organizador. */
    @Transactional(readOnly = true)
    public List<TandaResponseDTO> listarTandas(Long idEvento, Long idOrganizador) {
        Evento evento = getEventoOrThrow(idEvento);
        verificarPropietario(evento, idOrganizador);
        return tandaRepository.findByEventoId(idEvento)
                .stream()
                .map(this::toResponseDTO)
                .toList();
    }

    /** Retorna una tanda específica. */
    @Transactional(readOnly = true)
    public TandaResponseDTO obtenerTanda(Long idEvento, Long idTanda, Long idOrganizador) {
        Evento evento = getEventoOrThrow(idEvento);
        verificarPropietario(evento, idOrganizador);
        Tanda tanda = getTandaOrThrow(idTanda);
        verificarTandaDelEvento(tanda, idEvento);
        return toResponseDTO(tanda);
    }

    // ─────────────────────────────────────────────
    // Creación
    // ─────────────────────────────────────────────

    /**
     * Crea una nueva Tanda asociada a un Evento en Borrador.
     * El @PrePersist de Tanda inicializa cupo_disponible = cupo_maximo.
     */
    @Transactional
    public TandaResponseDTO crearTanda(Long idEvento, TandaRequestDTO dto, Long idOrganizador) {
        Evento evento = getEventoOrThrow(idEvento);
        verificarPropietario(evento, idOrganizador);
        verificarEventoEditable(evento);

        Tanda tanda = new Tanda();
        tanda.setEvento(evento);
        mapDtoToTanda(dto, tanda);

        Tanda saved = tandaRepository.save(tanda);
        log.info("Tanda creada: id={}, evento={}", saved.getId(), idEvento);
        return toResponseDTO(saved);
    }

    // ─────────────────────────────────────────────
    // Actualización
    // ─────────────────────────────────────────────

    /**
     * Actualiza una Tanda existente.
     * Si se modifica cupo_maximo, se ajusta cupo_disponible:
     *   nuevo_disponible = cupo_disponible + (nuevo_maximo - viejo_maximo)
     * Esto preserva los cupos ya vendidos.
     */
    @Transactional
    public TandaResponseDTO actualizarTanda(Long idEvento, Long idTanda, TandaRequestDTO dto, Long idOrganizador) {
        Evento evento = getEventoOrThrow(idEvento);
        verificarPropietario(evento, idOrganizador);
        verificarEventoEditable(evento);

        Tanda tanda = getTandaOrThrow(idTanda);
        verificarTandaDelEvento(tanda, idEvento);

        // Ajustar cupo_disponible si cambia el cupo_maximo
        int deltaMaximo = dto.getCupoMaximo() - tanda.getCupoMaximo();
        int nuevoCupoDisponible = tanda.getCupoDisponible() + deltaMaximo;

        if (nuevoCupoDisponible < 0) {
            throw new BusinessRuleException(
                    "No podés reducir el cupo máximo por debajo de las entradas ya vendidas. " +
                    "Entradas vendidas: " + (tanda.getCupoMaximo() - tanda.getCupoDisponible()));
        }

        mapDtoToTanda(dto, tanda);
        tanda.setCupoDisponible(nuevoCupoDisponible);

        Tanda saved = tandaRepository.save(tanda);
        log.info("Tanda actualizada: id={}", idTanda);
        return toResponseDTO(saved);
    }

    // ─────────────────────────────────────────────
    // Eliminación
    // ─────────────────────────────────────────────

    /**
     * Elimina una Tanda. Solo posible si el evento está en Borrador
     * y la tanda no tiene entradas vendidas.
     */
    @Transactional
    public void eliminarTanda(Long idEvento, Long idTanda, Long idOrganizador) {
        Evento evento = getEventoOrThrow(idEvento);
        verificarPropietario(evento, idOrganizador);
        verificarEventoEditable(evento);

        Tanda tanda = getTandaOrThrow(idTanda);
        verificarTandaDelEvento(tanda, idEvento);

        int entradasVendidas = tanda.getCupoMaximo() - tanda.getCupoDisponible();
        if (entradasVendidas > 0) {
            throw new BusinessRuleException(
                    "No podés eliminar una tanda con entradas vendidas. " +
                    "Entradas vendidas: " + entradasVendidas);
        }

        tandaRepository.delete(tanda);
        log.info("Tanda eliminada: id={}", idTanda);
    }

    // ─────────────────────────────────────────────
    // Helpers privados
    // ─────────────────────────────────────────────

    private Evento getEventoOrThrow(Long idEvento) {
        return eventoRepository.findById(idEvento)
                .orElseThrow(() -> new ResourceNotFoundException("Evento no encontrado con id: " + idEvento));
    }

    private Tanda getTandaOrThrow(Long idTanda) {
        return tandaRepository.findById(idTanda)
                .orElseThrow(() -> new ResourceNotFoundException("Tanda no encontrada con id: " + idTanda));
    }

    private void verificarPropietario(Evento evento, Long idOrganizador) {
        if (!evento.getIdOrganizador().equals(idOrganizador)) {
            throw new ForbiddenActionException("No tenés permiso para acceder a este evento");
        }
    }

    private void verificarTandaDelEvento(Tanda tanda, Long idEvento) {
        if (!tanda.getEvento().getId().equals(idEvento)) {
            throw new ForbiddenActionException("La tanda no pertenece al evento indicado");
        }
    }

    private void verificarEventoEditable(Evento evento) {
        if (evento.getEstado() != EstadoEvento.Borrador) {
            throw new BusinessRuleException(
                    "Solo podés modificar tandas de un evento en estado Borrador. " +
                    "Estado actual: " + evento.getEstado());
        }
    }

    private void mapDtoToTanda(TandaRequestDTO dto, Tanda tanda) {
        tanda.setNombre(dto.getNombre());
        tanda.setPrecio(dto.getPrecio());
        tanda.setCupoMaximo(dto.getCupoMaximo());
        tanda.setFechaInicioVigencia(dto.getFechaInicioVigencia());
        tanda.setFechaFinVigencia(dto.getFechaFinVigencia());
    }

    public TandaResponseDTO toResponseDTO(Tanda tanda) {
        return TandaResponseDTO.builder()
                .id(tanda.getId())
                .idEvento(tanda.getEvento().getId())
                .nombre(tanda.getNombre())
                .precio(tanda.getPrecio())
                .cupoMaximo(tanda.getCupoMaximo())
                .cupoDisponible(tanda.getCupoDisponible())
                .fechaInicioVigencia(tanda.getFechaInicioVigencia())
                .fechaFinVigencia(tanda.getFechaFinVigencia())
                .build();
    }
}
