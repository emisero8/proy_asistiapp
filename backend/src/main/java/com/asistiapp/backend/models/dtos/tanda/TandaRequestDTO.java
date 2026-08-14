package com.asistiapp.backend.models.dtos.tanda;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * DTO para crear o actualizar una Tanda.
 * El cupo_disponible se inicializa automáticamente igual al cupo_maximo
 * en el @PrePersist de la entidad Tanda — no se expone en el request.
 */
@Getter
@Setter
public class TandaRequestDTO {

    @NotBlank(message = "El nombre de la tanda es obligatorio")
    @Size(max = 150, message = "El nombre no puede superar los 150 caracteres")
    private String nombre;

    @NotNull(message = "El precio es obligatorio")
    @DecimalMin(value = "0.0", inclusive = true, message = "El precio no puede ser negativo")
    private Double precio;

    @NotNull(message = "El cupo máximo es obligatorio")
    @Min(value = 1, message = "El cupo máximo debe ser al menos 1")
    private Integer cupoMaximo;

    /** Fecha desde la cual la tanda está disponible para venta. Opcional. */
    private LocalDateTime fechaInicioVigencia;

    /** Fecha hasta la cual la tanda está disponible para venta. Opcional. */
    private LocalDateTime fechaFinVigencia;
}
