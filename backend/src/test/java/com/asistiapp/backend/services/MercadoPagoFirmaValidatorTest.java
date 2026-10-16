package com.asistiapp.backend.services;

import com.asistiapp.backend.config.MercadoPagoConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * La firma x-signature es lo único que impide que cualquiera simule un pago aprobado:
 * se prueba contra firmas calculadas con el mismo algoritmo que documenta MercadoPago.
 */
@ExtendWith(MockitoExtension.class)
class MercadoPagoFirmaValidatorTest {

    private static final String SECRETO = "secreto-de-prueba";

    @Mock
    private MercadoPagoConfig config;

    private MercadoPagoFirmaValidator validator;

    @BeforeEach
    void setUp() {
        lenient().when(config.getWebhookSecret()).thenReturn(SECRETO);
        lenient().when(config.isValidarFirmaWebhook()).thenReturn(true);
        validator = new MercadoPagoFirmaValidator(config);
    }

    private static String firmar(String secreto, String dataId, String requestId, String ts) {
        String manifest = MercadoPagoFirmaValidator.construirManifest(dataId, requestId, ts);
        return "ts=" + ts + ",v1=" + MercadoPagoFirmaValidator.calcularFirma(secreto, manifest);
    }

    @Test
    void firmaCorrecta_esValida() {
        String header = firmar(SECRETO, "123456", "req-abc", "1704908010");

        assertThat(validator.esValida(header, "req-abc", "123456")).isTrue();
    }

    @Test
    void elManifestSigueElFormatoDeMercadoPago() {
        assertThat(MercadoPagoFirmaValidator.construirManifest("ABC123", "req-1", "1704908010"))
                .isEqualTo("id:abc123;request-id:req-1;ts:1704908010;"); // data.id en minúsculas
        assertThat(MercadoPagoFirmaValidator.construirManifest(null, null, "1704908010"))
                .isEqualTo("ts:1704908010;"); // las partes ausentes se omiten
    }

    @Test
    void dataIdConMayusculas_seNormalizaAMinusculasComoHaceMercadoPago() {
        String header = firmar(SECRETO, "ABC123", "req-1", "1704908010");

        assertThat(validator.esValida(header, "req-1", "ABC123")).isTrue();
    }

    @Test
    void firmaSinRequestId_seValidaOmitiendoEsaParte() {
        String header = firmar(SECRETO, "123456", null, "1704908010");

        assertThat(validator.esValida(header, null, "123456")).isTrue();
    }

    @Test
    void firmaCalculadaConOtroSecreto_noEsValida() {
        String header = firmar("otro-secreto", "123456", "req-abc", "1704908010");

        assertThat(validator.esValida(header, "req-abc", "123456")).isFalse();
    }

    @Test
    void siSeCambiaElIdDelPago_laFirmaYaNoEsValida() {
        String header = firmar(SECRETO, "123456", "req-abc", "1704908010");

        assertThat(validator.esValida(header, "req-abc", "999999")).isFalse();
    }

    @Test
    void siSeCambiaElRequestId_laFirmaYaNoEsValida() {
        String header = firmar(SECRETO, "123456", "req-abc", "1704908010");

        assertThat(validator.esValida(header, "req-otro", "123456")).isFalse();
    }

    @Test
    void siSeCambiaElTimestamp_laFirmaYaNoEsValida() {
        String firmaOriginal = firmar(SECRETO, "123456", "req-abc", "1704908010");
        String v1 = firmaOriginal.substring(firmaOriginal.indexOf("v1=") + 3);

        assertThat(validator.esValida("ts=1704999999,v1=" + v1, "req-abc", "123456")).isFalse();
    }

    @Test
    void headerAusenteVacioOMalFormado_noEsValido() {
        assertThat(validator.esValida(null, "req", "123")).isFalse();
        assertThat(validator.esValida("", "req", "123")).isFalse();
        assertThat(validator.esValida("basura", "req", "123")).isFalse();
        assertThat(validator.esValida("ts=1704908010", "req", "123")).isFalse(); // falta v1
        assertThat(validator.esValida("v1=abcdef", "req", "123")).isFalse();     // falta ts
    }

    @Test
    void conLaValidacionApagada_dejaPasarUnaFirmaQueNoCoincide() {
        when(config.isValidarFirmaWebhook()).thenReturn(false);

        assertThat(validator.esValida("ts=1,v1=00", "req", "123")).isTrue();
        assertThat(validator.esValida(null, null, "123")).isTrue();
    }

    @Test
    void conLaValidacionActivada_unaFirmaQueNoCoincideSeRechaza() {
        assertThat(validator.esValida("ts=1,v1=00", "req", "123")).isFalse();
    }

    @Test
    void sinSecretoConfigurado_rechazaTodoAunqueLaFirmaSeaCorrecta() {
        String header = firmar(SECRETO, "123456", "req-abc", "1704908010"); // firma correcta con el secreto real
        when(config.getWebhookSecret()).thenReturn(""); // pero el backend no tiene secreto configurado

        assertThat(validator.esValida(header, "req-abc", "123456")).isFalse();
    }
}
