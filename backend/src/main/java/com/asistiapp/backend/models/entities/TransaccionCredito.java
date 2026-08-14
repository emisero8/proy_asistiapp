package com.asistiapp.backend.models.entities;

import com.asistiapp.backend.models.enums.EstadoTransaccion;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Registro de una compra de créditos por parte de un Organizador (CU-014).
 * La transacción en sí ES la "orden pendiente": se crea con estado Pendiente
 * al iniciar la compra y pasa a Aprobada/Rechazada al confirmar el webhook —
 * sin depender de estado en memoria.
 */
@Entity
@Table(name = "transacciones_credito")
@Getter
@Setter
@NoArgsConstructor
public class TransaccionCredito {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "id_organizador", nullable = false)
    private Long idOrganizador;

    @Column(name = "id_paquete", nullable = false)
    private Long idPaquete;

    @Column(nullable = false)
    private Double monto;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoTransaccion estado;

    @Column(name = "mercadopago_payment_id")
    private String mercadopagoPaymentId;

    @Column(name = "fecha_transaccion", nullable = false, updatable = false)
    private LocalDateTime fechaTransaccion;

    @PrePersist
    protected void onCreate() {
        this.fechaTransaccion = LocalDateTime.now();
        if (this.estado == null) {
            this.estado = EstadoTransaccion.Pendiente;
        }
    }
}
