package com.asistiapp.backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Documentación interactiva de la API (Swagger UI en /swagger-ui.html,
 * spec cruda en /v3/api-docs) — pensada para que el Frontend pueda
 * explorar todos los endpoints, DTOs y códigos de respuesta sin tener
 * que leer el código del backend.
 *
 * Define el esquema "bearerAuth" para que el botón "Authorize" de
 * Swagger UI permita pegar un JWT y probar los endpoints protegidos
 * directamente desde el navegador.
 */
@Configuration
public class OpenApiConfig {

    private static final String BEARER_SCHEME_NAME = "bearerAuth";

    @Bean
    public OpenAPI asistiAppOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("AsistíAPP API")
                        .description("API REST del sistema de venta de entradas y control de acceso AsistíAPP. " +
                                "La mayoría de los endpoints de organizador/staff/admin requieren un JWT " +
                                "(header Authorization: Bearer <token>) obtenido en POST /auth/login. " +
                                "Los endpoints bajo /public/** y la compra online (/tickets/comprar-online, " +
                                "/tickets/webhook/pago) son de acceso libre, ya que el Comprador nunca inicia sesión.")
                        .version("v1")
                        .contact(new Contact().name("AsistíAPP")))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME_NAME))
                .components(new Components()
                        .addSecuritySchemes(BEARER_SCHEME_NAME, new SecurityScheme()
                                .name(BEARER_SCHEME_NAME)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
