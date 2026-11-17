package com.asistiapp.backend.services;

import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** 8.4 — los tokens de Mercado Pago de los Organizadores se guardan cifrados: la base sola no alcanza para usarlos. */
class TokenCifradoServiceTest {

    private static String clave(int bytes) {
        byte[] k = new byte[bytes];
        for (int i = 0; i < bytes; i++) k[i] = (byte) (i + 1);
        return Base64.getEncoder().encodeToString(k);
    }

    private final TokenCifradoService servicio = new TokenCifradoService(clave(32));

    @Test
    void cifrarYDescifrar_devuelveElMismoTexto() {
        String cifrado = servicio.cifrar("APP_USR-1234-secreto");

        assertThat(cifrado).doesNotContain("APP_USR").isNotEqualTo("APP_USR-1234-secreto");
        assertThat(servicio.descifrar(cifrado)).isEqualTo("APP_USR-1234-secreto");
    }

    @Test
    void elMismoTextoCifradoDosVecesDaResultadosDistintos() {
        assertThat(servicio.cifrar("token")).isNotEqualTo(servicio.cifrar("token"));
    }

    @Test
    void unTextoAlteradoNoSeDescifra() {
        byte[] bytes = Base64.getDecoder().decode(servicio.cifrar("token"));
        bytes[bytes.length - 1] ^= 1;

        assertThatThrownBy(() -> servicio.descifrar(Base64.getEncoder().encodeToString(bytes)))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void conOtraClaveNoSeDescifra() {
        String cifrado = servicio.cifrar("token");
        byte[] otra = new byte[32];

        assertThatThrownBy(() -> new TokenCifradoService(Base64.getEncoder().encodeToString(otra)).descifrar(cifrado))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void unaClaveQueNoEsDe32BytesSeRechazaAlArrancar() {
        assertThatThrownBy(() -> new TokenCifradoService(clave(16)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("32 bytes");
    }
}
