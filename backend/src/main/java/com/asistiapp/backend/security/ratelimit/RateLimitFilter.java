package com.asistiapp.backend.security.ratelimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiting en memoria por IP para los endpoints públicos más sensibles
 * a fuerza bruta y abuso (SECURITY.md §5: login, recuperación de contraseña,
 * transacciones de pago). El resto de la API no pasa por este filtro.
 *
 * Limitación conocida: al vivir en memoria, el límite no se comparte entre
 * instancias si el backend escala horizontalmente — para eso haría falta
 * un backend distribuido (ej. Redis). Suficiente para una sola instancia.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private record LimiteConfig(int capacidad, Duration ventana) {}

    private static final Map<String, LimiteConfig> LIMITES = Map.of(
            "/auth/login", new LimiteConfig(5, Duration.ofMinutes(1)),
            "/auth/recuperar-password", new LimiteConfig(3, Duration.ofMinutes(5)),
            "/tickets/webhook/pago", new LimiteConfig(30, Duration.ofMinutes(1)),
            "/creditos/webhook/pago", new LimiteConfig(30, Duration.ofMinutes(1))
    );

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        LimiteConfig limite = LIMITES.get(request.getRequestURI());
        if (limite == null) {
            filterChain.doFilter(request, response);
            return;
        }

        String clave = request.getRequestURI() + ":" + obtenerIpCliente(request);
        Bucket bucket = buckets.computeIfAbsent(clave, k -> crearBucket(limite));

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else {
            responderLimiteExcedido(response, request.getRequestURI());
        }
    }

    private Bucket crearBucket(LimiteConfig limite) {
        Bandwidth limit = Bandwidth.classic(limite.capacidad(),
                Refill.intervally(limite.capacidad(), limite.ventana()));
        return Bucket.builder().addLimit(limit).build();
    }

    private String obtenerIpCliente(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    /** Mismo formato de error que GlobalExceptionHandler — este filtro corre antes del DispatcherServlet. */
    private void responderLimiteExcedido(HttpServletResponse response, String path) throws IOException {
        response.setStatus(429); // Too Many Requests — no está definido como constante en HttpServletResponse
        response.setContentType("application/json");
        response.getWriter().write(String.format(
                "{\"status\":429,\"error\":\"Demasiadas solicitudes, intentá de nuevo en unos minutos\",\"path\":\"%s\",\"timestamp\":\"%s\"}",
                path, LocalDateTime.now()));
    }
}
