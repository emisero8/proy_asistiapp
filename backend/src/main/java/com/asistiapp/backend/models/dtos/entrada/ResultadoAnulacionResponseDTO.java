package com.asistiapp.backend.models.dtos.entrada;

import lombok.Builder;
import lombok.Getter;

/** Resultado de anular una entrada (8.6): la entrada ya anulada y, si se pidió, cómo salió el reembolso. */
@Getter
@Builder
public class ResultadoAnulacionResponseDTO {

    private EntradaResponseDTO entrada;
    /** Se devolvió el dinero al comprador. */
    private boolean reembolsada;
    /** Si se pidió el reembolso y falló: por qué. La entrada queda anulada y el reembolso se puede reintentar. */
    private String avisoReembolso;
}
