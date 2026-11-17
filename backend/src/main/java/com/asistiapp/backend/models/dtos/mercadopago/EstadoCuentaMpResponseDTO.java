package com.asistiapp.backend.models.dtos.mercadopago;

import com.asistiapp.backend.models.enums.EstadoCuentaMp;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/** Estado de la cuenta de Mercado Pago del Organizador. Nunca incluye tokens. */
@Getter
@Builder
public class EstadoCuentaMpResponseDTO {

    /** True solo si hay una cuenta con acceso vigente: es lo que habilita cobrar. */
    private boolean vinculada;
    /** Null si nunca vinculó; Revocada si Mercado Pago dejó de aceptar el acceso y hay que vincular de nuevo. */
    private EstadoCuentaMp estado;
    private Long mpUserId;
    private LocalDateTime vinculadaEn;
}
