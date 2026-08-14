package com.asistiapp.backend.models.dtos.credito;

import lombok.Builder;
import lombok.Getter;

/**
 * Vista reducida de un PaqueteCredito para el catálogo que ve el
 * Organizador al comprar créditos (CU-014) — a diferencia de
 * PaqueteCreditoResponseDTO (admin), no expone `estado`: acá solo
 * llegan paquetes ya filtrados por Activo.
 */
@Getter
@Builder
public class PaqueteCreditoDisponibleDTO {
    private Long id;
    private String nombre;
    private Integer cantidadCreditos;
    private Double precio;
}
