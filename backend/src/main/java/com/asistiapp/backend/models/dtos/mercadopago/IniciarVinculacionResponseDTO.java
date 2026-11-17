package com.asistiapp.backend.models.dtos.mercadopago;

import lombok.AllArgsConstructor;
import lombok.Getter;

/** URL de Mercado Pago a la que el frontend redirige al Organizador para que autorice la aplicación. */
@Getter
@AllArgsConstructor
public class IniciarVinculacionResponseDTO {
    private String urlAutorizacion;
}
