package com.asistiapp.backend.controllers.admin;

import com.asistiapp.backend.security.JwtAuthenticationFilter;
import com.asistiapp.backend.security.MethodSecurityTestConfig;
import com.asistiapp.backend.security.ratelimit.RateLimitFilter;
import com.asistiapp.backend.services.admin.AdminUsuarioService;
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
 * Enforcement de rol a nivel HTTP para un controller exclusivo de Administrador
 * (Fase 17) — representa el nivel de acceso "Admin" del sistema.
 *
 * Ver EventoControllerSecurityTest sobre por qué se excluyen los Filter reales.
 */
@WebMvcTest(controllers = AdminUsuarioController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE,
                classes = {JwtAuthenticationFilter.class, RateLimitFilter.class}))
@Import(MethodSecurityTestConfig.class)
class AdminUsuarioControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AdminUsuarioService adminUsuarioService;

    @Test
    @WithMockUser(roles = "Administrador")
    void listarUsuarios_conRolAdministrador_devuelve200() throws Exception {
        when(adminUsuarioService.listarUsuarios(null, null)).thenReturn(List.of());

        mockMvc.perform(get("/admin/usuarios"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "Organizador")
    void listarUsuarios_conRolIncorrecto_devuelve403() throws Exception {
        mockMvc.perform(get("/admin/usuarios"))
                .andExpect(status().isForbidden());
    }
}
