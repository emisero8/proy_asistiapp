package com.asistiapp.backend.models.dtos.metricas;

import lombok.Builder;
import lombok.Getter;

/** KPIs globales del sistema para el dashboard del Administrador (CU-027). */
@Getter
@Builder
public class AdminMetricasResponseDTO {
    private Long eventosActivos;
    private Long eventosTotales;
    private Long entradasVendidas;
    private Double ingresosTotales;
    private Long organizadoresActivos;
}
