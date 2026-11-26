package com.asistiapp.backend.models.dtos.entrada;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

/** Tope de entradas del Staff Vendedor autenticado (8.3) y cuánto le queda. */
@Getter
@Setter
@Builder
public class TopeVendedorResponseDTO {

    /** Máximo que puede vender en total; null en un vendedor sin tope (anterior a la regla). */
    private Integer tope;
    /** Entradas que lleva vendidas (una anulada libera su lugar). */
    private long vendidas;
    /** Cuántas más puede vender; null si no tiene tope. */
    private Long restantes;
}
