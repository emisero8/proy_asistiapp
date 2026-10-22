package com.asistiapp.backend.controllers;

import com.asistiapp.backend.exceptions.PasarelaPagoException;
import com.asistiapp.backend.security.JwtAuthenticationFilter;
import com.asistiapp.backend.security.ratelimit.RateLimitFilter;
import com.asistiapp.backend.services.MercadoPagoFirmaValidator;
import com.asistiapp.backend.services.PagoWebhookService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Contrato HTTP del webhook de MercadoPago: sin firma válida no se procesa nada,
 * y solo lo que necesita reintento devuelve error.
 * (Que la ruta sea pública para Spring Security lo cubre SecurityConfig, igual que
 * en los otros tests de controller, que corren con los filtros deshabilitados.)
 */
@WebMvcTest(controllers = MercadoPagoWebhookController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE,
                classes = {JwtAuthenticationFilter.class, RateLimitFilter.class}))
@AutoConfigureMockMvc(addFilters = false)
class MercadoPagoWebhookControllerTest {

    private static final String BODY_PAGO = "{\"type\":\"payment\",\"data\":{\"id\":\"123456\"}}";

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MercadoPagoFirmaValidator firmaValidator;
    @MockBean
    private PagoWebhookService pagoWebhookService;

    @Test
    void firmaInvalida_devuelve401YNoProcesaNada() throws Exception {
        when(firmaValidator.esValida(any(), any(), any())).thenReturn(false);

        mockMvc.perform(post("/payments/mercadopago/webhook?data.id=123456&type=payment")
                        .contentType(MediaType.APPLICATION_JSON).content(BODY_PAGO))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(pagoWebhookService);
    }

    @Test
    void firmaValida_procesaElPagoDeLaQueryString() throws Exception {
        when(firmaValidator.esValida("ts=1,v1=abc", "req-1", "123456")).thenReturn(true);

        mockMvc.perform(post("/payments/mercadopago/webhook?data.id=123456&type=payment")
                        .header("x-signature", "ts=1,v1=abc")
                        .header("x-request-id", "req-1")
                        .contentType(MediaType.APPLICATION_JSON).content(BODY_PAGO))
                .andExpect(status().isOk());

        verify(pagoWebhookService).procesarNotificacionPago(123456L);
    }

    @Test
    void firmaValida_sinQueryString_tomaElIdDelBody() throws Exception {
        when(firmaValidator.esValida(any(), any(), any())).thenReturn(true);

        mockMvc.perform(post("/payments/mercadopago/webhook")
                        .contentType(MediaType.APPLICATION_JSON).content(BODY_PAGO))
                .andExpect(status().isOk());

        verify(pagoWebhookService).procesarNotificacionPago(123456L);
    }

    @Test
    void notificacionQueNoEsDePago_seIgnoraConOk() throws Exception {
        when(firmaValidator.esValida(any(), any(), any())).thenReturn(true);

        mockMvc.perform(post("/payments/mercadopago/webhook?data.id=55&type=merchant_order")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"merchant_order\",\"data\":{\"id\":\"55\"}}"))
                .andExpect(status().isOk());

        verify(pagoWebhookService, never()).procesarNotificacionPago(anyLong());
    }

    @Test
    void idDePagoNoNumerico_devuelve400() throws Exception {
        when(firmaValidator.esValida(any(), any(), any())).thenReturn(true);

        mockMvc.perform(post("/payments/mercadopago/webhook?data.id=abc&type=payment")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"payment\"}"))
                .andExpect(status().isBadRequest());

        verify(pagoWebhookService, never()).procesarNotificacionPago(anyLong());
    }

    @Test
    void avisoIpnDelFormatoViejo_seTrataIgualQueElWebhook() throws Exception {
        when(firmaValidator.esValida("ts=1,v1=abc", "req-1", "123456")).thenReturn(true);

        mockMvc.perform(post("/payments/mercadopago/webhook?id=123456&topic=payment")
                        .header("x-signature", "ts=1,v1=abc")
                        .header("x-request-id", "req-1"))
                .andExpect(status().isOk());

        verify(pagoWebhookService).procesarNotificacionPago(123456L);
    }

    @Test
    void avisoIpnDeMerchantOrder_seIgnoraConOk() throws Exception {
        when(firmaValidator.esValida(any(), any(), any())).thenReturn(true);

        mockMvc.perform(post("/payments/mercadopago/webhook?id=45290772479&topic=merchant_order"))
                .andExpect(status().isOk());

        verify(pagoWebhookService, never()).procesarNotificacionPago(anyLong());
    }

    @Test
    void errorTransitorioDeMercadoPago_devuelve5xxParaQueReintente() throws Exception {
        when(firmaValidator.esValida(any(), any(), any())).thenReturn(true);
        doThrow(new PasarelaPagoException("MP caído")).when(pagoWebhookService).procesarNotificacionPago(eq(123456L));

        mockMvc.perform(post("/payments/mercadopago/webhook?data.id=123456&type=payment")
                        .contentType(MediaType.APPLICATION_JSON).content(BODY_PAGO))
                .andExpect(status().isBadGateway());
    }
}
