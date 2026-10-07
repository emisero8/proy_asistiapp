package com.asistiapp.backend.models.dtos.metricas;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/** Métricas generales del Organizador para el Dashboard (todos sus eventos). */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumenOrganizadorResponseDTO {

    private int eventosPublicados;
    private int eventosBorrador;
    private int entradasVendidas;
    private int entradasValidadas;
    private double ingresosTotales;
    /** Neto: publicar y entradas de tandas suman, las devoluciones restan. */
    private int creditosConsumidos;
    private int saldoCreditos;
    /** Próximo evento publicado que todavía no empezó; null si no hay ninguno. */
    private ProximoEvento proximoEvento;

    @Getter
    @AllArgsConstructor
    public static class ProximoEvento {
        private Long id;
        private String nombre;
        private LocalDate fechaEvento;
    }
}
