package com.asistiapp.backend.models.dtos.publico;

import lombok.Builder;
import lombok.Getter;

/**
 * Métricas agregadas de la plataforma para mostrar en la landing pública
 * (sección "por qué AsistíAPP") — subconjunto seguro de AdminMetricasResponseDTO,
 * sin datos sensibles de negocio (nunca expone ingresosTotales).
 */
@Getter
@Builder
public class EstadisticasPublicasResponseDTO {
    private long organizadoresActivos;
    private long entradasVendidas;
    private long eventosPublicados;
}
