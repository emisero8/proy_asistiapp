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

    @Column(name = "monto_total", nullable = false)
    private Double montoTotal;

    @Enumerated(EnumType.STRING)
    @Column(name = "metodo_pago", nullable = false, length = 20)
    private MetodoPago metodoPago;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoTransaccion estado;

    @Column(name = "mercadopago_payment_id")
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
        if (this.metodoPago == null) {
            this.metodoPago = MetodoPago.MercadoPago;
        }
    }
}
