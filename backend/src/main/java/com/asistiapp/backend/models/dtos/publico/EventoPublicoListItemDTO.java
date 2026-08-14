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
}
