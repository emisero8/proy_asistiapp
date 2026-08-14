package com.asistiapp.backend.models.dtos.validacion;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/**
 * DTO para la petición de validación de un código QR (CU-018).
 * El Staff QR solo necesita enviar el código que leyó con su escáner.
 */
@Getter
@Setter
public class ValidacionQRRequestDTO {

    @NotBlank(message = "El código QR es obligatorio")
    private String codigoQr;
}
