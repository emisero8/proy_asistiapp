package com.asistiapp.backend.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Registro de auditoría de las acciones que cambian datos: las del Administrador (Fase 7) y,
 * desde el 2026-11-25, también las del Organizador y su Staff. Lo escribe AuditoriaAspect
 * en cada método @Auditable que termina bien. Inmutable: nunca se actualiza, solo se inserta.
 *
 * Ejemplos: SUSPENDER_USUARIO (Admin), PUBLICAR_EVENTO (Organizador), VENTA_MANUAL (Staff
 * Vendedor), VALIDAR_ENTRADA (Staff QR).
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

    /** ID del usuario que realizó la acción (Admin, Organizador o Staff). Columna antes llamada id_admin. */
    @Column(name = "id_emisor", nullable = false)
    private Long idEmisor;

    /**
     * Nombre del emisor al momento de la acción (foto: no cambia si después se renombra o se
     * borra la cuenta).
     */
    @Column(name = "emisor_nombre", length = 150)
    private String emisorNombre;

    /**
     * Rol del emisor (nombre de RolUsuario). Texto y no enum de JPA a propósito: un rol nuevo
     * no necesita migrar un CHECK de esta tabla.
     */
    @Column(name = "emisor_rol", length = 30)
    private String emisorRol;

    /** Descripción corta de la acción (ej. "SUSPENDER_USUARIO"). */
    @Column(nullable = false, length = 100)
    private String accion;

    /** Nombre de la entidad afectada (ej. "Usuario", "Evento"). */
    @Column(name = "entidad_afectada", nullable = false, length = 50)
    private String entidadAfectada;

    /**
     * ID del registro afectado. Nullable: una acción de alcance global (ej. un anuncio a
     * todos los usuarios) no tiene una única entidad afectada — AuditoriaAspect no
     * encuentra ningún Long entre los argumentos ni en el valor de retorno.
     */
    @Column(name = "id_entidad_afectada")
    private Long idEntidadAfectada;

    /**
     * Nombre legible del registro afectado al momento de la acción (ej. el nombre del
     * usuario o del evento). Es una foto: sigue diciendo quién era aunque el registro se
     * haya eliminado. Null si no aplica o en filas viejas que no se pudieron completar.
     */
    @Column(name = "entidad_nombre", length = 300)
    private String entidadNombre;

    /**
     * Qué pasó, en lenguaje natural, una línea por dato o cambio ("Precio: $1.000 → $1.500").
     * Las filas anteriores al 2026-11-25 pueden tener el formato técnico viejo.
     */
    @Column(columnDefinition = "TEXT")
    private String detalle;

    @Column(name = "fecha_hora", nullable = false, updatable = false)
    private LocalDateTime fechaHora;

    @PrePersist
    protected void onCreate() {
        this.fechaHora = LocalDateTime.now();
    }
}
