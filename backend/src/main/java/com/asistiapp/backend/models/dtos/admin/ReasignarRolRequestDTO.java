package com.asistiapp.backend.models.dtos.admin;

import com.asistiapp.backend.models.enums.RolUsuario;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReasignarRolRequestDTO {

    @NotNull(message = "El nuevo rol es obligatorio")
    private RolUsuario nuevoRol;
}
