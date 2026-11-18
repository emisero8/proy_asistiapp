package com.asistiapp.backend.models.dtos.entrada;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Anular una entrada (8.6). El motivo es una nota interna del Organizador y es opcional. */
@Getter
@Setter
@NoArgsConstructor
public class AnularEntradaRequestDTO {

    @Size(max = 200, message = "El motivo no puede superar los 200 caracteres")
    private String motivo;

    /** Además de anularla, devolverle el dinero al comprador desde la cuenta de Mercado Pago del Organizador. */
    private boolean reembolsar;
}
