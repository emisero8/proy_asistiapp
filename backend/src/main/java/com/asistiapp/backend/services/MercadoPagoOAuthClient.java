package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.PasarelaPagoException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriUtils;

/**
 * Habla con el OAuth de Mercado Pago (8.4): arma la URL de autorización, cambia el código por tokens y renueva el
 * token. Es lo único que conoce esos endpoints. Nunca registra tokens ni el client_secret.
 */
@Slf4j
@Component
public class MercadoPagoOAuthClient {

    /** Tokens que devuelve Mercado Pago. `expiresInSegundos` es la vida del access_token. */
    public record TokensMp(String accessToken, String refreshToken, Long userId, long expiresInSegundos) {
    }

    /** Mercado Pago dejó de aceptar el acceso (revocado o vencido): hay que vincular de nuevo. No es una falla transitoria. */
    public static class TokenRechazadoException extends PasarelaPagoException {
        public TokenRechazadoException(String message) {
            super(message);
        }
    }

    private final String clientId;
    private final String clientSecret;
    private final String redirectUri;
    private final String authorizationUrl;
    private final String tokenUrl;
    private final RestClient restClient;
    private final ObjectMapper json = new ObjectMapper();

    public MercadoPagoOAuthClient(
            @Value("${app.mercadopago.oauth.client-id}") String clientId,
            @Value("${app.mercadopago.oauth.client-secret}") String clientSecret,
            @Value("${app.mercadopago.oauth.redirect-uri}") String redirectUri,
            @Value("${app.mercadopago.oauth.authorization-url}") String authorizationUrl,
            @Value("${app.mercadopago.oauth.token-url}") String tokenUrl,
            RestClient.Builder restClientBuilder) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
        this.authorizationUrl = authorizationUrl;
        this.tokenUrl = tokenUrl;
        this.restClient = restClientBuilder.build();
    }

    /** URL a la que se redirige al Organizador para que autorice la aplicación (con PKCE S256). */
    public String urlAutorizacion(String state, String codeChallenge) {
        return authorizationUrl + "?client_id=" + enc(clientId)
                + "&response_type=code"
                + "&platform_id=mp"
                + "&state=" + enc(state)
                + "&redirect_uri=" + enc(redirectUri)
                + "&code_challenge=" + enc(codeChallenge)
                + "&code_challenge_method=S256";
    }

    private static String enc(String valor) {
        return UriUtils.encode(valor, StandardCharsets.UTF_8);
    }

    public TokensMp intercambiarCodigo(String code, String codeVerifier) {
        MultiValueMap<String, String> form = baseForm("authorization_code");
        form.add("code", code);
        form.add("code_verifier", codeVerifier);
        form.add("redirect_uri", redirectUri);
        return pedirTokens(form, "cambiar el código");
    }

    public TokensMp renovar(String refreshToken) {
        MultiValueMap<String, String> form = baseForm("refresh_token");
        form.add("refresh_token", refreshToken);
        return pedirTokens(form, "renovar el token");
    }

    private MultiValueMap<String, String> baseForm(String grantType) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", grantType);
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        return form;
    }

    private TokensMp pedirTokens(MultiValueMap<String, String> form, String accion) {
        try {
            return restClient.post()
                    .uri(tokenUrl)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(form)
                    .exchange((req, res) -> {
                        String cuerpo = res.bodyTo(String.class);
                        int status = res.getStatusCode().value();
                        if (res.getStatusCode().is2xxSuccessful()) {
                            return leerTokens(cuerpo);
                        }
                        // Un 400 invalid_grant (o 401/403) es Mercado Pago diciendo "ese acceso ya no vale".
                        if (status == 401 || status == 403 || (status == 400 && cuerpo != null && cuerpo.contains("invalid_grant"))) {
                            throw new TokenRechazadoException("Mercado Pago rechazó el acceso al " + accion + " (HTTP " + status + ")");
                        }
                        throw new PasarelaPagoException("Mercado Pago respondió HTTP " + status + " al " + accion);
                    });
        } catch (PasarelaPagoException e) {
            throw e;
        } catch (RuntimeException e) {
            log.warn("No se pudo comunicar con el OAuth de Mercado Pago al {}: {}", accion, e.getClass().getSimpleName());
            throw new PasarelaPagoException("No pudimos comunicarnos con Mercado Pago. Intentá de nuevo en unos minutos.");
        }
    }

    private TokensMp leerTokens(String cuerpo) {
        try {
            JsonNode n = json.readTree(cuerpo == null ? "{}" : cuerpo);
            String access = n.path("access_token").asText("");
            String refresh = n.path("refresh_token").asText("");
            if (access.isBlank() || refresh.isBlank()) {
                throw new PasarelaPagoException("Mercado Pago no devolvió los tokens esperados");
            }
            Long userId = n.hasNonNull("user_id") ? n.get("user_id").asLong() : null;
            return new TokensMp(access, refresh, userId, n.path("expires_in").asLong(0));
        } catch (java.io.IOException e) {
            throw new PasarelaPagoException("Mercado Pago devolvió una respuesta ilegible");
        }
    }
}
