package com.asistiapp.backend.models.dtos.publico;

import com.asistiapp.backend.models.dtos.tanda.TandaResponseDTO;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * Detalle público de un evento publicado (CU-016). Incluye las tandas para
 * que el Comprador elija cuál comprar sin necesitar una segunda petición.
 */
@Getter
@Builder
public class EventoPublicoDetalleDTO {
    private Long id;
    private String nombre;
    private String descripcion;
    private LocalDate fechaEvento;
    private LocalTime horaEvento;
    private String lugar;
    private String imagenPortadaUrl;
    private String urlPublica;
    private List<TandaResponseDTO> tandas;
}
