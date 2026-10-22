package com.asistiapp.backend.exceptions;

import org.springframework.http.HttpStatus;

/** Falla al comunicarse con la pasarela de pagos (MercadoPago): no es culpa del cliente. */
public class PasarelaPagoException extends AsistiAppException {
    public PasarelaPagoException(String message) {
        super(message, HttpStatus.BAD_GATEWAY);
    }
}
