package com.asistiapp.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.core.env.StandardEnvironment;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtSecretValidatorTest {

    private static final String SECRETO_PROPIO = "una-clave-aleatoria-de-produccion-bien-larga-0123456789";

    private static StandardEnvironment entorno(String... perfiles) {
        StandardEnvironment env = new StandardEnvironment();
        env.setActiveProfiles(perfiles);
        return env;
    }

    private static JwtSecretValidator validador(String secreto, String... perfiles) {
        return new JwtSecretValidator(secreto, entorno(perfiles));
    }

    @Test
    void enProduccion_conElSecretoDeDesarrollo_noArranca() {
        JwtSecretValidator v = validador(JwtSecretValidator.SECRETO_DE_DESARROLLO, "prod");

        assertThatThrownBy(v::validar)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET")
                .hasMessageContaining("prod");
    }

    @Test
    void enProduccion_conUnSecretoPropio_arranca() {
        assertThatCode(validador(SECRETO_PROPIO, "prod")::validar).doesNotThrowAnyException();
    }

    @Test
    void enDesarrollo_conElSecretoDeDesarrollo_arrancaSoloAvisando() {
        assertThatCode(validador(JwtSecretValidator.SECRETO_DE_DESARROLLO)::validar).doesNotThrowAnyException();
        assertThatCode(validador(JwtSecretValidator.SECRETO_DE_DESARROLLO, "dev")::validar).doesNotThrowAnyException();
    }

    @Test
    void conUnSecretoCorto_noArranca_encualquierPerfil() {
        assertThatThrownBy(validador("corto")::validar).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(validador("corto", "prod")::validar).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void conUnSecretoVacioONulo_noArranca() {
        assertThatThrownBy(validador("")::validar).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(validador(null)::validar).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void elLargoMinimoSeMideEnBytes_noEnCaracteres() {
        // 16 caracteres "ñ" = 32 bytes en UTF-8: alcanza. 15 = 30 bytes: no.
        assertThatCode(validador("ñ".repeat(16))::validar).doesNotThrowAnyException();
        assertThatThrownBy(validador("ñ".repeat(15))::validar).isInstanceOf(IllegalStateException.class);
    }

    /**
     * Si alguien cambia el default de application.yml sin cambiar la constante del validador, el control
     * de producción dejaría de detectar el secreto público sin que nada falle. Este test lo ata.
     */
    @Test
    void laConstanteCoincideConElDefaultDeApplicationYml() throws Exception {
        try (InputStream in = getClass().getResourceAsStream("/application.yml")) {
            assertThat(in).as("application.yml en el classpath").isNotNull();
            String yml = new String(in.readAllBytes(), StandardCharsets.UTF_8);

            assertThat(yml).contains("${JWT_SECRET:" + JwtSecretValidator.SECRETO_DE_DESARROLLO + "}");
        }
    }
}
