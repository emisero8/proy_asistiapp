package com.asistiapp.backend.controllers;

import com.asistiapp.backend.models.dtos.publico.EstadisticasPublicasResponseDTO;
import com.asistiapp.backend.security.JwtAuthenticationFilter;
import com.asistiapp.backend.security.ratelimit.RateLimitFilter;
import com.asistiapp.backend.services.CreditoService;
import com.asistiapp.backend.services.EstadisticasPublicasService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Enforcement de rol a nivel HTTP para la información pública de la landing
 * (estadísticas agregadas y paquetes de crédito) — mismo criterio que
 * EventoPublicoControllerSecurityTest: el controller no declara ningún
 * @PreAuthorize, la "publicidad" real la impone SecurityConfig (permitAll
 * para GET /public/**), acá solo se confirma que el controller en sí no
 * exige ningún rol para responder.
 */
@WebMvcTest(controllers = InfoPublicaController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE,
                classes = {JwtAuthenticationFilter.class, RateLimitFilter.class}))
@AutoConfigureMockMvc(addFilters = false)
class InfoPublicaControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EstadisticasPublicasService estadisticasPublicasService;

    @MockBean
    private CreditoService creditoService;

    @Test
    void obtenerEstadisticas_sinAutenticacion_devuelve200() throws Exception {
        when(estadisticasPublicasService.obtenerEstadisticas())
                .thenReturn(EstadisticasPublicasResponseDTO.builder().build());

        mockMvc.perform(get("/public/estadisticas"))
                .andExpect(status().isOk());
    }

    @Test
    void listarPaquetesCredito_sinAutenticacion_devuelve200() throws Exception {
        when(creditoService.listarPaquetesDisponibles()).thenReturn(List.of());

        mockMvc.perform(get("/public/paquetes-credito"))
                .andExpect(status().isOk());
    }
}
