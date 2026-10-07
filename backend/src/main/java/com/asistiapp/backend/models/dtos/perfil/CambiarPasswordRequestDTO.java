package com.asistiapp.backend.models.dtos.perfil;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Cambio de contraseña del propio usuario: exige la actual para poder cambiarla. */
@Getter
@Setter
@NoArgsConstructor
public class CambiarPasswordRequestDTO {

    @NotBlank(message = "Ingresá tu contraseña actual")
    private String passwordActual;

    @NotBlank(message = "Ingresá la nueva contraseña")
    @Size(min = 8, max = 100, message = "La nueva contraseña debe tener entre 8 y 100 caracteres")
    private String passwordNueva;
}
