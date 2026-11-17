package com.asistiapp.backend.models.dtos.entrada;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/** Resultado de reembolsar todas las compras de un evento cancelado (8.6): lo que salió y lo que quedó pendiente. */
@Getter
@Builder
public class ResultadoReembolsoMasivoResponseDTO {

    private int reembolsadas;
    private double montoReembolsado;
    private List<Falla> fallidas;

    @Getter
    @Builder
    public static class Falla {
        private Long idEntrada;
        private String nombreComprador;
        private String emailComprador;
        private String motivo;
    }
}
