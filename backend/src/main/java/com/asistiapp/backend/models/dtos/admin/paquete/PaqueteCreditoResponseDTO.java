package com.asistiapp.backend.models.dtos.admin.paquete;

import com.asistiapp.backend.models.enums.EstadoPaquete;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PaqueteCreditoResponseDTO {
    private Long id;
    private String nombre;
    private Integer cantidadCreditos;
    private Double precio;
    private EstadoPaquete estado;
}
