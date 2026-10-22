package com.asistiapp.backend.models.dtos.publico;

import lombok.Builder;
import lombok.Getter;

/** Datos de contacto de soporte (funcionalidad extra, fuera de los CU del PP2), configurables por el Admin vía CU-028. */
@Getter
@Builder
public class SoporteResponseDTO {
    private String emailSoporte;
    private String whatsappSoporte;
}
