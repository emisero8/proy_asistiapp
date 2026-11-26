package com.asistiapp.backend.models.dtos.evento;

import com.asistiapp.backend.models.dtos.tanda.TandaResponseDTO;
import com.asistiapp.backend.models.enums.EstadoEvento;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * DTO de respuesta para un Evento.
 * Incluye las tandas del evento para evitar una segunda petición al cliente.
 */
@Getter
@Setter
@Builder
public class EventoResponseDTO {

    private Long id;
    private Long idOrganizador;
    private String nombre;
    private String descripcion;
    private LocalDate fechaEvento;
    private LocalTime horaEvento;
    private String lugar;
    private Double latitud;
    private Double longitud;
    private String imagenPortadaUrl;
    private EstadoEvento estado;
    private String urlPublica;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaPublicacion;
    private LocalDateTime fechaCancelacion;

    /** Llegó la hora de inicio (Evento.yaComenzo): publicado así, el Organizador ya no lo puede cancelar. */
    private boolean comenzado;

    /** Pasaron las horas de gracia desde el inicio (Evento.yaFinalizo): publicado así, es solo historial. */
    private boolean finalizado;

    /** Lista de tandas del evento. Vacía si el evento aún no tiene tandas. */
    private List<TandaResponseDTO> tandas;
}
