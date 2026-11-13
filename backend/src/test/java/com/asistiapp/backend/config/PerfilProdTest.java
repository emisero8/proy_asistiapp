package com.asistiapp.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.ClassPathResource;

import java.util.List;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;

/** Lo que el perfil "prod" tiene que pisar respecto del application.yml de desarrollo. */
class PerfilProdTest {

    private Properties cargar(String archivo) {
        YamlPropertiesFactoryBean yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new ClassPathResource(archivo));
        return yaml.getObject();
    }

    @Test
    void desarrolloImprimeElSql_yProduccionNo() {
        assertThat(cargar("application.yml").getProperty("spring.jpa.show-sql")).isEqualTo("true");

        Properties prod = cargar("application-prod.yml");
        assertThat(prod.getProperty("spring.jpa.show-sql")).isEqualTo("false");
        assertThat(prod.getProperty("spring.jpa.properties.hibernate.format_sql")).isEqualTo("false");
    }

    @Test
    void produccionExigeLasVariablesQueEnDesarrolloTienenDefaultPublico() {
        Properties prod = cargar("application-prod.yml");
        // Sin valor por defecto: si falta la variable, el backend no arranca.
        for (String clave : List.of("spring.datasource.url", "spring.datasource.username", "spring.datasource.password",
                "spring.mail.host", "app.mercadopago.access-token", "app.mercadopago.webhook-secret",
                "app.mercadopago.backend-public-url", "app.cors.allowed-origins", "app.frontend-base-url")) {
            assertThat(prod.getProperty(clave)).as(clave).matches("\\$\\{[A-Z_]+}");
        }
    }

    @Test
    void produccionBajaElNivelDeLogYNoExponeMensajesInternos() {
        assertThat(cargar("application.yml").getProperty("logging.level.com.asistiapp")).isEqualTo("DEBUG");

        Properties prod = cargar("application-prod.yml");
        assertThat(prod.getProperty("logging.level.com.asistiapp")).isEqualTo("INFO");
        assertThat(prod.getProperty("logging.level.org.springframework.security")).isEqualTo("WARN");
        assertThat(prod.getProperty("server.error.include-message")).isEqualTo("never");
    }
}
