package com.asistiapp.backend.models.dtos.credito;

import com.asistiapp.backend.models.enums.EstadoTransaccion;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Una fila del historial de compras de créditos del Organizador (CU-019). A diferencia
 * de MovimientoCreditoResponseDTO (que solo tiene los movimientos ya confirmados contra
 * el saldo), esto lista TODAS las órdenes — incluidas las que nunca llegaron a pagarse
 * (Pendiente, Rechazada, Expirada) o que se reembolsaron.
 */
@Getter
@Builder
public class CompraCreditoResponseDTO {

    private String externalReference;
    private String nombrePaquete;
    private Integer cantidadCreditos;
    private Double monto;
    private EstadoTransaccion estado;
    private LocalDateTime fechaTransaccion;
}
