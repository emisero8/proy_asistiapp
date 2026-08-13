package com.asistiapp.backend.models.entities;

import com.asistiapp.backend.models.enums.CanalVenta;
import com.asistiapp.backend.models.enums.EstadoEntrada;
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

    /** Staff QR que validó la entrada en puerta. Null hasta que se use. */
    @Column(name = "id_staff_qr_validador")
    private Long idStaffQrValidador;

    @Column(name = "fecha_compra", nullable = false, updatable = false)
    private LocalDateTime fechaCompra;

    /** Fecha/hora en que fue escaneada y marcada como Usada. */
    @Column(name = "fecha_uso")
    private LocalDateTime fechaUso;

    @PrePersist
    protected void onCreate() {
        this.fechaCompra = LocalDateTime.now();
        if (this.estado == null) {
            this.estado = EstadoEntrada.Pagada;
        }
    }
}
