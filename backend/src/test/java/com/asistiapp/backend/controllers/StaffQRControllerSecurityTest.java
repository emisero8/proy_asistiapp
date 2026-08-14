package com.asistiapp.backend.controllers;

import com.asistiapp.backend.models.dtos.validacion.ValidacionQRResponseDTO;
import com.asistiapp.backend.models.entities.StaffQR;
import com.asistiapp.backend.security.JwtAuthenticationFilter;
import com.asistiapp.backend.security.MethodSecurityTestConfig;
import com.asistiapp.backend.security.SecurityUtils;
import com.asistiapp.backend.security.ratelimit.RateLimitFilter;
import com.asistiapp.backend.services.StaffQRService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Enforcement de rol a nivel HTTP para un controller exclusivo de Staff_QR
 * (Fase 17) — representa el nivel de acceso "Staff" del sistema.
 *
 * Ver EventoControllerSecurityTest sobre por qué se excluyen los Filter reales.
 */
@WebMvcTest(controllers = StaffQRController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE,
                classes = {JwtAuthenticationFilter.class, RateLimitFilter.class}))
@Import(MethodSecurityTestConfig.class)
class StaffQRControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private StaffQRService staffQRService;
    @MockBean
    private SecurityUtils securityUtils;

    @Test
    @WithMockUser(roles = "Staff_QR")
    void consultarEstadoQR_conRolStaffQR_devuelve200() throws Exception {
        StaffQR staffQR = new StaffQR();
        staffQR.setId(1L);
        when(securityUtils.getStaffQRAutenticado()).thenReturn(staffQR);
        when(staffQRService.consultarEstadoQR(anyString(), any(StaffQR.class)))
                .thenReturn(ValidacionQRResponseDTO.builder().valido(true).mensaje("OK").build());

        mockMvc.perform(get("/tickets/validate/QR-ABC123"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "Organizador")
    void consultarEstadoQR_conRolIncorrecto_devuelve403() throws Exception {
        mockMvc.perform(get("/tickets/validate/QR-ABC123"))
                .andExpect(status().isForbidden());
    }
}
