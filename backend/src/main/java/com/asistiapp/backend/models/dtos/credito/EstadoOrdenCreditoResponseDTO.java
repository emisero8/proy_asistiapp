package com.asistiapp.backend.models.dtos.credito;

import com.asistiapp.backend.models.enums.EstadoTransaccion;
import lombok.Builder;
import lombok.Getter;

/**
 * Estado de una orden de compra de créditos, para la pantalla de resultado del
 * pago (`/pago/resultado?ref=...&tipo=creditos`). A diferencia de las entradas,
 * acá el Organizador sí tiene JWT, así que el endpoint además verifica que la
 * orden sea suya.
 */
@Getter
@Builder
public class EstadoOrdenCreditoResponseDTO {

    private EstadoTransaccion estado;
    private Integer cantidadCreditos;
    private Double monto;
}
