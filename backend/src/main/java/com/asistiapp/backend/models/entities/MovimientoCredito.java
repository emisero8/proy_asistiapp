package com.asistiapp.backend.models.entities;

import com.asistiapp.backend.models.enums.TipoMovimiento;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Ledger inmutable de cada cambio en el saldo de créditos de un Organizador
 * (bienvenida, recarga o consumo al publicar). `monto` es signado (positivo
 * suma, negativo resta) para que la suma de movimientos siempre reconstruya
 * `saldoResultante`. Nunca se actualiza, solo se inserta.
 */
@Entity
@Table(name = "movimientos_credito")
@Getter
@Setter
@NoArgsConstructor
public class MovimientoCredito {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "id_organizador", nullable = false)
    private Long idOrganizador;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_movimiento", nullable = false, length = 30)
    private TipoMovimiento tipoMovimiento;

    /** Signado: positivo en Bienvenida/Recarga, negativo en Consumo_Publicacion. */
    @Column(nullable = false)
    private Integer monto;

    @Column(name = "saldo_resultante", nullable = false)
    private Integer saldoResultante;

    @Column(name = "fecha_movimiento", nullable = false, updatable = false)
    private LocalDateTime fechaMovimiento;

    /** Presente solo si el movimiento es una Recarga. */
    @Column(name = "id_transaccion_credito")
    private Long idTransaccionCredito;

    /** Presente solo si el movimiento es un Consumo_Publicacion. */
    @Column(name = "id_evento")
    private Long idEvento;

    @PrePersist
    protected void onCreate() {
        this.fechaMovimiento = LocalDateTime.now();
    }
}
