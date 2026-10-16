package com.asistiapp.backend.services;

import com.asistiapp.backend.config.MercadoPagoConfig;
import com.asistiapp.backend.exceptions.PasarelaPagoException;
import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.client.payment.PaymentRefundClient;
import com.mercadopago.client.preference.PreferenceBackUrlsRequest;
import com.mercadopago.client.preference.PreferenceClient;
import com.mercadopago.client.preference.PreferenceItemRequest;
import com.mercadopago.client.preference.PreferencePayerRequest;
import com.mercadopago.client.preference.PreferenceRequest;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.exceptions.MPException;
import com.mercadopago.resources.payment.Payment;
import com.mercadopago.resources.preference.Preference;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

/**
 * Cliente de MercadoPago Checkout Pro: crea la Preferencia de pago de una orden.
 *
 * El comprador es redirigido al `initPoint` y paga en el entorno de MercadoPago;
 * la confirmación NUNCA se toma de la redirección de vuelta sino del webhook.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MercadoPagoService {

    /** Ruta del webhook que recibe las notificaciones de MP (la implementa el controlador de pagos). */
    public static final String RUTA_WEBHOOK = "/payments/mercadopago/webhook";

    /** Tipos de orden: se usan en la URL de retorno del frontend. */
    public static final String TIPO_ENTRADAS = "entradas";
    public static final String TIPO_CREDITOS = "creditos";

    private final PreferenceClient preferenceClient;
    private final PaymentClient paymentClient;
    private final PaymentRefundClient paymentRefundClient;
    private final MercadoPagoConfig config;

    /** Datos de una orden a cobrar — un solo ítem, con cantidad. */
    public record OrdenACobrar(
            String itemId,
            String titulo,
            String descripcion,
            int cantidad,
            BigDecimal precioUnitario,
            String externalReference,
            String tipo,
            String emailPagador,
            LocalDateTime fechaVencimiento) {}

    public record PreferenciaCreada(String preferenceId, String initPoint) {}

    public PreferenciaCreada crearPreferencia(OrdenACobrar orden) {
        if (config.getAccessToken() == null || config.getAccessToken().isBlank()) {
            throw new PasarelaPagoException("El cobro con MercadoPago no está configurado");
        }

        String urlRetorno = config.getFrontendBaseUrl() + "/pago/resultado?ref=" + orden.externalReference()
                + "&tipo=" + orden.tipo();

        PreferenceItemRequest item = PreferenceItemRequest.builder()
                .id(orden.itemId())
                .title(orden.titulo())
                .description(orden.descripcion())
                .quantity(orden.cantidad())
                .unitPrice(orden.precioUnitario())
                .currencyId("ARS")
                .build();

        PreferenceRequest.PreferenceRequestBuilder request = PreferenceRequest.builder()
                .items(List.of(item))
                .externalReference(orden.externalReference())
                .backUrls(PreferenceBackUrlsRequest.builder()
                        .success(urlRetorno)
                        .pending(urlRetorno)
                        .failure(urlRetorno)
                        .build())
                .expires(true)
                .expirationDateTo(orden.fechaVencimiento().atZone(ZoneId.systemDefault()).toOffsetDateTime());

        if (orden.emailPagador() != null) {
            request.payer(PreferencePayerRequest.builder().email(orden.emailPagador()).build());
        }

        // MP rechaza auto_return si las back_urls no son HTTPS públicas, y no puede avisar
        // al webhook de una URL local: en desarrollo sin túnel se omiten ambos y el flujo
        // sigue andando (el comprador vuelve con el botón "Volver al sitio" de MP).
        if (config.getFrontendBaseUrl().startsWith("https://")) {
            request.autoReturn("approved");
        }
        if (config.getBackendPublicUrl().startsWith("https://")) {
            request.notificationUrl(config.getBackendPublicUrl() + RUTA_WEBHOOK);
        } else {
            log.warn("BACKEND_PUBLIC_URL no es HTTPS ({}): MercadoPago no podrá notificar el pago", config.getBackendPublicUrl());
        }

        try {
            Preference preferencia = preferenceClient.create(request.build());
            log.info("Preferencia MP creada: id={}, externalReference={}", preferencia.getId(), orden.externalReference());
            return new PreferenciaCreada(preferencia.getId(), preferencia.getInitPoint());
        } catch (MPApiException e) {
            log.error("MercadoPago rechazó la preferencia ({}): {}", e.getStatusCode(), e.getApiResponse().getContent());
            throw new PasarelaPagoException("No pudimos iniciar el pago con MercadoPago. Intentá de nuevo en unos minutos.");
        } catch (MPException e) {
            log.error("Error de comunicación con MercadoPago al crear la preferencia", e);
            throw new PasarelaPagoException("No pudimos comunicarnos con MercadoPago. Intentá de nuevo en unos minutos.");
        }
    }

    /**
     * Consulta el pago a la API de MercadoPago: es la única fuente confiable de su estado,
     * monto y orden — el contenido del webhook no se usa para decidir nada.
     *
     * @return el pago, o vacío si MP responde que no existe (404): reintentar no serviría
     * @throws PasarelaPagoException ante cualquier otro fallo, para que el webhook devuelva 5xx y MP reintente
     */
    public Optional<Payment> obtenerPago(Long paymentId) {
        try {
            return Optional.of(paymentClient.get(paymentId));
        } catch (MPApiException e) {
            if (e.getStatusCode() == 404) {
                log.warn("MercadoPago no tiene el pago {}", paymentId);
                return Optional.empty();
            }
            log.error("MercadoPago rechazó la consulta del pago {} ({}): {}", paymentId, e.getStatusCode(), e.getApiResponse().getContent());
            throw new PasarelaPagoException("No pudimos consultar el pago en MercadoPago");
        } catch (MPException e) {
            log.error("Error de comunicación con MercadoPago al consultar el pago {}", paymentId, e);
            throw new PasarelaPagoException("No pudimos comunicarnos con MercadoPago");
        }
    }

    /** Devuelve el pago completo al comprador (cuando se cobró algo que no se puede entregar). */
    public void reembolsar(Long paymentId) {
        try {
            paymentRefundClient.refund(paymentId);
            log.info("Pago MP {} reembolsado", paymentId);
        } catch (MPApiException e) {
            log.error("MercadoPago rechazó el reembolso del pago {} ({}): {}", paymentId, e.getStatusCode(), e.getApiResponse().getContent());
            throw new PasarelaPagoException("No pudimos reembolsar el pago en MercadoPago");
        } catch (MPException e) {
            log.error("Error de comunicación con MercadoPago al reembolsar el pago {}", paymentId, e);
            throw new PasarelaPagoException("No pudimos comunicarnos con MercadoPago");
        }
    }

    /** Fecha de vencimiento de una orden creada ahora (misma zona horaria que el resto de las fechas de la app). */
    public LocalDateTime calcularVencimiento() {
        return LocalDateTime.now().plusMinutes(config.getMinutosVencimientoOrden());
    }
}
