package com.asistiapp.backend.models.dtos.publico;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Vista reducida de un evento publicado para el listado del Comprador (CU-015).
 * No expone idOrganizador ni descripcion/tandas completas — eso vive en el detalle.
 */
@Getter
@Builder
public class EventoPublicoListItemDTO {
    private Long id;
    private String nombre;
    private LocalDate fechaEvento;
    private LocalTime horaEvento;
    private String lugar;
    private String imagenPortadaUrl;
    private String urlPublica;

    /** Precio de la tanda más barata vigente — null si el evento no tiene tandas. */
    private Double precioDesde;

    /** Cantidad de tandas del evento (para la tarjeta del catálogo). */
    private Integer cantidadTandas;

    /** Suma del cupo disponible de todas las tandas: 0 ⇒ "Agotado" en la tarjeta. */
    private Integer cupoDisponibleTotal;

    /** Suma del cupo máximo de todas las tandas: con el disponible permite derivar "Últimas entradas". */
    private Integer cupoTotal;
}
