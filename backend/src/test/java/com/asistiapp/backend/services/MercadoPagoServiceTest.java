package com.asistiapp.backend.services;

import com.asistiapp.backend.config.MercadoPagoConfig;
import com.asistiapp.backend.exceptions.PasarelaPagoException;
import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.client.payment.PaymentRefundClient;
import com.mercadopago.client.preference.PreferenceClient;
import com.mercadopago.client.preference.PreferenceRequest;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.exceptions.MPException;
import com.mercadopago.net.MPResponse;
import com.mercadopago.net.MPResultsResourcesPage;
import com.mercadopago.net.MPSearchRequest;
import com.mercadopago.resources.payment.Payment;
import com.mercadopago.resources.preference.Preference;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.mock;
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

    // ─────────────────────────────────────────────
    // Cobro con la cuenta del Organizador (8.5)
    // ─────────────────────────────────────────────

    @Test
    void crearPreferencia_conTokenDelOrganizador_cobraConEseTokenYNoConElDeLaPlataforma() throws Exception {
        when(config.getFrontendBaseUrl()).thenReturn("http://localhost:5173");
        when(config.getBackendPublicUrl()).thenReturn("http://localhost:8080");
        when(preferenceClient.create(any(PreferenceRequest.class), any(com.mercadopago.core.MPRequestOptions.class)))
                .thenReturn(preferenciaCon("https://www.mercadopago.com.ar/x", null));

        mercadoPagoService.crearPreferencia(orden(), "token-del-organizador");

        verify(preferenceClient).create(any(PreferenceRequest.class),
                argThat(o -> "token-del-organizador".equals(o.getAccessToken())));
        verify(preferenceClient, never()).create(any(PreferenceRequest.class));
    }

    @Test
    void crearPreferencia_conTokenDelOrganizador_usaElInitPointNormalAunqueMercadoPagoDevuelvaElDeSandbox() throws Exception {
        // La cuenta del Organizador se vincula por OAuth con la aplicación de producción: su checkout es el
        // normal. Con la URL de sandbox un comprador real no podría pagar. (Mercado Pago devuelve las dos.)
        when(config.getFrontendBaseUrl()).thenReturn("http://localhost:5173");
        when(config.getBackendPublicUrl()).thenReturn("http://localhost:8080");
        when(preferenceClient.create(any(PreferenceRequest.class), any(com.mercadopago.core.MPRequestOptions.class)))
                .thenReturn(preferenciaCon("https://www.mercadopago.com.ar/x", "https://sandbox.mercadopago.com.ar/x"));

        var resultado = mercadoPagoService.crearPreferencia(orden(), "token-del-organizador");

        assertThat(resultado.initPoint()).isEqualTo("https://www.mercadopago.com.ar/x");
    }

    @Test
    void crearPreferencia_conTokenDelOrganizador_noExigeQueLaPlataformaTengaElSuyo() throws Exception {
        // La cuenta de la plataforma puede no estar configurada y aun así cobrarse con la del Organizador.
        when(config.getFrontendBaseUrl()).thenReturn("http://localhost:5173");
        when(config.getBackendPublicUrl()).thenReturn("http://localhost:8080");
        when(preferenceClient.create(any(PreferenceRequest.class), any(com.mercadopago.core.MPRequestOptions.class)))
                .thenReturn(preferenciaCon("https://www.mercadopago.com.ar/x", null));

        var resultado = mercadoPagoService.crearPreferencia(orden(), "token-del-organizador");

        assertThat(resultado.initPoint()).isEqualTo("https://www.mercadopago.com.ar/x");
    }

    @Test
    void crearPreferencia_laUrlDeNotificacionLlevaLaReferenciaDeLaOrden() throws Exception {
        when(config.getAccessToken()).thenReturn("APP_USR-algo");
        when(config.getFrontendBaseUrl()).thenReturn("https://front.test");
        when(config.getBackendPublicUrl()).thenReturn("https://back.test");
        when(preferenceClient.create(any(PreferenceRequest.class)))
                .thenReturn(preferenciaCon("https://www.mercadopago.com.ar/x", null));

        mercadoPagoService.crearPreferencia(orden());

        var captor = org.mockito.ArgumentCaptor.forClass(PreferenceRequest.class);
        verify(preferenceClient).create(captor.capture());
        // El aviso solo trae el id del pago: con la referencia se sabe de qué Organizador es la orden.
        assertThat(captor.getValue().getNotificationUrl())
                .isEqualTo("https://back.test/payments/mercadopago/webhook?ref=ext-ref-1");
    }

    @Test
    void obtenerPago_conToken_consultaConEseToken() throws Exception {
        Payment pago = mock(Payment.class);
        when(paymentClient.get(eq(77L), any(com.mercadopago.core.MPRequestOptions.class))).thenReturn(pago);

        var resultado = mercadoPagoService.obtenerPago(77L, "token-del-organizador");

        assertThat(resultado).contains(pago);
        verify(paymentClient).get(eq(77L), argThat(o -> "token-del-organizador".equals(o.getAccessToken())));
    }

    @Test
    void obtenerPago_sinToken_usaLaCuentaDeLaPlataforma() throws Exception {
        Payment pago = mock(Payment.class);
        when(paymentClient.get(77L)).thenReturn(pago);

        assertThat(mercadoPagoService.obtenerPago(77L, null)).contains(pago);
    }

    @Test
    void buscarPagosPorReferencia_conToken_buscaConEseToken() throws Exception {
        Payment pago = mock(Payment.class);
        MPResultsResourcesPage<Payment> page = new MPResultsResourcesPage<>();
        page.setResults(List.of(pago));
        when(paymentClient.search(any(MPSearchRequest.class), any(com.mercadopago.core.MPRequestOptions.class))).thenReturn(page);

        var resultado = mercadoPagoService.buscarPagosPorReferencia("ext-ref-1", "token-del-organizador");

        assertThat(resultado).containsExactly(pago);
        verify(paymentClient).search(any(MPSearchRequest.class), argThat(o -> "token-del-organizador".equals(o.getAccessToken())));
    }

    @Test
    void reembolsar_conToken_reembolsaDesdeLaCuentaDelOrganizador() throws Exception {
        mercadoPagoService.reembolsar(77L, "token-del-organizador");

        var captor = org.mockito.ArgumentCaptor.forClass(com.mercadopago.core.MPRequestOptions.class);
        verify(paymentRefundClient).refund(eq(77L), captor.capture());
        assertThat(captor.getValue().getAccessToken()).isEqualTo("token-del-organizador");
        verify(paymentRefundClient, never()).refund(77L);
    }

    @Test
    void reembolsar_sinToken_reembolsaDesdeLaCuentaDeLaPlataforma() throws Exception {
        mercadoPagoService.reembolsar(77L, null);

        verify(paymentRefundClient).refund(77L);
    }

    // ─────────────────────────────────────────────
    // buscarPagosPorReferencia — reconciliación de órdenes Pendiente
    // ─────────────────────────────────────────────

    @Test
    void buscarPagosPorReferencia_encuentraPagos_losDevuelve() throws Exception {
        Payment pago = mock(Payment.class);
        MPResultsResourcesPage<Payment> page = new MPResultsResourcesPage<>();
        page.setResults(List.of(pago));
        when(paymentClient.search(any(MPSearchRequest.class))).thenReturn(page);

        List<Payment> resultado = mercadoPagoService.buscarPagosPorReferencia("ext-ref-1");

        assertThat(resultado).containsExactly(pago);
    }

    @Test
    void buscarPagosPorReferencia_mercadoPagoRechazaLaBusqueda_devuelveVacioSinPropagarLaExcepcion() throws Exception {
        MPResponse respuesta = new MPResponse(500, Map.of(), "error interno");
        when(paymentClient.search(any(MPSearchRequest.class))).thenThrow(new MPApiException("falló", respuesta));

        assertThat(mercadoPagoService.buscarPagosPorReferencia("ext-ref-1")).isEmpty();
    }

    @Test
    void buscarPagosPorReferencia_errorDeComunicacion_devuelveVacioSinPropagarLaExcepcion() throws Exception {
        when(paymentClient.search(any(MPSearchRequest.class))).thenThrow(new MPException("sin red"));

        assertThat(mercadoPagoService.buscarPagosPorReferencia("ext-ref-1")).isEmpty();
    }
}
