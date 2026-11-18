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
import com.mercadopago.core.MPRequestOptions;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.exceptions.MPException;
import com.mercadopago.net.MPSearchRequest;
import com.mercadopago.resources.payment.Payment;
import com.mercadopago.resources.preference.Preference;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
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

    /** Título del ítem del cargo por procesamiento: es lo que ve el comprador en el checkout de Mercado Pago. */
    public static final String TITULO_CARGO_SERVICIO = "Cargo por procesamiento de pago (Mercado Pago)";

    /**
     * Datos de una orden a cobrar — un ítem con cantidad y, si el Organizador traslada la comisión de Mercado
     * Pago al comprador, un segundo ítem con el cargo por entrada (misma cantidad), para que el desglose se vea
     * también en el checkout de Mercado Pago.
     *
     * @param cargoServicioUnitario cargo por entrada; null o 0 = sin cargo (la orden de créditos nunca lo lleva)
     */
    public record OrdenACobrar(
            String itemId,
            String titulo,
            String descripcion,
            int cantidad,
            BigDecimal precioUnitario,
            String externalReference,
            String tipo,
            String emailPagador,
            LocalDateTime fechaVencimiento,
            BigDecimal cargoServicioUnitario) {

        /** Orden sin cargo por procesamiento (créditos, o entradas cuyo Organizador absorbe la comisión). */
        public OrdenACobrar(String itemId, String titulo, String descripcion, int cantidad, BigDecimal precioUnitario,
                            String externalReference, String tipo, String emailPagador, LocalDateTime fechaVencimiento) {
            this(itemId, titulo, descripcion, cantidad, precioUnitario, externalReference, tipo, emailPagador,
                    fechaVencimiento, null);
        }

        public boolean tieneCargoServicio() {
            return cargoServicioUnitario != null && cargoServicioUnitario.signum() > 0;
        }
    }

    public record PreferenciaCreada(String preferenceId, String initPoint) {}

    /** Cobra con la cuenta de la plataforma (compra de créditos). */
    public PreferenciaCreada crearPreferencia(OrdenACobrar orden) {
        return crearPreferencia(orden, null);
    }

    /**
     * Opciones de la llamada con el token de la cuenta que cobra: el del Organizador (8.5) o, si es null,
     * el de la plataforma. El SDK guarda un token global; con esto cada llamada usa el suyo.
     */
    private MPRequestOptions opciones(String accessToken) {
        return accessToken == null ? null : MPRequestOptions.builder().accessToken(accessToken).build();
    }

    /**
     * @param accessToken token de la cuenta de Mercado Pago que cobra (el del Organizador, para las entradas);
     *                    null = la cuenta de la plataforma, para la compra de créditos
     */
    public PreferenciaCreada crearPreferencia(OrdenACobrar orden, String accessToken) {
        if (accessToken == null && (config.getAccessToken() == null || config.getAccessToken().isBlank())) {
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

        List<PreferenceItemRequest> items = orden.tieneCargoServicio()
                ? List.of(item, PreferenceItemRequest.builder()
                        .id("cargo-servicio")
                        .title(TITULO_CARGO_SERVICIO)
                        .description("Comisión de Mercado Pago trasladada por el organizador")
                        .quantity(orden.cantidad())
                        .unitPrice(orden.cargoServicioUnitario())
                        .currencyId("ARS")
                        .build())
                : List.of(item);

        PreferenceRequest.PreferenceRequestBuilder request = PreferenceRequest.builder()
                .items(items)
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
            request.notificationUrl(config.getBackendPublicUrl() + RUTA_WEBHOOK + "?ref=" + orden.externalReference());
        } else {
            log.warn("BACKEND_PUBLIC_URL no es HTTPS ({}): MercadoPago no podrá notificar el pago", config.getBackendPublicUrl());
        }

        try {
            Preference preferencia = accessToken == null
                    ? preferenceClient.create(request.build())
                    : preferenceClient.create(request.build(), opciones(accessToken));
            log.info("Preferencia MP creada: id={}, externalReference={}", preferencia.getId(), orden.externalReference());
            // Cuenta de la plataforma con credenciales de prueba: MercadoPago solo completa el pago en
            // sandbox_init_point (el init_point "de producción" devuelve error de acceso); con credenciales
            // reales ese campo viene vacío. Cuenta de un Organizador (OAuth, aplicación de producción):
            // MercadoPago devuelve las dos URLs pero la de sandbox no puede cobrar dinero real, así que
            // se usa siempre la normal.
            boolean cuentaDelOrganizador = accessToken != null;
            String urlCheckout = (!cuentaDelOrganizador
                    && preferencia.getSandboxInitPoint() != null && !preferencia.getSandboxInitPoint().isBlank())
                    ? preferencia.getSandboxInitPoint()
                    : preferencia.getInitPoint();
            return new PreferenciaCreada(preferencia.getId(), urlCheckout);
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
        return obtenerPago(paymentId, null);
    }

    /** @param accessToken token de la cuenta a la que se cobró el pago (null = la de la plataforma) */
    public Optional<Payment> obtenerPago(Long paymentId, String accessToken) {
        try {
            return Optional.of(accessToken == null
                    ? paymentClient.get(paymentId)
                    : paymentClient.get(paymentId, opciones(accessToken)));
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

    /**
     * Busca en MercadoPago los pagos asociados a una orden nuestra, para la reconciliación
     * (cuando la orden sigue `Pendiente` pero el webhook pudo no haber llegado nunca).
     *
     * @return los pagos encontrados (puede haber más de uno: reintentos, un rechazo seguido
     *         de una aprobación), o vacío si no hay ninguno o MP no responde — en ese caso la
     *         orden simplemente sigue `Pendiente`, no es un error que haya que propagar.
     */
    public List<Payment> buscarPagosPorReferencia(String externalReference) {
        return buscarPagosPorReferencia(externalReference, null);
    }

    /** @param accessToken token de la cuenta a la que se cobró (null = la de la plataforma) */
    public List<Payment> buscarPagosPorReferencia(String externalReference, String accessToken) {
        try {
            // limit/offset no son opcionales en la práctica: sin ellos el SDK intenta construir
            // la query string con un valor null y tira NullPointerException.
            MPSearchRequest request = MPSearchRequest.builder()
                    .filters(Map.of("external_reference", externalReference))
                    .limit(10)
                    .offset(0)
                    .build();
            return (accessToken == null
                    ? paymentClient.search(request)
                    : paymentClient.search(request, opciones(accessToken))).getResults();
        } catch (MPApiException e) {
            log.error("MercadoPago rechazó la búsqueda de pagos para la orden {} ({}): {}",
                    externalReference, e.getStatusCode(), e.getApiResponse().getContent());
            return List.of();
        } catch (MPException e) {
            log.error("Error de comunicación con MercadoPago al buscar pagos de la orden {}", externalReference, e);
            return List.of();
        }
    }

    /** Devuelve el pago completo al comprador (cuando se cobró algo que no se puede entregar). */
    public void reembolsar(Long paymentId) {
        reembolsar(paymentId, null);
    }

    /** @param accessToken token de la cuenta que recibió el cobro, de donde sale el reembolso (null = la de la plataforma) */
    public void reembolsar(Long paymentId, String accessToken) {
        try {
            if (accessToken == null) {
                paymentRefundClient.refund(paymentId);
            } else {
                paymentRefundClient.refund(paymentId, opciones(accessToken));
            }
            log.info("Pago MP {} reembolsado", paymentId);
        } catch (MPApiException e) {
            log.error("MercadoPago rechazó el reembolso del pago {} ({}): {}", paymentId, e.getStatusCode(), e.getApiResponse().getContent());
            throw new PasarelaPagoException("No pudimos reembolsar el pago en MercadoPago");
        } catch (MPException e) {
            log.error("Error de comunicación con MercadoPago al reembolsar el pago {}", paymentId, e);
            throw new PasarelaPagoException("No pudimos comunicarnos con MercadoPago");
        }
    }

    /**
     * Devuelve parte de un pago (una entrada de una orden de varias) desde la cuenta que lo cobró.
     * Mercado Pago rechaza el reembolso si el monto supera lo que queda sin devolver del pago.
     *
     * @param accessToken token de la cuenta del Organizador: de ahí sale el dinero
     * @throws PasarelaPagoException si Mercado Pago no lo acepta (por ejemplo, saldo insuficiente) o no responde
     */
    public void reembolsarParcial(Long paymentId, BigDecimal monto, String accessToken) {
        try {
            if (accessToken == null) {
                paymentRefundClient.refund(paymentId, monto);
            } else {
                paymentRefundClient.refund(paymentId, monto, opciones(accessToken));
            }
            log.info("Pago MP {} reembolsado parcialmente: {}", paymentId, monto);
        } catch (MPApiException e) {
            log.error("MercadoPago rechazó el reembolso parcial del pago {} ({}): {}", paymentId, e.getStatusCode(), e.getApiResponse().getContent());
            throw new PasarelaPagoException("Mercado Pago no pudo devolver el dinero (por ejemplo, por saldo insuficiente en tu cuenta)");
        } catch (MPException e) {
            log.error("Error de comunicación con MercadoPago al reembolsar parcialmente el pago {}", paymentId, e);
            throw new PasarelaPagoException("No pudimos comunicarnos con Mercado Pago");
        }
    }

    /** Fecha de vencimiento de una orden creada ahora (misma zona horaria que el resto de las fechas de la app). */
    public LocalDateTime calcularVencimiento() {
        return LocalDateTime.now().plusMinutes(config.getMinutosVencimientoOrden());
    }
}
