package com.asistiapp.backend.models.dtos.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/** El Administrador fija una contraseña nueva para un usuario que perdió el acceso. */
@Getter
@Setter
public class CambiarPasswordRequestDTO {

    @NotBlank(message = "La nueva contraseña es obligatoria")
    @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
    private String nuevaPassword;
}
