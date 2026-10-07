package com.asistiapp.backend.models.dtos.credito;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Saldo del Organizador, costo de publicar y créditos disponibles para entradas de tandas. */
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class CreditosResumenResponseDTO {

    private int saldo;
    private int costoPublicacion;
    private int disponibleParaEntradas;
}
