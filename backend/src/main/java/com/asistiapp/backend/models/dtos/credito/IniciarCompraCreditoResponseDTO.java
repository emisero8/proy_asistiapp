package com.asistiapp.backend.models.dtos.credito;

import lombok.Builder;
import lombok.Getter;

/**
 * Respuesta al iniciar una compra de créditos. `ordenId` es el external_reference
 * (UUID) de la TransaccionCredito creada en estado Pendiente; `urlPago` es el
 * init_point de MercadoPago al que hay que redirigir al organizador.
 */
@Getter
@Builder
public class IniciarCompraCreditoResponseDTO {
    private String ordenId;
    private String urlPago;
    private String mensaje;
}
