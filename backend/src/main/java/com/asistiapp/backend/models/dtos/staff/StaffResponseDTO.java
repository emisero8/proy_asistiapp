package com.asistiapp.backend.models.dtos.staff;

import com.asistiapp.backend.models.enums.EstadoUsuario;
import com.asistiapp.backend.models.enums.RolUsuario;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class StaffResponseDTO {
    private Long id;
    private String nombre;
    private String email;
    private RolUsuario rol;
    private EstadoUsuario estado;

    /** Solo presente cuando rol = Staff_QR. */
    private Long idEvento;
}
