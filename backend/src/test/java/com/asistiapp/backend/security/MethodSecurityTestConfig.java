package com.asistiapp.backend.security;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

/**
 * Activa el enforcement de @PreAuthorize dentro de un slice @WebMvcTest.
 *
 * @WebMvcTest no escanea @Configuration (como SecurityConfig, que trae
 * @EnableMethodSecurity junto con el JwtAuthenticationFilter/RateLimitFilter
 * reales y sus dependencias de base de datos). Importar esta config mínima
 * alcanza para que el AOP de método security intercepte las llamadas a los
 * controllers y aplique hasRole(...) sobre la Authentication que deja
 * @WithMockUser en el SecurityContext — sin necesitar JWT, filtros ni BD.
 */
@TestConfiguration
@EnableMethodSecurity
public class MethodSecurityTestConfig {
}
