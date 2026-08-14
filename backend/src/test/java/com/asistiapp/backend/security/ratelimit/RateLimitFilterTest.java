package com.asistiapp.backend.security.ratelimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.PrintWriter;
import java.time.Duration;

import static org.mockito.Mockito.*;

/**
 * Unit tests del rate limiting en memoria (Fase 17): confirma que el bucket
 * se agota tras alcanzar la capacidad configurada para una ruta sensible
 * (ej. /auth/login, 5/min) y que las rutas no listadas nunca se limitan.
 */
@ExtendWith(MockitoExtension.class)
class RateLimitFilterTest {

    @Mock
    private HttpServletRequest request;
    @Mock
    private HttpServletResponse response;
    @Mock
    private FilterChain filterChain;

    private final RateLimitFilter filter = new RateLimitFilter();

    @Test
    void doFilter_rutaSinLimiteConfigurado_nuncaBloquea() throws Exception {
        when(request.getRequestURI()).thenReturn("/eventos");

        for (int i = 0; i < 50; i++) {
            filter.doFilterInternal(request, response, filterChain);
        }

        verify(filterChain, times(50)).doFilter(request, response);
        verify(response, never()).setStatus(429);
    }

    @Test
    void doFilter_login_permiteHastaLaCapacidadYLuegoBloquea() throws Exception {
        when(request.getRequestURI()).thenReturn("/auth/login");
        when(request.getRemoteAddr()).thenReturn("10.0.0.1");
        PrintWriter writer = mock(PrintWriter.class);
        when(response.getWriter()).thenReturn(writer);

        // Capacidad configurada para /auth/login: 5 por minuto (ver RateLimitFilter.LIMITES)
        for (int i = 0; i < 5; i++) {
            filter.doFilterInternal(request, response, filterChain);
        }
        verify(filterChain, times(5)).doFilter(request, response);

        // La 6ta request desde la misma IP excede la capacidad
        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain, times(5)).doFilter(request, response); // sigue en 5, no subió
        verify(response).setStatus(429);
    }

    @Test
    void doFilter_ipsDistintas_tienenBucketsIndependientes() throws Exception {
        when(request.getRequestURI()).thenReturn("/auth/login");

        // Agota el bucket de la primera IP
        when(request.getRemoteAddr()).thenReturn("10.0.0.1");
        for (int i = 0; i < 5; i++) {
            filter.doFilterInternal(request, response, filterChain);
        }

        // La primera request de una IP distinta no debería estar afectada
        when(request.getRemoteAddr()).thenReturn("10.0.0.2");
        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain, times(6)).doFilter(request, response);
        verify(response, never()).setStatus(429);
    }

    /**
     * Verifica el refill de Bucket4j usando la misma construcción que
     * RateLimitFilter.crearBucket (Bandwidth.classic + Refill.intervally),
     * pero con una ventana corta para no depender de esperar minutos reales.
     */
    @Test
    void bucket_seReponeUnaVezPasadaLaVentana() throws Exception {
        Bandwidth limite = Bandwidth.classic(1, Refill.intervally(1, Duration.ofMillis(150)));
        Bucket bucket = Bucket.builder().addLimit(limite).build();

        org.assertj.core.api.Assertions.assertThat(bucket.tryConsume(1)).isTrue();
        org.assertj.core.api.Assertions.assertThat(bucket.tryConsume(1)).isFalse();

        Thread.sleep(200);

        org.assertj.core.api.Assertions.assertThat(bucket.tryConsume(1)).isTrue();
    }
}
