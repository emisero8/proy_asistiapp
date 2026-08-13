package com.asistiapp.backend.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Subentidad Organizador.
 * Tabla: organizadores (PK/FK → usuarios.id)
 * Tiene saldo de créditos para publicar eventos (CU-010).
 */
@Entity
@Table(name = "organizadores")
@PrimaryKeyJoinColumn(name = "id_usuario")
@Getter
@Setter
@NoArgsConstructor
public class Organizador extends Usuario {

    @Column(name = "saldo_creditos", nullable = false)
    private Integer saldoCreditos = 0;
}
