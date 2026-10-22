package com.asistiapp.backend.models.dtos.entrada;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

/**
 * DTO de respuesta al iniciar una compra online: el identificador opaco de la
 * orden (external_reference) y el init_point de MercadoPago Checkout Pro al que
 * hay que redirigir al comprador.
 */
@Getter
@Setter
@Builder
public class IniciarCompraResponseDTO {

    /** Identificador opaco (UUID) de la orden de pago pendiente. */
    private String ordenId;

    /** init_point de MercadoPago: URL donde el comprador completa el pago. */
    private String urlPago;

    /** Mensaje informativo para el cliente. */
    private String mensaje;
}
