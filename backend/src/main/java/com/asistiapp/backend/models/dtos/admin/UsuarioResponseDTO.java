package com.asistiapp.backend.models.dtos.admin;

import com.asistiapp.backend.models.enums.EstadoUsuario;
import com.asistiapp.backend.models.enums.RolUsuario;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class UsuarioResponseDTO {
    private Long id;
    private String nombre;
    private String email;
    private RolUsuario rol;
    private EstadoUsuario estado;
    private LocalDateTime fechaCreacion;
}
