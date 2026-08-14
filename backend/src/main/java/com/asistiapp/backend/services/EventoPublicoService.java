package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.dtos.publico.EventoPublicoDetalleDTO;
import com.asistiapp.backend.models.dtos.publico.EventoPublicoListItemDTO;
import com.asistiapp.backend.models.dtos.tanda.TandaResponseDTO;
import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.entities.Tanda;
import com.asistiapp.backend.models.enums.EstadoEvento;
import com.asistiapp.backend.repositories.EventoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

/**
 * Catálogo público de eventos para el Comprador (CU-015, CU-016).
 * Sin autenticación — el Comprador nunca inicia sesión (ver docs/Trabajo_PP2...).
 * Solo expone eventos en estado Publicado.
 */
@Service
@RequiredArgsConstructor
public class EventoPublicoService {

    private final EventoRepository eventoRepository;

    @Transactional(readOnly = true)
    public List<EventoPublicoListItemDTO> listarPublicados() {
        return eventoRepository.findByEstado(EstadoEvento.Publicado).stream()
                .map(this::toListItemDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public EventoPublicoDetalleDTO obtenerPorUrlPublica(String urlPublica) {
        Evento evento = eventoRepository.findByUrlPublica(urlPublica)
                .orElseThrow(() -> new ResourceNotFoundException("Evento no encontrado"));

        // No exponer eventos en Borrador/Cancelado a través del catálogo público
        if (evento.getEstado() != EstadoEvento.Publicado) {
            throw new ResourceNotFoundException("Evento no encontrado");
        }

        return toDetalleDTO(evento);
    }

    private EventoPublicoListItemDTO toListItemDTO(Evento evento) {
        Double precioDesde = evento.getTandas().stream()
                .map(Tanda::getPrecio)
                .min(Comparator.naturalOrder())
                .orElse(null);

        return EventoPublicoListItemDTO.builder()
                .id(evento.getId())
                .nombre(evento.getNombre())
                .fechaEvento(evento.getFechaEvento())
                .horaEvento(evento.getHoraEvento())
                .lugar(evento.getLugar())
                .imagenPortadaUrl(evento.getImagenPortadaUrl())
                .urlPublica(evento.getUrlPublica())
                .precioDesde(precioDesde)
                .build();
    }

    private EventoPublicoDetalleDTO toDetalleDTO(Evento evento) {
        List<TandaResponseDTO> tandas = evento.getTandas().stream()
                .map(t -> TandaResponseDTO.builder()
                        .id(t.getId())
                        .idEvento(evento.getId())
                        .nombre(t.getNombre())
                        .precio(t.getPrecio())
                        .cupoMaximo(t.getCupoMaximo())
                        .cupoDisponible(t.getCupoDisponible())
                        .fechaInicioVigencia(t.getFechaInicioVigencia())
                        .fechaFinVigencia(t.getFechaFinVigencia())
                        .build())
                .toList();

        return EventoPublicoDetalleDTO.builder()
                .id(evento.getId())
                .nombre(evento.getNombre())
                .descripcion(evento.getDescripcion())
                .fechaEvento(evento.getFechaEvento())
                .horaEvento(evento.getHoraEvento())
                .lugar(evento.getLugar())
                .imagenPortadaUrl(evento.getImagenPortadaUrl())
                .urlPublica(evento.getUrlPublica())
                .tandas(tandas)
                .build();
    }
}
