package com.asistiapp.backend.models.dtos.staff;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CambiarTopeVendedorRequestDTO {

    @NotNull(message = "Indicá el tope de entradas")
    @Min(value = 1, message = "El tope de entradas tiene que ser al menos 1")
    private Integer topeEntradas;
}
