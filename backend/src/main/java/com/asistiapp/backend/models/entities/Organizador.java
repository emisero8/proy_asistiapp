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

    /**
     * Contacto al que se deriva el botón de arrepentimiento (8.8). WhatsApp solo con dígitos y código de
     * país (listo para wa.me) y/o email. Hace falta al menos uno para publicar un evento.
     */
    @Column(name = "contacto_whatsapp", length = 20)
    private String contactoWhatsapp;

    @Column(name = "contacto_email", length = 200)
    private String contactoEmail;

    /** Cuándo y con qué versión de los términos se registró (8.7). Nulo en cuentas anteriores a ese cambio. */
    @Column(name = "terminos_aceptados_en")
    private java.time.LocalDateTime terminosAceptadosEn;

    @Column(name = "terminos_version", length = 40)
    private String terminosVersion;
}
