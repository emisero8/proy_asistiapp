package com.asistiapp.backend.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Con el perfil "prod" el backend no arranca si falta alguna variable obligatoria.
 *
 * Es un EnvironmentPostProcessor (registrado en META-INF/spring.factories) y no un bean: tiene que correr
 * antes de que Spring cree la conexión a la base, que si no falla primero con un error de driver confuso.
 *
 * application-prod.yml declara esas propiedades sin valor por defecto (${DB_URL}, etc.), pero Spring Boot
 * deja el texto "${DB_URL}" tal cual cuando no puede resolverlo en vez de fallar: la base fallaba con un
 * error de driver poco claro y cosas como CORS, la URL del frontend o el servidor de mail quedaban con el
 * texto literal, sin ningún aviso. Este validador convierte ese olvido en un error claro al arrancar,
 * que nombra todas las variables que faltan de una vez.
 *
 * "Producción" es el perfil "prod", el mismo criterio que JwtSecretValidator y AdminInicialSeeder
 * (JWT_SECRET lo controla JwtSecretValidator). Fuera de producción no hace nada.
 */
public class ConfiguracionProdValidator implements EnvironmentPostProcessor, Ordered {

    /** Propiedad de Spring → variable de entorno que la define. Debe coincidir con application-prod.yml (lo verifica un test). */
    static final Map<String, String> OBLIGATORIAS_EN_PROD = new LinkedHashMap<>();
    static {
        OBLIGATORIAS_EN_PROD.put("spring.datasource.url", "DB_URL");
        OBLIGATORIAS_EN_PROD.put("spring.datasource.username", "DB_USERNAME");
        OBLIGATORIAS_EN_PROD.put("spring.datasource.password", "DB_PASSWORD");
        OBLIGATORIAS_EN_PROD.put("spring.mail.host", "SMTP_HOST");
        OBLIGATORIAS_EN_PROD.put("app.mercadopago.access-token", "MP_ACCESS_TOKEN");
        OBLIGATORIAS_EN_PROD.put("app.mercadopago.webhook-secret", "MP_WEBHOOK_SECRET");
        OBLIGATORIAS_EN_PROD.put("app.mercadopago.backend-public-url", "BACKEND_PUBLIC_URL");
        OBLIGATORIAS_EN_PROD.put("app.cors.allowed-origins", "CORS_ALLOWED_ORIGINS");
        OBLIGATORIAS_EN_PROD.put("app.frontend-base-url", "FRONTEND_BASE_URL");
    }

    /** Después de cargar application*.yml y el .env (ConfigData corre con HIGHEST_PRECEDENCE + 10). */
    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        validar(environment);
    }

    static void validar(Environment environment) {
        if (!environment.acceptsProfiles(Profiles.of("prod"))) {
            return;
        }

        List<String> faltantes = new ArrayList<>();
        OBLIGATORIAS_EN_PROD.forEach((propiedad, variable) -> {
            if (estaSinDefinir(environment, propiedad)) {
                faltantes.add(variable);
            }
        });

        if (!faltantes.isEmpty()) {
            throw new IllegalStateException("El perfil 'prod' está activo pero faltan variables de entorno "
                    + "obligatorias: " + String.join(", ", faltantes) + ". En producción no se usan los valores "
                    + "por defecto de desarrollo (base con contraseña pública, URLs en localhost, MailHog). "
                    + "Definilas y volvé a arrancar (ver la tabla de variables del README).");
        }
    }

    private static boolean estaSinDefinir(Environment environment, String propiedad) {
        String valor;
        try {
            valor = environment.getProperty(propiedad);
        } catch (IllegalArgumentException noSePudoResolver) {
            return true; // placeholder ${VARIABLE} sin valor
        }
        return valor == null || valor.isBlank() || valor.contains("${");
    }
}
