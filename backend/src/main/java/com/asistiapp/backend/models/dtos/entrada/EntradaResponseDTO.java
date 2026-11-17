package com.asistiapp.backend.models.dtos.entrada;

import com.asistiapp.backend.models.enums.CanalVenta;
import com.asistiapp.backend.models.enums.EstadoEntrada;
import com.asistiapp.backend.models.enums.TipoEmision;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * DTO de respuesta para una Entrada (ticket).
 * El codigo_qr se incluye para que el comprador / el staff pueda usarlo.
 */
@Getter
@Setter
@Builder
public class EntradaResponseDTO {

    private Long id;
    private Long idTanda;
    private Long idEvento;
    private String nombreEvento;
    private String nombreTanda;
    private Double precioTanda;
    private String codigoQr;
    private String nombreComprador;
    private String emailComprador;
    private EstadoEntrada estado;
    private CanalVenta canalVenta;
    private LocalDateTime fechaCompra;
    private LocalDateTime fechaUso;
    /** Solo en las entradas que emitió el Organizador (cortesía o pago externo); null en las demás. */
    private TipoEmision tipoEmision;
    /** Nota interna del Organizador: solo se completa en lo que ve el Organizador, nunca para quien tiene la entrada. */
    private String motivoEmision;
    /** Cuándo se anuló (8.6); null si no está anulada. */
    private LocalDateTime fechaAnulacion;
    /** Nota interna del Organizador sobre la anulación: solo se completa en lo que ve el Organizador. */
    private String motivoAnulacion;
    /** Cuándo se le devolvió el dinero al comprador; null si no se reembolsó. */
    private LocalDateTime reembolsadaEn;
}
