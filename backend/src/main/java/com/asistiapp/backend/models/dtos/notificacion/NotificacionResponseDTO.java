package com.asistiapp.backend.models.dtos.notificacion;

import com.asistiapp.backend.models.enums.OrigenNotificacion;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class NotificacionResponseDTO {
    private Long id;
    private OrigenNotificacion origen;
    private String titulo;
    private String mensaje;
    private boolean leida;
    private LocalDateTime fechaCreacion;
    private String tipoEntidadRelacionada;
    private Long idEntidadRelacionada;
}
