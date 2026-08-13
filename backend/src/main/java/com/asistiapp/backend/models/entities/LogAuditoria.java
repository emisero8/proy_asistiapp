package com.asistiapp.backend.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Registro de auditoría para acciones administrativas críticas.
 * Se registra automáticamente desde los servicios de Admin (Fase 7).
 * Inmutable: nunca se actualiza, solo se inserta.
 *
 * Ejemplos de acciones auditadas:
 *  - SUSPENDER_USUARIO
 *  - ELIMINAR_EVENTO
 *  - CAMBIAR_ROL
 *  - DESHABILITAR_PAQUETE
 */
@Entity
@Table(name = "log_auditoria")
@Getter
@Setter
@NoArgsConstructor
public class LogAuditoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** ID del Administrador que realizó la acción. */
    @Column(name = "id_admin", nullable = false)
    private Long idAdmin;

    /** Descripción corta de la acción (ej. "SUSPENDER_USUARIO"). */
    @Column(nullable = false, length = 100)
    private String accion;

    /** Nombre de la entidad afectada (ej. "Usuario", "Evento"). */
    @Column(name = "entidad_afectada", nullable = false, length = 50)
    private String entidadAfectada;

    /** ID del registro afectado. */
    @Column(name = "id_entidad_afectada", nullable = false)
    private Long idEntidadAfectada;

    /** Detalle adicional o descripción legible del cambio. */
    @Column(columnDefinition = "TEXT")
    private String detalle;

    @Column(name = "fecha_hora", nullable = false, updatable = false)
    private LocalDateTime fechaHora;

    @PrePersist
    protected void onCreate() {
        this.fechaHora = LocalDateTime.now();
    }
}
