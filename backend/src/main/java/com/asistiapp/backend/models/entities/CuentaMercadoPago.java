package com.asistiapp.backend.models.entities;

import com.asistiapp.backend.models.enums.EstadoCuentaMp;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Cuenta de Mercado Pago que un Organizador vinculó por OAuth (8.4). El dinero de sus entradas
 * cae directo en esa cuenta. Los tokens se guardan cifrados (TokenCifradoService): nunca en claro.
 */
@Entity
@Table(name = "cuentas_mercadopago")
@Getter
@Setter
@NoArgsConstructor
public class CuentaMercadoPago {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Una sola cuenta por Organizador. */
    @Column(name = "id_organizador", nullable = false, unique = true)
    private Long idOrganizador;

    /** Identificador del usuario en Mercado Pago (user_id del OAuth). */
    @Column(name = "mp_user_id")
    private Long mpUserId;

    @Column(name = "access_token_cifrado", nullable = false, columnDefinition = "text")
    private String accessTokenCifrado;

    @Column(name = "refresh_token_cifrado", nullable = false, columnDefinition = "text")
    private String refreshTokenCifrado;

    @Column(name = "expira_en", nullable = false)
    private LocalDateTime expiraEn;

    @Column(name = "vinculada_en", nullable = false)
    private LocalDateTime vinculadaEn;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoCuentaMp estado = EstadoCuentaMp.Vinculada;
}
