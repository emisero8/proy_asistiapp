package com.asistiapp.backend.models.dtos.credito;

import com.asistiapp.backend.models.enums.TipoMovimiento;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class MovimientoCreditoResponseDTO {
    private Long id;
    private TipoMovimiento tipoMovimiento;
    private Integer monto;
    private Integer saldoResultante;
    private LocalDateTime fechaMovimiento;
    private Long idTransaccionCredito;
    private Long idEvento;
}
