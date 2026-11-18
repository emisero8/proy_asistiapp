package com.asistiapp.backend.models.dtos.perfil;

import com.asistiapp.backend.models.enums.PlazoLiberacionMp;
import com.asistiapp.backend.models.enums.ZonaComisionMp;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Quién paga la comisión de Mercado Pago de las entradas del Organizador. Con `trasladarAlComprador` el comprador
 * paga un cargo por procesamiento calculado con el plazo de liberación y la zona que tiene en su cuenta.
 */
@Getter
@Setter
@NoArgsConstructor
public class ComisionMpRequestDTO {

    @NotNull(message = "Indicá quién paga la comisión de Mercado Pago")
    private Boolean trasladarAlComprador;

    @NotNull(message = "Elegí el plazo de liberación de tu cuenta de Mercado Pago")
    private PlazoLiberacionMp plazoLiberacion;

    @NotNull(message = "Elegí tu zona")
    private ZonaComisionMp zona;
}
