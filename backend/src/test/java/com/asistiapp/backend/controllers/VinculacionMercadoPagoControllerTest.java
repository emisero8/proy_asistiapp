package com.asistiapp.backend.controllers;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.PasarelaPagoException;
import com.asistiapp.backend.models.dtos.mercadopago.EstadoCuentaMpResponseDTO;
import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.security.SecurityUtils;
import com.asistiapp.backend.services.VinculacionMercadoPagoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VinculacionMercadoPagoControllerTest {

    @Mock
    private VinculacionMercadoPagoService servicio;
    @Mock
    private SecurityUtils securityUtils;

    private VinculacionMercadoPagoController controller;

    @BeforeEach
    void setUp() {
        controller = new VinculacionMercadoPagoController(servicio, securityUtils, "https://front.test");
    }

    private void organizadorAutenticado() {
        Organizador org = mock(Organizador.class);
        when(org.getId()).thenReturn(7L);
        when(securityUtils.getOrganizadorAutenticado()).thenReturn(org);
    }

    @Test
    void vincular_devuelveLaUrlDeAutorizacionParaQueElFrontendRedirija() {
        organizadorAutenticado();
        when(servicio.iniciar(7L)).thenReturn("https://auth.mp/authorization?state=abc");

        var respuesta = controller.vincular();

        assertThat(respuesta.getBody().getUrlAutorizacion()).isEqualTo("https://auth.mp/authorization?state=abc");
    }

    @Test
    void estado_devuelveElEstadoDelOrganizadorAutenticado() {
        organizadorAutenticado();
        EstadoCuentaMpResponseDTO dto = EstadoCuentaMpResponseDTO.builder().vinculada(true).build();
        when(servicio.estado(7L)).thenReturn(dto);

        assertThat(controller.estado().getBody()).isSameAs(dto);
    }

    @Test
    void desvincular_respondeSinContenido() {
        organizadorAutenticado();

        var respuesta = controller.desvincular();

        verify(servicio).desvincular(7L);
        assertThat(respuesta.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }

    @Test
    void callback_ok_redirigeAlPerfilConMpOk() {
        var r = controller.callback("codigo", "st", null);

        verify(servicio).completar("st", "codigo");
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.FOUND);
        assertThat(r.getHeaders().getLocation().toString()).isEqualTo("https://front.test/organizador/perfil?mp=ok");
    }

    @Test
    void callback_siElOrganizadorNoAutorizo_redirigeConMpCancelado() {
        var r = controller.callback(null, "st", "access_denied");

        assertThat(r.getHeaders().getLocation().toString()).isEqualTo("https://front.test/organizador/perfil?mp=cancelado");
        org.mockito.Mockito.verifyNoInteractions(servicio);
    }

    @Test
    void callback_siSeRechazaElStateOLaPasarelaFalla_redirigeConMpError() {
        org.mockito.Mockito.doThrow(new BusinessRuleException("vencido")).when(servicio).completar("st", "c1");
        org.mockito.Mockito.doThrow(new PasarelaPagoException("caída")).when(servicio).completar("st", "c2");

        assertThat(controller.callback("c1", "st", null).getHeaders().getLocation().toString()).endsWith("?mp=error");
        assertThat(controller.callback("c2", "st", null).getHeaders().getLocation().toString()).endsWith("?mp=error");
    }

    @Test
    void callback_sinCodigoNiState_redirigeConMpError() {
        assertThat(controller.callback(null, null, null).getHeaders().getLocation().toString()).endsWith("?mp=error");
    }
}
