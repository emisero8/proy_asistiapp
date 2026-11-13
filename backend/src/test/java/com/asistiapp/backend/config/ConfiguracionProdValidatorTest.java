package com.asistiapp.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mock.env.MockEnvironment;

import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ConfiguracionProdValidatorTest {

    private MockEnvironment prodCompleto() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");
        ConfiguracionProdValidator.OBLIGATORIAS_EN_PROD.keySet().forEach(p -> env.setProperty(p, "valor"));
        return env;
    }

    @Test
    void fueraDeProduccion_noExigeNada() {
        assertThatCode(() -> ConfiguracionProdValidator.validar(new MockEnvironment())).doesNotThrowAnyException();
    }

    @Test
    void enProduccionConTodoDefinido_arranca() {
        assertThatCode(() -> ConfiguracionProdValidator.validar(prodCompleto())).doesNotThrowAnyException();
    }

    @Test
    void enProduccionSinNada_nombraTodasLasVariablesQueFaltan() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        assertThatThrownBy(() -> ConfiguracionProdValidator.validar(env))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContainingAll("DB_URL", "DB_USERNAME", "DB_PASSWORD", "SMTP_HOST", "MP_ACCESS_TOKEN",
                        "MP_WEBHOOK_SECRET", "BACKEND_PUBLIC_URL", "CORS_ALLOWED_ORIGINS", "FRONTEND_BASE_URL");
    }

    @Test
    void enProduccion_unaVariableVaciaOConPlaceholderSinResolver_cuentaComoFaltante() {
        MockEnvironment env = prodCompleto();
        env.setProperty("spring.datasource.password", "  ");                      // vacía
        env.setProperty("app.cors.allowed-origins", "${CORS_ALLOWED_ORIGINS}");   // Spring la dejó sin resolver
        env.setProperty("spring.mail.host", "${UNA_QUE_NO_EXISTE}");

        assertThatThrownBy(() -> ConfiguracionProdValidator.validar(env))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContainingAll("DB_PASSWORD", "CORS_ALLOWED_ORIGINS", "SMTP_HOST")
                .hasMessageNotContaining("DB_URL");
    }

    @Test
    void laListaCoincideConLasPropiedadesSinDefaultDeApplicationProd() {
        YamlPropertiesFactoryBean yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new ClassPathResource("application-prod.yml"));
        Properties prod = yaml.getObject();

        ConfiguracionProdValidator.OBLIGATORIAS_EN_PROD.forEach((propiedad, variable) ->
                assertThat(prod.getProperty(propiedad)).as(propiedad).isEqualTo("${" + variable + "}"));
    }
}
