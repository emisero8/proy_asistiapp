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
    /** Tanda de cortesía: no se vende ni se muestra al público (8.10). */
    private boolean soloEmision;
    private LocalDateTime fechaInicioVigencia;
    private LocalDateTime fechaFinVigencia;

    /**
     * Solo en el detalle público: cargo por procesamiento de pago (Mercado Pago) que se suma por entrada cuando el
     * Organizador traslada la comisión al comprador. 0 si la absorbe; null fuera del detalle público. Lo calcula
     * el backend (CargoServicioMp) para que el checkout muestre exactamente lo que se va a cobrar.
     */
    private Double cargoServicio;
}
