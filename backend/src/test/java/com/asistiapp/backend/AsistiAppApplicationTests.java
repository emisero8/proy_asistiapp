package com.asistiapp.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Smoke test: verifica que el contexto de Spring Boot cargue correctamente
 * con todos los beans definidos (Security, JPA, JWT, etc.) sin errores.
 *
 * Usa el perfil "test" para poder levantar sin una base de datos real,
 * usando una H2 en memoria si está disponible, o fallará si la BD es
 * estrictamente necesaria.
 */
@SpringBootTest
@ActiveProfiles("test")
class AsistiAppApplicationTests {

    @Test
    void contextLoads() {
        // Si el contexto de Spring levanta sin excepciones, el test pasa.
    }
}
