package com.asistiapp.backend.security;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * Unit tests del filtro JWT (Fase 17): valida los cuatro escenarios posibles
 * de un token entrante — válido, expirado, malformado y ausente — sin
 * levantar contexto de Spring.
 */
@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock
    private JwtUtils jwtUtils;
    @Mock
    private UserDetailsServiceImpl userDetailsService;
    @Mock
    private HttpServletRequest request;
    @Mock
    private HttpServletResponse response;
    @Mock
    private FilterChain filterChain;

    private JwtAuthenticationFilter filter;

    @AfterEach
    void limpiarContexto() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void doFilter_sinHeaderAuthorization_noAutenticaYContinua() throws Exception {
        filter = new JwtAuthenticationFilter(jwtUtils, userDetailsService);
        when(request.getHeader("Authorization")).thenReturn(null);

        filter.doFilterInternal(request, response, filterChain);

        verifyNoInteractions(jwtUtils, userDetailsService);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilter_tokenValido_autenticaYContinua() throws Exception {
        filter = new JwtAuthenticationFilter(jwtUtils, userDetailsService);
        UserDetails userDetails = new User("organizador@test.com", "hash", Collections.emptyList());

        when(request.getHeader("Authorization")).thenReturn("Bearer token.valido");
        when(jwtUtils.extractEmail("token.valido")).thenReturn("organizador@test.com");
        when(userDetailsService.loadUserByUsername("organizador@test.com")).thenReturn(userDetails);
        when(jwtUtils.isTokenValid("token.valido", userDetails)).thenReturn(true);

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getName())
                .isEqualTo("organizador@test.com");
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilter_tokenExpirado_noAutenticaYContinua() throws Exception {
        filter = new JwtAuthenticationFilter(jwtUtils, userDetailsService);
        when(request.getHeader("Authorization")).thenReturn("Bearer token.expirado");
        when(jwtUtils.extractEmail("token.expirado")).thenThrow(mock(ExpiredJwtException.class));

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verifyNoInteractions(userDetailsService);
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilter_tokenMalformado_noAutenticaYContinua() throws Exception {
        filter = new JwtAuthenticationFilter(jwtUtils, userDetailsService);
        when(request.getHeader("Authorization")).thenReturn("Bearer token-malformado");
        when(jwtUtils.extractEmail("token-malformado")).thenThrow(new MalformedJwtException("malformado"));

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verifyNoInteractions(userDetailsService);
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilter_tokenValidoConContextoYaAutenticado_noSobreescribe() throws Exception {
        filter = new JwtAuthenticationFilter(jwtUtils, userDetailsService);
        when(request.getHeader("Authorization")).thenReturn("Bearer token.valido");
        when(jwtUtils.extractEmail("token.valido")).thenReturn("organizador@test.com");

        var authExistente = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                "otro@test.com", null, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(authExistente);

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isSameAs(authExistente);
        verifyNoInteractions(userDetailsService);
        verify(filterChain).doFilter(request, response);
    }
}
