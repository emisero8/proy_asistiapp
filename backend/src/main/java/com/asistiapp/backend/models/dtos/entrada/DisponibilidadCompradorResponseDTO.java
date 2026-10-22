package com.asistiapp.backend.models.dtos.entrada;

import lombok.Builder;
import lombok.Getter;

/**
 * Cuántas entradas más puede vender el Staff Vendedor a un comprador para un evento,
 * respetando el tope por comprador (CU-019) — usado por el POS para no dejar armar
 * una venta que el backend va a rechazar a mitad de camino.
 */
@Getter
@Builder
public class DisponibilidadCompradorResponseDTO {
    private int limite;
    private long yaCompradas;
    private int disponible;
}
