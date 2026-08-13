package com.asistiapp.backend.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Subentidad Staff QR.
 * Tabla: staff_qr (PK/FK → usuarios.id)
 * Cada Staff QR está asignado a un único evento para validar entradas (CU-018).
 */
@Entity
@Table(name = "staff_qr")
@PrimaryKeyJoinColumn(name = "id_usuario")
@Getter
@Setter
@NoArgsConstructor
public class StaffQR extends Usuario {

    /**
     * El evento al que está asignado este Staff QR.
     * IMPORTANTE: la validación de QR debe verificar que el código QR
     * pertenece a este mismo evento (CU-018).
     */
    @Column(name = "id_evento", nullable = false)
    private Long idEvento;
}
