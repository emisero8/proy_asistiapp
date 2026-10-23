package com.asistiapp.backend.models.entities;

import com.asistiapp.backend.models.enums.OrigenNotificacion;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Notificación in-app dirigida a un único usuario (Organizador, Staff o Administrador —
 * el Comprador nunca inicia sesión, así que no es destinatario posible).
 *
 * Un anuncio "global" del Admin (CU-027/028 extendido) no es una fila compartida: se
 * materializa una fila por destinatario al crearlo (ver NotificacionService.crearGlobal),
 * para que marcar "leída" sea siempre una operación simple sobre la propia fila del
 * usuario, sin una tabla de lecturas aparte.
 */
@Entity
@Table(name = "notificaciones")
@Getter
@Setter
@NoArgsConstructor
public class Notificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "id_usuario_destino", nullable = false)
    private Long idUsuarioDestino;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrigenNotificacion origen;

    @Column(nullable = false, length = 150)
    private String titulo;

    @Column(nullable = false, length = 1000)
    private String mensaje;

    @Column(nullable = false)
    private boolean leida;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    /** Entidad relacionada opcional (ej. "Evento", "TransaccionCredito") para que el frontend pueda linkear. */
    @Column(name = "tipo_entidad_relacionada", length = 50)
    private String tipoEntidadRelacionada;

    @Column(name = "id_entidad_relacionada")
    private Long idEntidadRelacionada;

    @PrePersist
    protected void onCreate() {
        this.fechaCreacion = LocalDateTime.now();
        this.leida = false;
    }
}
