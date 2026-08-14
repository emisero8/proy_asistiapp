package com.asistiapp.backend.controllers;

import com.asistiapp.backend.security.JwtAuthenticationFilter;
import com.asistiapp.backend.security.ratelimit.RateLimitFilter;
import com.asistiapp.backend.services.EventoPublicoService;
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
 * Enforcement de rol a nivel HTTP para el catálogo público de eventos
 * (Fase 17) — representa el nivel de acceso "público" del sistema: el
 * Comprador nunca tiene JWT (CU-015/016), así que este controller no
 * declara ningún @PreAuthorize.
 *
 * Los filtros se desactivan (addFilters = false) porque la "publicidad"
 * real la impone SecurityConfig a nivel de ruta (permitAll para GET
 * /public/**), que es infraestructura de otro slice — acá solo se
 * confirma que el controller en sí no exige ningún rol para responder.
 * JwtAuthenticationFilter/RateLimitFilter además se excluyen del scan
 * porque @WebMvcTest los detecta como beans Filter y fallarían al
 * construirse sin JwtUtils/UsuarioRepository reales.
 */
@WebMvcTest(controllers = EventoPublicoController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE,
                classes = {JwtAuthenticationFilter.class, RateLimitFilter.class}))
@AutoConfigureMockMvc(addFilters = false)
class EventoPublicoControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EventoPublicoService eventoPublicoService;

    @Test
    void listarPublicados_sinAutenticacion_devuelve200() throws Exception {
        when(eventoPublicoService.listarPublicados()).thenReturn(List.of());

        mockMvc.perform(get("/public/eventos"))
                .andExpect(status().isOk());
    }
}
