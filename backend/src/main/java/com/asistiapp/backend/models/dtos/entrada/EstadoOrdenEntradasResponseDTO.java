package com.asistiapp.backend.models.dtos.entrada;

import com.asistiapp.backend.models.enums.EstadoTransaccion;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * Estado de una orden de entradas, para la pantalla de resultado del pago
 * (`/pago/resultado?ref=...&tipo=entradas`). El comprador no tiene JWT: el
 * externalReference (UUID de la orden) es el único dato que hace falta y que
 * nadie más puede adivinar, igual que el codigoQr en el resto de la app.
 */
@Getter
@Builder
public class EstadoOrdenEntradasResponseDTO {

    private EstadoTransaccion estado;
    private Integer cantidad;
    private String nombreEvento;
    private String nombreTanda;

    /** Vacío mientras la orden no esté Aprobada. */
    private List<EntradaResponseDTO> entradas;
}
