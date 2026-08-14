package com.asistiapp.backend.controllers;

import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.security.JwtAuthenticationFilter;
import com.asistiapp.backend.security.MethodSecurityTestConfig;
import com.asistiapp.backend.security.SecurityUtils;
import com.asistiapp.backend.security.ratelimit.RateLimitFilter;
import com.asistiapp.backend.services.EventoService;
import com.asistiapp.backend.services.MetricasOrganizadorService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Enforcement de rol a nivel HTTP para un controller exclusivo de Organizador
 * (Fase 17) — representa el nivel de acceso "Organizador" del sistema.
 *
 * Se excluyen JwtAuthenticationFilter/RateLimitFilter del slice: @WebMvcTest
 * también escanea beans Filter, y estos dos necesitan JwtUtils/UsuarioRepository
 * reales que no aplican acá — el enforcement de rol se prueba vía
 * MethodSecurityTestConfig + @WithMockUser, no vía los filtros HTTP reales.
 */
@WebMvcTest(controllers = EventoController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE,
                classes = {JwtAuthenticationFilter.class, RateLimitFilter.class}))
@Import(MethodSecurityTestConfig.class)
class EventoControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EventoService eventoService;
    @MockBean
    private MetricasOrganizadorService metricasOrganizadorService;
    @MockBean
    private SecurityUtils securityUtils;

    @Test
    @WithMockUser(roles = "Organizador")
    void listarMisEventos_conRolOrganizador_devuelve200() throws Exception {
        Organizador organizador = new Organizador();
        organizador.setId(1L);
        when(securityUtils.getOrganizadorAutenticado()).thenReturn(organizador);
        when(eventoService.listarMisEventos(1L)).thenReturn(List.of());

        mockMvc.perform(get("/eventos"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "Staff_QR")
    void listarMisEventos_conRolIncorrecto_devuelve403() throws Exception {
        mockMvc.perform(get("/eventos"))
                .andExpect(status().isForbidden());
    }
}
