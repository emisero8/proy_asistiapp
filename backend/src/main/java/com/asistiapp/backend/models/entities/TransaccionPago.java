package com.asistiapp.backend.models.entities;

import com.asistiapp.backend.models.enums.EstadoTransaccion;
import com.asistiapp.backend.models.enums.MetodoPago;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Registro de pago de una entrada (CU-017). Es, a la vez, la "orden de compra
 * pendiente": se crea en estado Pendiente al iniciar la compra online y pasa
 * a Aprobada al confirmar el webhook — reemplaza el mapa en memoria que tenía
 * VentaService, que se perdía si el backend se reiniciaba.
 */
@Entity
@Table(name = "transacciones_pago")
@Getter
@Setter
@NoArgsConstructor
public class TransaccionPago {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Tanda que el comprador eligió — se usa para generar la Entrada al confirmar el pago. */
    @Column(name = "id_tanda", nullable = false)
    private Long idTanda;

    /** Cantidad de entradas de la orden: un solo pago en MercadoPago, N entradas al aprobarse. */
    @Column(nullable = false, columnDefinition = "integer default 1")
    private Integer cantidad;

    /** Total de la orden: (precio de la tanda + cargo por entrada) × cantidad. Es lo que se cobra en MercadoPago. */
    @Column(name = "monto_total", nullable = false)
    private Double montoTotal;

    /**
     * Cargo por procesamiento de pago por entrada que se le sumó al comprador porque el Organizador traslada la
     * comisión de Mercado Pago. Null o 0 = la absorbió el Organizador. Queda fijo en la orden: si el Organizador
     * cambia su preferencia después, no afecta lo ya cobrado ni lo que se reembolsa.
     */
    @Column(name = "cargo_servicio_unitario")
    private Double cargoServicioUnitario;

    /**
     * Identificador opaco de la orden que viaja a MercadoPago como external_reference.
     * UUID (no el id secuencial) porque el comprador no tiene JWT y con él consulta el estado.
     */
    @Column(name = "external_reference", unique = true, length = 36)
    private String externalReference;

    /** Momento a partir del cual la orden deja de aceptar pagos (vence la preferencia de MP). */
    @Column(name = "fecha_vencimiento")
    private LocalDateTime fechaVencimiento;

    @Enumerated(EnumType.STRING)
    @Column(name = "metodo_pago", nullable = false, length = 20)
    private MetodoPago metodoPago;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoTransaccion estado;

    @Column(name = "mercadopago_payment_id", unique = true)
    private String mercadopagoPaymentId;

    @Column(name = "nombre_comprador", nullable = false, length = 200)
    private String nombreComprador;

    @Column(name = "email_comprador", nullable = false, length = 200)
    private String emailComprador;

    @Column(name = "fecha_transaccion", nullable = false, updatable = false)
    private LocalDateTime fechaTransaccion;

    @PrePersist
    protected void onCreate() {
        this.fechaTransaccion = LocalDateTime.now();
        if (this.estado == null) {
            this.estado = EstadoTransaccion.Pendiente;
        }
        if (this.cantidad == null) {
            this.cantidad = 1;
        }
        if (this.externalReference == null) {
            this.externalReference = java.util.UUID.randomUUID().toString();
        }
        if (this.metodoPago == null) {
            this.metodoPago = MetodoPago.MercadoPago;
        }
    }
}
