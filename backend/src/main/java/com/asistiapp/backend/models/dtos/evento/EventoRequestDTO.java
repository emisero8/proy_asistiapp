package com.asistiapp.backend.models.dtos.evento;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * DTO para crear o actualizar un Evento.
 * Solo se usa en estado Borrador (CU-007).
 */
@Getter
@Setter
public class EventoRequestDTO {

    @NotBlank(message = "El nombre del evento es obligatorio")
    @Size(max = 200, message = "El nombre no puede superar los 200 caracteres")
    private String nombre;

    @Size(max = 5000, message = "La descripción no puede superar los 5000 caracteres")
    private String descripcion;

    @NotNull(message = "La fecha del evento es obligatoria")
    @FutureOrPresent(message = "La fecha del evento no puede ser en el pasado")
    private LocalDate fechaEvento;

    @NotNull(message = "La hora del evento es obligatoria")
    private LocalTime horaEvento;

    @NotBlank(message = "El lugar del evento es obligatorio")
    @Size(max = 300, message = "El lugar no puede superar los 300 caracteres")
    private String lugar;

    /** URL de imagen de portada — opcional al crear, se puede agregar luego. */
    @Size(max = 500, message = "La URL de la imagen no puede superar los 500 caracteres")
    private String imagenPortadaUrl;
}
