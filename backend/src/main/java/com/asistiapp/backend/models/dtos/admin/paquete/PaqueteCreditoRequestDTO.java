package com.asistiapp.backend.models.dtos.admin.paquete;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PaqueteCreditoRequestDTO {

    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 100, message = "El nombre no puede superar los 100 caracteres")
    private String nombre;

    @Positive(message = "La cantidad de créditos debe ser mayor a cero")
    private Integer cantidadCreditos;

    @Positive(message = "El precio debe ser mayor a cero")
    private Double precio;
}
