package com.asistiapp.backend.models.dtos.admin.configuracion;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ActualizarConfiguracionRequestDTO {

    @NotBlank(message = "El valor es obligatorio")
    @Size(max = 500, message = "El valor no puede superar los 500 caracteres")
    private String valor;

    @Size(max = 300, message = "La descripción no puede superar los 300 caracteres")
    private String descripcion;
}
