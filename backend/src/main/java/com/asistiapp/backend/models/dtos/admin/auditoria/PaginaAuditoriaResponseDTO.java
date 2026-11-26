package com.asistiapp.backend.models.dtos.admin.auditoria;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/** Una página del historial de auditoría, de la acción más reciente a la más vieja. */
@Getter
@Builder
public class PaginaAuditoriaResponseDTO {
    private List<LogAuditoriaResponseDTO> items;
    /** Número de página, empezando en 0. */
    private int pagina;
    private int tamano;
    private long totalElementos;
    private int totalPaginas;
}
