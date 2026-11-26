package com.asistiapp.backend.models.dtos.publico;

import com.asistiapp.backend.models.dtos.tanda.TandaResponseDTO;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * Detalle público de un evento publicado (CU-016). Incluye las tandas para
 * que el Comprador elija cuál comprar sin necesitar una segunda petición.
 */
@Getter
@Builder
public class EventoPublicoDetalleDTO {
    private Long id;
    private String nombre;
    private String descripcion;
    private LocalDate fechaEvento;
    private LocalTime horaEvento;
    private String lugar;
    private Double latitud;
    private Double longitud;
    private String imagenPortadaUrl;
    private String urlPublica;
    /** El evento ya terminó. Que haya comenzado (venta cerrada) lo indica su fecha y hora. */
    private boolean finalizado;
    private List<TandaResponseDTO> tandas;

    /** Tope de entradas que una misma persona puede comprar para este evento. */
    private Integer maxEntradasPorCompra;

    /**
     * Contacto del Organizador al que deriva el botón de arrepentimiento (8.8). WhatsApp solo con dígitos
     * (listo para wa.me) y/o email; null si no cargó.
     */
    private String contactoWhatsapp;
    private String contactoEmail;

    /**
     * Recargo por procesamiento de pago (comisión de Mercado Pago) que paga el comprador, en porcentaje sobre el
     * precio (ej. 8.24). Null si el Organizador absorbe la comisión. El monto exacto por entrada está en cada tanda.
     */
    private Double porcentajeCargoServicio;
}
