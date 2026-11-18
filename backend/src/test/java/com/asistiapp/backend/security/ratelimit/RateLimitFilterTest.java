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

    // Sin proxies de confianza (el default): se cuenta por la IP de la conexión.
    private final RateLimitFilter filter = new RateLimitFilter(0);

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
     * GET /tickets/orden/{uuid} y /creditos/orden/{uuid} tienen un UUID en el path, así que
     * no matchean por igualdad exacta como /auth/login — se agrupan por prefijo (RateLimitFilter.
     * resolverLimite/resolverClavePath). Confirma que, aun así, el límite (120/min) se aplica.
     */
    @Test
    void doFilter_consultaDeOrdenDeEntradas_distintasReferencias_comparteElMismoBalde() throws Exception {
        when(request.getRemoteAddr()).thenReturn("10.0.0.1");
        PrintWriter writer = mock(PrintWriter.class);
        when(response.getWriter()).thenReturn(writer);

        when(request.getRequestURI()).thenReturn("/tickets/orden/ref-1");
        for (int i = 0; i < 120; i++) {
            filter.doFilterInternal(request, response, filterChain);
        }
        verify(filterChain, times(120)).doFilter(request, response);

        // Otra referencia distinta, misma IP: comparte balde (no es "una orden" lo que se limita, es la IP)
        when(request.getRequestURI()).thenReturn("/tickets/orden/ref-2");
        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain, times(120)).doFilter(request, response); // sigue en 120, no subió
        verify(response).setStatus(429);
    }

    @Test
    void doFilter_consultaDeOrdenDeCreditos_esUnBaldeIndependienteDelDeEntradas() throws Exception {
        when(request.getRemoteAddr()).thenReturn("10.0.0.1");

        // Agota el balde de /tickets/orden/*
        when(request.getRequestURI()).thenReturn("/tickets/orden/ref-1");
        for (int i = 0; i < 120; i++) {
            filter.doFilterInternal(request, response, filterChain);
        }

        // /creditos/orden/* no se vio afectado
        when(request.getRequestURI()).thenReturn("/creditos/orden/ref-x");
        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain, times(121)).doFilter(request, response);
        verify(response, never()).setStatus(429);
    }

    // ── X-Forwarded-For: lo escribe el cliente, no se puede confiar a ciegas ─────────────────────

    /** Hace 6 logins con el X-Forwarded-For indicado por intento; devuelve cuántos pasaron. */
    private int loginsQuePasan(RateLimitFilter f, String remoteAddr, String... forwardedPorIntento) throws Exception {
        when(request.getRequestURI()).thenReturn("/auth/login");
        lenient().when(request.getRemoteAddr()).thenReturn(remoteAddr);
        lenient().when(response.getWriter()).thenReturn(mock(PrintWriter.class));

        for (String forwarded : forwardedPorIntento) {
            lenient().when(request.getHeader("X-Forwarded-For")).thenReturn(forwarded);
            f.doFilterInternal(request, response, filterChain);
        }
        return mockingDetails(filterChain).getInvocations().size();
    }

    @Test
    void doFilter_sinProxiesDeConfianza_inventarXForwardedForNoEvitaElLimite() throws Exception {
        // Un atacante cambia el header en cada intento para parecer otra IP: el límite igual debe cortarlo.
        int pasaron = loginsQuePasan(filter, "10.0.0.1",
                "1.1.1.1", "2.2.2.2", "3.3.3.3", "4.4.4.4", "5.5.5.5", "6.6.6.6", "7.7.7.7");

        org.assertj.core.api.Assertions.assertThat(pasaron).isEqualTo(5);
        verify(response, times(2)).setStatus(429);
    }

    @Test
    void doFilter_conUnProxyDeConfianza_cuentaPorLaIpQueAgregoElProxy() throws Exception {
        RateLimitFilter detrasDeProxy = new RateLimitFilter(1);

        // El primer valor es inventado y cambia; el último (agregado por nuestro proxy) es siempre el mismo cliente.
        int pasaron = loginsQuePasan(detrasDeProxy, "172.16.0.1",
                "9.9.9.1, 200.1.1.1", "9.9.9.2, 200.1.1.1", "9.9.9.3, 200.1.1.1",
                "9.9.9.4, 200.1.1.1", "9.9.9.5, 200.1.1.1", "9.9.9.6, 200.1.1.1");

        org.assertj.core.api.Assertions.assertThat(pasaron).isEqualTo(5);
        verify(response).setStatus(429);
    }

    @Test
    void doFilter_conUnProxyDeConfianza_clientesRealesDistintosNoComparteLimite() throws Exception {
        RateLimitFilter detrasDeProxy = new RateLimitFilter(1);
        when(request.getRequestURI()).thenReturn("/auth/login");
        lenient().when(request.getRemoteAddr()).thenReturn("172.16.0.1"); // siempre la IP del proxy
        lenient().when(response.getWriter()).thenReturn(mock(PrintWriter.class));

        for (int i = 0; i < 5; i++) {
            when(request.getHeader("X-Forwarded-For")).thenReturn("200.1.1.1");
            detrasDeProxy.doFilterInternal(request, response, filterChain);
        }
        // Otro cliente real detrás del mismo proxy tiene su propio balde.
        when(request.getHeader("X-Forwarded-For")).thenReturn("200.2.2.2");
        detrasDeProxy.doFilterInternal(request, response, filterChain);

        verify(filterChain, times(6)).doFilter(request, response);
        verify(response, never()).setStatus(429);
    }

    @Test
    void doFilter_conDosProxies_tomaElSegundoDesdeLaDerecha() throws Exception {
        RateLimitFilter detrasDeDos = new RateLimitFilter(2);

        // [inventado, cliente real, ip del primer proxy]: el cliente real es el 2º desde la derecha.
        int pasaron = loginsQuePasan(detrasDeDos, "172.16.0.1",
                "7.7.7.1, 200.1.1.1, 10.1.1.1", "7.7.7.2, 200.1.1.1, 10.1.1.1", "7.7.7.3, 200.1.1.1, 10.1.1.1",
                "7.7.7.4, 200.1.1.1, 10.1.1.1", "7.7.7.5, 200.1.1.1, 10.1.1.1", "7.7.7.6, 200.1.1.1, 10.1.1.1");

        org.assertj.core.api.Assertions.assertThat(pasaron).isEqualTo(5);
    }

    @Test
    void doFilter_conProxyConfigurado_peroSinHeader_cuentaPorLaIpDeLaConexion() throws Exception {
        RateLimitFilter detrasDeProxy = new RateLimitFilter(1);

        // Pedido que no pasó por el proxy (header ausente o vacío): no hay nada de qué fiarse, vale la conexión.
        int pasaron = loginsQuePasan(detrasDeProxy, "10.0.0.7", null, "", " ", null, null, null);

        org.assertj.core.api.Assertions.assertThat(pasaron).isEqualTo(5);
    }

    @Test
    void doFilter_conDosProxies_peroHeaderConUnSoloValor_cuentaPorLaIpDeLaConexion() throws Exception {
        RateLimitFilter detrasDeDos = new RateLimitFilter(2);

        // Un solo valor no alcanza para dos proxies: se ignora y se usa la conexión.
        int pasaron = loginsQuePasan(detrasDeDos, "10.0.0.7",
                "1.1.1.1", "2.2.2.2", "3.3.3.3", "4.4.4.4", "5.5.5.5", "6.6.6.6");

        org.assertj.core.api.Assertions.assertThat(pasaron).isEqualTo(5);
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
