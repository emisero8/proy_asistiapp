package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.PasarelaPagoException;
import com.asistiapp.backend.services.MercadoPagoOAuthClient.TokensMp;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class MercadoPagoOAuthClientTest {

    private static final String TOKEN_URL = "https://api.mercadopago.test/oauth/token";

    private MockRestServiceServer servidor;
    private MercadoPagoOAuthClient cliente;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        servidor = MockRestServiceServer.bindTo(builder).build();
        cliente = new MercadoPagoOAuthClient(
                "APP-123", "secreto-de-la-app", "https://asistiapp.test/mercadopago/oauth/callback",
                "https://auth.mercadopago.test/authorization", TOKEN_URL, builder);
    }

    @Test
    void laUrlDeAutorizacionLlevaLosParametrosDelFlujoConPkce() {
        String url = cliente.urlAutorizacion("estado-abc", "desafio-xyz");

        assertThat(url).startsWith("https://auth.mercadopago.test/authorization?")
                .contains("client_id=APP-123")
                .contains("response_type=code")
                .contains("platform_id=mp")
                .contains("state=estado-abc")
                .contains("code_challenge=desafio-xyz")
                .contains("code_challenge_method=S256")
                .contains("redirect_uri=https%3A%2F%2Fasistiapp.test%2Fmercadopago%2Foauth%2Fcallback")
                .doesNotContain("secreto-de-la-app");
    }

    @Test
    void intercambiarCodigo_mandaElCodigoYElVerificadorYLeeLosTokens() {
        servidor.expect(requestTo(TOKEN_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Content-Type", "application/x-www-form-urlencoded;charset=UTF-8"))
                .andExpect(content().string(org.hamcrest.Matchers.allOf(
                        org.hamcrest.Matchers.containsString("grant_type=authorization_code"),
                        org.hamcrest.Matchers.containsString("client_id=APP-123"),
                        org.hamcrest.Matchers.containsString("client_secret=secreto-de-la-app"),
                        org.hamcrest.Matchers.containsString("code=TG-codigo"),
                        org.hamcrest.Matchers.containsString("code_verifier=verificador"),
                        org.hamcrest.Matchers.containsString("redirect_uri="))))
                .andRespond(withSuccess("""
                        {"access_token":"APP_USR-acceso","refresh_token":"TG-refresco","user_id":987654,"expires_in":15552000,"token_type":"Bearer"}
                        """, MediaType.APPLICATION_JSON));

        TokensMp tokens = cliente.intercambiarCodigo("TG-codigo", "verificador");

        assertThat(tokens.accessToken()).isEqualTo("APP_USR-acceso");
        assertThat(tokens.refreshToken()).isEqualTo("TG-refresco");
        assertThat(tokens.userId()).isEqualTo(987654L);
        assertThat(tokens.expiresInSegundos()).isEqualTo(15552000L);
        servidor.verify();
    }

    @Test
    void renovar_mandaElRefreshToken() {
        servidor.expect(requestTo(TOKEN_URL))
                .andExpect(content().string(org.hamcrest.Matchers.allOf(
                        org.hamcrest.Matchers.containsString("grant_type=refresh_token"),
                        org.hamcrest.Matchers.containsString("refresh_token=TG-viejo"))))
                .andRespond(withSuccess("""
                        {"access_token":"APP_USR-nuevo","refresh_token":"TG-nuevo","user_id":987654,"expires_in":15552000}
                        """, MediaType.APPLICATION_JSON));

        TokensMp tokens = cliente.renovar("TG-viejo");

        assertThat(tokens.accessToken()).isEqualTo("APP_USR-nuevo");
        assertThat(tokens.refreshToken()).isEqualTo("TG-nuevo");
    }

    @Test
    void siMercadoPagoRechazaElRefresh_esUnAccesoRevocado() {
        servidor.expect(requestTo(TOKEN_URL))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST).contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":\"invalid_grant\",\"message\":\"Error validating grant\"}"));

        assertThatThrownBy(() -> cliente.renovar("TG-revocado"))
                .isInstanceOf(MercadoPagoOAuthClient.TokenRechazadoException.class);
    }

    @Test
    void siMercadoPagoFallaOEstaCaido_esUnErrorDePasarelaYNoUnaRevocacion() {
        servidor.expect(requestTo(TOKEN_URL)).andRespond(withStatus(HttpStatus.BAD_GATEWAY));

        assertThatThrownBy(() -> cliente.renovar("TG-cualquiera"))
                .isInstanceOf(PasarelaPagoException.class)
                .isNotInstanceOf(MercadoPagoOAuthClient.TokenRechazadoException.class);
    }

    @Test
    void unaRespuestaSinAccessTokenEsUnErrorDePasarela() {
        servidor.expect(requestTo(TOKEN_URL)).andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> cliente.intercambiarCodigo("c", "v")).isInstanceOf(PasarelaPagoException.class);
    }
}
