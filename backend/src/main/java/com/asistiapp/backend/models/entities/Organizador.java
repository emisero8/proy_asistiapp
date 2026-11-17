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

    /**
     * Máximo de entradas que puede tener una misma persona (mismo mail) para un evento de este
     * Organizador. Null = no fijó uno: rige el de la plataforma (8.9).
     */
    @Column(name = "max_entradas_por_comprador")
    private Integer maxEntradasPorComprador;
}
