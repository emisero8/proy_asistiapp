package com.asistiapp.backend.models.dtos.credito;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class IniciarCompraCreditoRequestDTO {

    @NotNull(message = "El paquete de créditos es obligatorio")
    private Long idPaquete;
}
