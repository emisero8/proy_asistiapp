package com.asistiapp.backend.models.dtos.entrada;

import com.asistiapp.backend.models.enums.CanalVenta;
import com.asistiapp.backend.models.enums.EstadoEntrada;
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
}
