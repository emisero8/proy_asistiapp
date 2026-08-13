package com.asistiapp.backend.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Tanda (lote/tipo de entrada) dentro de un Evento.
 *
 * CAMPO CRÍTICO: cupo_disponible
 * Este campo es el corazón del control de inventario.
 * Toda modificación debe ocurrir dentro de una transacción con
 * bloqueo pesimista (@Lock) para evitar sobreventa (overselling).
 * Ver: EntradaService (Fase 5).
 */
@Entity
@Table(name = "tandas")
@Getter
@Setter
@NoArgsConstructor
public class Tanda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Relación N:1 con Evento. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_evento", nullable = false)
    private Evento evento;

    @Column(nullable = false, length = 150)
    private String nombre;

    @Column(nullable = false)
    private Double precio;

    @Column(name = "cupo_maximo", nullable = false)
    private Integer cupoMaximo;

    /**
     * Cupo restante disponible para la venta.
     * NUNCA modificar directamente fuera del servicio de ventas.
     * Usar siempre la query de actualización atómica provista en TandaRepository.
     */
    @Column(name = "cupo_disponible", nullable = false)
    private Integer cupoDisponible;

    @Column(name = "fecha_inicio_vigencia")
    private LocalDateTime fechaInicioVigencia;

    @Column(name = "fecha_fin_vigencia")
    private LocalDateTime fechaFinVigencia;

    /** Entradas vendidas en esta tanda. */
    @OneToMany(mappedBy = "tanda", cascade = CascadeType.ALL)
    private List<Entrada> entradas = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        // Al crear la tanda, el cupo disponible arranca igual al máximo
        if (this.cupoDisponible == null && this.cupoMaximo != null) {
            this.cupoDisponible = this.cupoMaximo;
        }
    }
}
