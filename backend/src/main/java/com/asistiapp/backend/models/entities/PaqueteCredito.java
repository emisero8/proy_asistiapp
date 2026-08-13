package com.asistiapp.backend.models.entities;

import com.asistiapp.backend.models.enums.EstadoPaquete;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Paquete de créditos que un Organizador puede comprar para publicar eventos.
 * Ejemplos: Starter (10 créditos), Pro (50 créditos), Studio (120 créditos).
 * El Admin gestiona estos paquetes desde el backoffice (Fase 7).
 */
@Entity
@Table(name = "paquetes_credito")
@Getter
@Setter
@NoArgsConstructor
public class PaqueteCredito {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(name = "cantidad_creditos", nullable = false)
    private Integer cantidadCreditos;

    @Column(nullable = false)
    private Double precio;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoPaquete estado;

    @PrePersist
    protected void onCreate() {
        if (this.estado == null) {
            this.estado = EstadoPaquete.Activo;
        }
    }
}
