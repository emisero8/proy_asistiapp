package com.asistiapp.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filtro JWT que se ejecuta una vez por petición.
 *
 * Flujo:
 * 1. Lee el header Authorization buscando "Bearer <token>".
 * 2. Si no hay token → deja pasar (las rutas públicas no necesitan token;
 *    las privadas serán rechazadas por Spring Security después).
 * 3. Extrae el email del token sin validar la firma (solo el subject).
 * 4. Si el SecurityContext ya tiene autenticación → no hace nada (evitar doble seteo).
 * 5. Carga el UserDetails desde la BD y valida el token completo.
 * 6. Si válido → setea el Authentication en el SecurityContextHolder.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;
    private final UserDetailsServiceImpl userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        // 1. Si no hay header o no comienza con "Bearer ", pasar al siguiente filtro
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7); // Extraer el token sin "Bearer "
        String userEmail = null;

        try {
            userEmail = jwtUtils.extractEmail(jwt);
        } catch (Exception e) {
            // Token malformado o con firma inválida: loguear y dejar que
            // Spring Security rechace la petición en el siguiente paso
            log.warn("JWT inválido o malformado en la petición a {}: {}", request.getRequestURI(), e.getMessage());
            filterChain.doFilter(request, response);
            return;
        }

        // 2. Si tenemos email y el contexto de seguridad aún no está autenticado
        if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails = userDetailsService.loadUserByUsername(userEmail);

            if (jwtUtils.isTokenValid(jwt, userDetails)) {
                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null, // credentials: null porque ya estamos autenticados con JWT
                                userDetails.getAuthorities()
                        );
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                // Establecer autenticación en el contexto de seguridad de esta petición
                SecurityContextHolder.getContext().setAuthentication(authToken);
                log.debug("JWT válido. Usuario '{}' autenticado para la petición a {}",
                        userEmail, request.getRequestURI());
            }
        }

        filterChain.doFilter(request, response);
    }
}
