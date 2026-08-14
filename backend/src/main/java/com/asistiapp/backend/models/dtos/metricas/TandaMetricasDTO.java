package com.asistiapp.backend.models.dtos.metricas;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TandaMetricasDTO {
    private Long idTanda;
    private String nombre;
    private Integer cupoMaximo;
    private Integer cupoDisponible;
    private Integer vendidas;
    private Double ingresos;
}
