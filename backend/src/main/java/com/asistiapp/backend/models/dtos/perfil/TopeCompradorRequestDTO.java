package com.asistiapp.backend.models.dtos.perfil;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Tope de entradas por comprador del Organizador. Null = volver al valor de la plataforma. */
@Getter
@Setter
@NoArgsConstructor
public class TopeCompradorRequestDTO {

    @Min(value = 1, message = "El tope tiene que ser al menos 1")
    @Max(value = 100, message = "El tope no puede superar 100")
    private Integer maxEntradasPorComprador;
}
