package com.asistiapp.backend.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Un intento de vinculación en curso (8.4): une el `state` que vuelve de Mercado Pago con el Organizador que
 * lo inició y guarda el verificador PKCE. Es de un solo uso y vence a los 10 minutos (lo que dura el código).
 */
@Entity
@Table(name = "intentos_vinculacion_mp")
@Getter
@Setter
@NoArgsConstructor
public class IntentoVinculacionMp {

    @Id
    @Column(length = 64)
    private String state;

    @Column(name = "id_organizador", nullable = false)
    private Long idOrganizador;

    @Column(name = "code_verifier", nullable = false, length = 128)
    private String codeVerifier;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn;
}
