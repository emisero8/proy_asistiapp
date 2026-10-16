package com.asistiapp.backend.services;

import com.asistiapp.backend.config.MercadoPagoConfig;
import com.asistiapp.backend.exceptions.PasarelaPagoException;
import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.client.payment.PaymentRefundClient;
import com.mercadopago.client.preference.PreferenceClient;
import com.mercadopago.client.preference.PreferenceRequest;
import com.mercadopago.resources.preference.Preference;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Elegir la URL de checkout correcta importa: con credenciales de un usuario de
 * prueba, MercadoPago solo completa el pago en sandbox_init_point — init_point
 * (el "de producción") devuelve un error de acceso. Encontrado al probar la
 * integración real con una cuenta de prueba (Fase MercadoPago).
 */
@ExtendWith(MockitoExtension.class)
class MercadoPagoServiceTest {

    @Mock
    private PreferenceClient preferenceClient;
    @Mock
    private PaymentClient paymentClient;
    @Mock
    private PaymentRefundClient paymentRefundClient;
    @Mock
    private MercadoPagoConfig config;
    @InjectMocks
    private MercadoPagoService mercadoPagoService;

    private MercadoPagoService.OrdenACobrar orden() {
        return new MercadoPagoService.OrdenACobrar(
                "tanda-1", "Entrada General", "Recital de prueba", 1,
                BigDecimal.valueOf(8000), "ext-ref-1", MercadoPagoService.TIPO_ENTRADAS,
                "comprador@test.com", LocalDateTime.now().plusMinutes(30));
    }

    private Preference preferenciaCon(String initPoint, String sandboxInitPoint) {
        Preference p = new Preference();
        ReflectionTestUtils.setField(p, "id", "pref-1");
        ReflectionTestUtils.setField(p, "initPoint", initPoint);
        ReflectionTestUtils.setField(p, "sandboxInitPoint", sandboxInitPoint);
        return p;
    }

    private void stubConfigValida() {
        when(config.getAccessToken()).thenReturn("APP_USR-algo");
        when(config.getFrontendBaseUrl()).thenReturn("http://localhost:5173");
        when(config.getBackendPublicUrl()).thenReturn("http://localhost:8080");
    }

    @Test
    void crearPreferencia_conSandboxInitPoint_usaElDeSandbox() throws Exception {
        stubConfigValida();
        when(preferenceClient.create(any(PreferenceRequest.class)))
                .thenReturn(preferenciaCon("https://www.mercadopago.com.ar/x", "https://sandbox.mercadopago.com.ar/x"));

        var resultado = mercadoPagoService.crearPreferencia(orden());

        assertThat(resultado.initPoint()).isEqualTo("https://sandbox.mercadopago.com.ar/x");
    }

    @Test
    void crearPreferencia_sinSandboxInitPoint_usaElDeProduccion() throws Exception {
        stubConfigValida();
        when(preferenceClient.create(any(PreferenceRequest.class)))
                .thenReturn(preferenciaCon("https://www.mercadopago.com.ar/x", null));

        var resultado = mercadoPagoService.crearPreferencia(orden());

        assertThat(resultado.initPoint()).isEqualTo("https://www.mercadopago.com.ar/x");
    }

    @Test
    void crearPreferencia_conSandboxInitPointVacio_usaElDeProduccion() throws Exception {
        stubConfigValida();
        when(preferenceClient.create(any(PreferenceRequest.class)))
                .thenReturn(preferenciaCon("https://www.mercadopago.com.ar/x", "  "));

        var resultado = mercadoPagoService.crearPreferencia(orden());

        assertThat(resultado.initPoint()).isEqualTo("https://www.mercadopago.com.ar/x");
    }

    @Test
    void crearPreferencia_sinAccessToken_lanzaPasarelaPagoExceptionYNoLlamaAMercadoPago() {
        when(config.getAccessToken()).thenReturn("");

        assertThatThrownBy(() -> mercadoPagoService.crearPreferencia(orden()))
                .isInstanceOf(PasarelaPagoException.class);
    }
}
