package com.asistiapp.backend.config;

import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.client.payment.PaymentRefundClient;
import com.mercadopago.client.preference.PreferenceClient;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Clientes del SDK de MercadoPago (Checkout Pro).
 * Las credenciales vienen de variables de entorno (app.mercadopago.*), nunca del repo.
 */
@Slf4j
@Getter
@Configuration
public class MercadoPagoConfig {

    @Value("${app.mercadopago.access-token}")
    private String accessToken;

    @Value("${app.mercadopago.webhook-secret}")
    private String webhookSecret;

    @Value("${app.mercadopago.validar-firma-webhook}")
    private boolean validarFirmaWebhook;

    @Value("${app.mercadopago.backend-public-url}")
    private String backendPublicUrl;

    @Value("${app.mercadopago.minutos-vencimiento-orden}")
    private int minutosVencimientoOrden;

    @Value("${app.frontend-base-url}")
    private String frontendBaseUrl;

    @PostConstruct
    void inicializar() {
        if (!validarFirmaWebhook) {
            log.warn("MP_VALIDAR_FIRMA=false: la firma de los webhooks de MercadoPago NO se está validando. "
                    + "Solo para sandbox local; en producción tiene que estar activa.");
        }
        // El token es estático en el SDK; sin él el backend arranca igual (tests, dev sin MP)
        // y falla recién al intentar cobrar.
        if (accessToken == null || accessToken.isBlank()) {
            log.warn("MP_ACCESS_TOKEN no configurado: no se podrán crear pagos reales con MercadoPago");
            return;
        }
        com.mercadopago.MercadoPagoConfig.setAccessToken(accessToken);
    }

    @Bean
    public PreferenceClient preferenceClient() {
        return new PreferenceClient();
    }

    @Bean
    public PaymentClient paymentClient() {
        return new PaymentClient();
    }

    @Bean
    public PaymentRefundClient paymentRefundClient() {
        return new PaymentRefundClient();
    }
}
