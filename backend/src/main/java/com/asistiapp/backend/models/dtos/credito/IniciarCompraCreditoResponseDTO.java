package com.asistiapp.backend.models.dtos.credito;

import lombok.Builder;
import lombok.Getter;

/**
 * Respuesta al iniciar una compra de créditos. `ordenId` es directamente
 * el ID de la TransaccionCredito creada en estado Pendiente — el webhook
 * la confirma por ese mismo ID.
 */
@Getter
@Builder
public class IniciarCompraCreditoResponseDTO {
    private Long ordenId;
    private String urlPago;
    private String mensaje;
}
