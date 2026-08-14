package com.asistiapp.backend.models.dtos.admin.auditoria;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class LogAuditoriaResponseDTO {
    private Long id;
    private Long idAdmin;
    private String accion;
    private String entidadAfectada;
    private Long idEntidadAfectada;
    private String detalle;
    private LocalDateTime fechaHora;
}
