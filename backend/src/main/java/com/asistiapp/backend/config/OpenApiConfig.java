package com.asistiapp.backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.utils.SpringDocUtils;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalTime;

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

    static {
        // Sin esto springdoc documenta LocalTime como un objeto {hour, minute, second, nano}, pero Jackson lo
        // manda y lo recibe como texto "HH:mm:ss" (horaEvento). El Swagger UI invitaba a enviar un objeto y los
        // tipos generados para el frontend salían mal.
        SpringDocUtils.getConfig().replaceWithSchema(LocalTime.class, new StringSchema().format("time").example("21:00:00"));
    }

    @Bean
    public OpenAPI asistiAppOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("AsistíAPP API")
                        .description("API REST del sistema de venta de entradas y control de acceso AsistíAPP. " +
                                "La mayoría de los endpoints de organizador/staff/admin requieren un JWT " +
                                "(header Authorization: Bearer <token>) obtenido en POST /auth/login. " +
                                "Los endpoints bajo /public/** y la compra online (/tickets/comprar-online, " +
                                "/payments/mercadopago/webhook, este último autenticado por firma) son de acceso libre, ya que el Comprador nunca inicia sesión.")
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
