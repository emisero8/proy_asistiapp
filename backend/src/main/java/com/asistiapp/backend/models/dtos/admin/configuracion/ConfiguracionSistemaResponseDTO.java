package com.asistiapp.backend.models.dtos.admin.configuracion;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ConfiguracionSistemaResponseDTO {
    private Long id;
    private String clave;
    private String valor;
    private String descripcion;
    private LocalDateTime fechaActualizacion;
    private Long idAdministrador;
}
