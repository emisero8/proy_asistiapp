package com.asistiapp.backend.models.dtos.tanda;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * DTO de respuesta para una Tanda.
 * Expone cupoDisponible para que el frontend pueda mostrar disponibilidad en tiempo real.
 */
@Getter
@Setter
@Builder
public class TandaResponseDTO {

    private Long id;
    private Long idEvento;
    private String nombre;
    private Double precio;
    private Integer cupoMaximo;
    private Integer cupoDisponible;
    private LocalDateTime fechaInicioVigencia;
    private LocalDateTime fechaFinVigencia;
}
