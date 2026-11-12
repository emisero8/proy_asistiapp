package com.asistiapp.backend.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

/**
 * Revisa al arrancar que el secreto con el que se firman los JWT sea usable y, en producción,
 * que no sea el valor de desarrollo.
 *
 * Ese valor por defecto vive en application.yml, o sea que es público: con él cualquiera puede
 * fabricarse un token válido de Administrador. Si en producción se olvida setear JWT_SECRET, el
 * backend arrancaba igual y firmaba con la clave pública sin avisar. Ahora no arranca.
 *
 * "Producción" es el perfil de Spring "prod" (SPRING_PROFILES_ACTIVE=prod), el mismo criterio que
 * ya usa DevDataSeeder para no sembrar el Admin de desarrollo.
 */
@Slf4j
@Component
public class JwtSecretValidator {

    /** Debe coincidir con el default de app.jwt.secret en application.yml (lo verifica un test). */
    static final String SECRETO_DE_DESARROLLO =
            "TuClaveSecretaMuyLargaParaAsistiAPP_SoloParaDesarrollo_2024";

    /** HS256 exige una clave de al menos 256 bits (32 bytes). */
    static final int LONGITUD_MINIMA_BYTES = 32;

    private final String secreto;
    private final Environment environment;

    public JwtSecretValidator(@Value("${app.jwt.secret}") String secreto, Environment environment) {
        this.secreto = secreto;
        this.environment = environment;
    }

    @PostConstruct
    void validar() {
        if (secreto == null || secreto.getBytes(StandardCharsets.UTF_8).length < LONGITUD_MINIMA_BYTES) {
            // Falla en cualquier perfil: sin esto el backend arranca y cada login termina en 500
            // recién al firmar el primer token (WeakKeyException de jjwt).
            throw new IllegalStateException("JWT_SECRET es demasiado corto: HS256 necesita al menos "
                    + LONGITUD_MINIMA_BYTES + " caracteres (bytes). Definí JWT_SECRET con una clave más larga.");
        }

        if (!SECRETO_DE_DESARROLLO.equals(secreto)) {
            return;
        }

        if (environment.acceptsProfiles(Profiles.of("prod"))) {
            throw new IllegalStateException("El perfil 'prod' está activo pero JWT_SECRET no está definido: "
                    + "se estaría firmando con el secreto de desarrollo, que es público (está en el repo) y "
                    + "permite a cualquiera fabricar tokens válidos. Definí la variable de entorno JWT_SECRET "
                    + "con una clave aleatoria de al menos " + LONGITUD_MINIMA_BYTES + " caracteres.");
        }

        log.warn("JWT_SECRET no definido: se firma con el secreto de DESARROLLO, que es público. "
                + "Está bien en local; en producción hay que definir JWT_SECRET y activar el perfil 'prod'.");
    }
}
