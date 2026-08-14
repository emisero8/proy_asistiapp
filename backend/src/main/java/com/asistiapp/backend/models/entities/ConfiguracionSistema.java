package com.asistiapp.backend.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Tabla clave/valor genérica para configuraciones globales del sistema
 * ajustables por el Admin sin recompilar (CU-028) — ej. créditos de
 * bienvenida, costo en créditos de publicar un evento.
 */
@Entity
@Table(name = "configuraciones_sistema")
@Getter
@Setter
@NoArgsConstructor
public class ConfiguracionSistema {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String clave;

    @Column(nullable = false, length = 500)
    private String valor;

    @Column(length = 300)
    private String descripcion;

    @Column(name = "fecha_actualizacion", nullable = false)
    private LocalDateTime fechaActualizacion;

    /** Administrador que hizo el último cambio. */
    @Column(name = "id_administrador")
    private Long idAdministrador;

    @PrePersist
    @PreUpdate
    protected void onSave() {
        this.fechaActualizacion = LocalDateTime.now();
    }
}
