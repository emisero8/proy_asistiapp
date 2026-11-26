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

    /** Coordenadas del lugar para mostrarlo en el mapa (opcional). */
    @Column(name = "latitud")
    private Double latitud;

    @Column(name = "longitud")
    private Double longitud;

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

    /** Un evento no tiene hora de fin: se da por finalizado pasadas estas horas desde que empieza. */
    public static final int HORAS_HASTA_FINALIZAR = 12;

    /** Llegó (o pasó) la fecha y hora de inicio. Un evento sin fecha u hora todavía no comenzó. */
    public boolean yaComenzo() {
        return pasaron(0);
    }

    /**
     * Pasaron {@value #HORAS_HASTA_FINALIZAR} horas desde el inicio. Única definición de "finalizado": el
     * frontend no la recalcula, la recibe en los DTO. Hasta entonces se siguen vendiendo y emitiendo
     * entradas, el evento está en el catálogo y el escáner valida.
     */
    public boolean yaFinalizo() {
        return pasaron(HORAS_HASTA_FINALIZAR);
    }

    /**
     * Un evento Publicado que finalizó es historial: no se edita, no se cancela, no se tocan sus tandas
     * ni se devuelven créditos. (Un Borrador con fecha vieja sigue editable: todavía no ocurrió.)
     */
    public boolean estaCerrado() {
        return estado == EstadoEvento.Publicado && yaFinalizo();
    }

    /** Cuándo finaliza: el inicio más {@value #HORAS_HASTA_FINALIZAR} horas; null sin fecha u hora. */
    public LocalDateTime fin() {
        if (fechaEvento == null || horaEvento == null) {
            return null;
        }
        return LocalDateTime.of(fechaEvento, horaEvento).plusHours(HORAS_HASTA_FINALIZAR);
    }

    private boolean pasaron(int horas) {
        if (fechaEvento == null || horaEvento == null) {
            return false;
        }
        return !LocalDateTime.of(fechaEvento, horaEvento).plusHours(horas).isAfter(LocalDateTime.now());
    }
}
