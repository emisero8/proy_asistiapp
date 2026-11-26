package com.asistiapp.backend.models.dtos.admin.auditoria;

import com.asistiapp.backend.models.enums.RolUsuario;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class LogAuditoriaResponseDTO {
    private Long id;
    /** Quién hizo la acción (Admin, Organizador o Staff). */
    private Long idEmisor;
    /** Nombre del emisor al momento de la acción. */
    private String emisorNombre;
    /** Rol del emisor al momento de la acción; null si el valor guardado ya no es un rol conocido. */
    private RolUsuario emisorRol;
    private String accion;
    private String entidadAfectada;
    private Long idEntidadAfectada;
    /** Nombre del registro afectado al momento de la acción; null si no aplica o no se conoce. */
    private String entidadNombre;
    /** Texto legible, una línea por dato o cambio (separadas por salto de línea). */
    private String detalle;
    private LocalDateTime fechaHora;
}
