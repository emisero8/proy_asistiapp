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

    // Solo presentes cuando rol = Staff_Vendedor (8.3).
    /** Máximo de entradas que puede vender; null = vendedor anterior a la regla, sin tope. */
    private Integer topeEntradas;
    private Integer entradasVendidas;
    /** Suma de lo que valen las entradas que vendió, para que el Organizador le pida la rendición. */
    private Double totalRecaudado;
}
