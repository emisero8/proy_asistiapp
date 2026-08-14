package com.asistiapp.backend.security;

import com.asistiapp.backend.security.ratelimit.RateLimitFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Configuración central de Spring Security para AsistíAPP.
 *
 * Decisiones de diseño:
 *  - CSRF deshabilitado: API stateless, los clientes son apps SPA/móvil.
 *  - Sesiones: STATELESS — no se crea ni usa HttpSession.
 *  - Autenticación: JWT solamente, via JwtAuthenticationFilter.
 *  - @EnableMethodSecurity: habilita @PreAuthorize para control de acceso
 *    granular a nivel de método en controllers y services.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final UserDetailsServiceImpl userDetailsService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RateLimitFilter rateLimitFilter;

    /** Orígenes permitidos para CORS, separados por coma. Configurable por entorno (app.cors.allowed-origins). */
    @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:3000}")
    private List<String> corsAllowedOrigins;

    // ─────────────────────────────────────────────
    // Beans de seguridad
    // ─────────────────────────────────────────────

    /**
     * PasswordEncoder usando BCrypt con strength por defecto (10 rounds).
     * Se usa para hashear contraseñas en registro y para verificarlas en login.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * DaoAuthenticationProvider: vincula el UserDetailsService con el PasswordEncoder.
     * Spring Security lo usará al llamar a AuthenticationManager.authenticate().
     */
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    /**
     * AuthenticationManager: punto de entrada para lanzar la autenticación
     * programáticamente desde AuthService.login().
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    /**
     * CORS: sin esto, ninguna request desde el Frontend (otro origen) pasa
     * el preflight del navegador — Spring Security no agrega headers CORS
     * si no hay una CorsConfigurationSource registrada, aunque el CorsFilter
     * esté en la cadena.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(corsAllowedOrigins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    // ─────────────────────────────────────────────
    // Cadena de filtros de seguridad
    // ─────────────────────────────────────────────

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Sin CSRF: API REST stateless
                .csrf(AbstractHttpConfigurer::disable)

                // Habilita CORS usando el bean corsConfigurationSource() de arriba
                .cors(Customizer.withDefaults())

                // Sin sesiones HTTP
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Reglas de autorización por rutas
                .authorizeHttpRequests(auth -> auth
                        // Rutas públicas de autenticación
                        .requestMatchers("/auth/**").permitAll()
                        // Catálogo público de eventos: el Comprador NUNCA inicia sesión (CU-015/016)
                        .requestMatchers(HttpMethod.GET, "/public/**").permitAll()
                        // Compra de entradas online: el Comprador la inicia y confirma sin JWT (CU-017)
                        .requestMatchers(HttpMethod.POST, "/tickets/comprar-online", "/tickets/webhook/pago").permitAll()
                        // Imagen QR (Fase 16): el Comprador tampoco tiene JWT acá — la autorización
                        // fina (dueño del codigoQr u Organizador del evento) se hace en VentaService
                        .requestMatchers(HttpMethod.GET, "/tickets/*/qr-image").permitAll()
                        // Webhooks de MercadoPago: los invoca el proveedor de pagos, no un usuario logueado
                        .requestMatchers(HttpMethod.POST, "/creditos/webhook/pago").permitAll()
                        // Documentación interactiva de la API (Swagger UI + spec OpenAPI)
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
                        // Todo lo demás requiere autenticación
                        .anyRequest().authenticated()
                )

                // Proveedor de autenticación DAO
                .authenticationProvider(authenticationProvider())

                // Nuestro filtro JWT va ANTES del filtro de usuario/contraseña de Spring
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                // Rate limiting corre primero: corta el abuso antes de gastar ciclos en JWT/auth
                .addFilterBefore(rateLimitFilter, JwtAuthenticationFilter.class);

        return http.build();
    }
}
