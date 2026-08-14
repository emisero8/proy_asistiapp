package com.asistiapp.backend.models.entities;

import com.asistiapp.backend.models.enums.EstadoEvento;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Representa un evento creado por un Organizador.
 * Ciclo de vida: Borrador → Publicado (consume créditos) → Cancelado.
 * CU-007, CU-010.
 */
@Entity
@Table(name = "eventos")
@Getter
@Setter
@NoArgsConstructor
public class Evento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** FK al Organizador dueño del evento. */
    @Column(name = "id_organizador", nullable = false)
    private Long idOrganizador;

    @Column(nullable = false, length = 200)
    private String nombre;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "fecha_evento", nullable = false)
    private LocalDate fechaEvento;

    @Column(name = "hora_evento", nullable = false)
    private LocalTime horaEvento;

    @Column(nullable = false, length = 300)
    private String lugar;

    @Column(name = "imagen_portada_url", length = 500)
    private String imagenPortadaUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoEvento estado;

    /**
     * URL pública para la página de venta del evento (compradores).
     * Se genera al publicar el evento.
     */
    @Column(name = "url_publica", unique = true, length = 300)
    private String urlPublica;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    /** Se completa al publicar el evento (EventoService.publicarEvento). */
    @Column(name = "fecha_publicacion")
    private LocalDateTime fechaPublicacion;

    /** Se completa al cancelar el evento (EventoService.cancelarEvento). */
    @Column(name = "fecha_cancelacion")
    private LocalDateTime fechaCancelacion;

    /** Relación 1:N con Tandas. CascadeType.ALL para gestión completa. */
    @OneToMany(mappedBy = "evento", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Tanda> tandas = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.fechaCreacion = LocalDateTime.now();
        if (this.estado == null) {
            this.estado = EstadoEvento.Borrador;
        }
    }
}
