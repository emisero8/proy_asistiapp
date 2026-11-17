package com.asistiapp.backend.models.entities;

import com.asistiapp.backend.models.enums.CanalVenta;
import com.asistiapp.backend.models.enums.EstadoEntrada;
import com.asistiapp.backend.models.enums.TipoEmision;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Entrada (ticket) generada tras una compra exitosa.
 *
 * Flujo online (CU-017):
 *   MercadoPago IPN → generar codigo_qr único → estado = Pagada → enviar email.
 *
 * Flujo manual (CU-019):
 *   Staff Vendedor → generar codigo_qr → estado = Pagada (sin MercadoPago).
 *
 * Validación (CU-018):
 *   Staff QR escanea → verificar estado != Usada → cambiar a Usada + registrar fecha_uso.
 */
@Entity
@Table(name = "entradas",
        indexes = {
                // Búsqueda por QR muy frecuente → índice dedicado
                @Index(name = "idx_entrada_qr", columnList = "codigo_qr")
        })
@Getter
@Setter
@NoArgsConstructor
public class Entrada {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Relación N:1 con Tanda. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_tanda", nullable = false)
    private Tanda tanda;

    /**
     * Código QR único de la entrada.
     * Generado en el servidor tras confirmación de pago (UUID o hash seguro).
     */
    @Column(name = "codigo_qr", nullable = false, unique = true, length = 100)
    private String codigoQr;

    @Column(name = "nombre_comprador", nullable = false, length = 200)
    private String nombreComprador;

    @Column(name = "email_comprador", nullable = false, length = 200)
    private String emailComprador;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoEntrada estado;

    @Enumerated(EnumType.STRING)
    @Column(name = "canal_venta", nullable = false, length = 20)
    private CanalVenta canalVenta;

    /** ID de la transacción de MercadoPago. Null si es venta Manual. */
    @Column(name = "id_transaccion_pago")
    private Long idTransaccionPago;

    /** Staff que realizó la venta manual. Null si es Online. */
    @Column(name = "id_staff_vendedor")
    private Long idStaffVendedor;

    /** Organizador que emitió la entrada él mismo (cortesía o pago externo). Null en las demás. */
    @Column(name = "id_organizador_emisor")
    private Long idOrganizadorEmisor;

    /** Por qué la emitió el Organizador. Null si no la emitió él. */
    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_emision", length = 20)
    private TipoEmision tipoEmision;

    /** Nota interna del Organizador sobre esta emisión; no se le muestra a quien recibe la entrada. */
    @Column(name = "motivo_emision", length = 200)
    private String motivoEmision;

    /** Staff QR que validó la entrada en puerta. Null hasta que se use. */
    @Column(name = "id_staff_qr_validador")
    private Long idStaffQrValidador;

    @Column(name = "fecha_compra", nullable = false, updatable = false)
    private LocalDateTime fechaCompra;

    /** Fecha/hora en que fue escaneada y marcada como Usada. */
    @Column(name = "fecha_uso")
    private LocalDateTime fechaUso;

    /** Cuándo el Organizador la anuló (8.6). Null si no está anulada. */
    @Column(name = "fecha_anulacion")
    private LocalDateTime fechaAnulacion;

    /** Nota interna del Organizador sobre la anulación; no se le muestra a quien tenía la entrada. */
    @Column(name = "motivo_anulacion", length = 200)
    private String motivoAnulacion;

    /** Cuándo se le devolvió el dinero al comprador desde la cuenta de Mercado Pago del Organizador (8.6). */
    @Column(name = "reembolsada_en")
    private LocalDateTime reembolsadaEn;

    /** Hay un reembolso a Mercado Pago en curso: evita que dos pedidos simultáneos devuelvan el dinero dos veces. */
    @Column(name = "reembolso_en_curso", nullable = false, columnDefinition = "boolean not null default false")
    private boolean reembolsoEnCurso;

    /** Ya se le devolvió al Organizador el crédito de esta entrada (por anulada o reembolsada): una sola vez. */
    @Column(name = "credito_devuelto", nullable = false, columnDefinition = "boolean not null default false")
    private boolean creditoDevuelto;

    @PrePersist
    protected void onCreate() {
        this.fechaCompra = LocalDateTime.now();
        if (this.estado == null) {
            this.estado = EstadoEntrada.Pagada;
        }
    }
}
