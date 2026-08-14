package com.asistiapp.backend.models.dtos.metricas;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/** Dashboard en tiempo real del Organizador para un evento (CU-012). */
@Getter
@Builder
public class EventoMetricasResponseDTO {
    private Long idEvento;
    private String nombreEvento;
    private Integer entradasVendidas;
    private Integer entradasValidadas;
    private Double ingresosTotales;
    private Integer cupoTotal;
    private Integer cupoDisponible;
    private List<TandaMetricasDTO> tandas;
}
