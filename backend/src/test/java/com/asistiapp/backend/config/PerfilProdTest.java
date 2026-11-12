package com.asistiapp.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.ClassPathResource;

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
}
