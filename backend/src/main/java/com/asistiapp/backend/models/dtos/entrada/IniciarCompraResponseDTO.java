package com.asistiapp.backend.models.dtos.entrada;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

/**
 * DTO de respuesta al iniciar una compra online.
 * En una integración real con MercadoPago, este DTO devolvería la URL
 * de pago del checkout de MP para redirigir al comprador.
 * En esta simulación, devuelve un ID de orden pendiente.
 */
@Getter
@Setter
@Builder
public class IniciarCompraResponseDTO {

    /** ID de la "orden de pago" pendiente — simulado con UUID. */
    private String ordenId;

    /** URL donde el comprador completaría el pago (simulada). */
    private String urlPago;

    /** Mensaje informativo para el cliente. */
    private String mensaje;
}
