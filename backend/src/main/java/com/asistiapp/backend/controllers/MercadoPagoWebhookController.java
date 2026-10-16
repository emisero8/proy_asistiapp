package com.asistiapp.backend.controllers;

import com.asistiapp.backend.services.MercadoPagoFirmaValidator;
import com.asistiapp.backend.services.PagoWebhookService;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Webhook de MercadoPago — único punto por el que se confirma un pago, tanto de
 * entradas como de créditos (los distingue el external_reference de la orden).
 *
 * Lo invoca MercadoPago, no un usuario: es público a nivel de Spring Security y su
 * autenticidad se garantiza con la firma x-signature (MercadoPagoFirmaValidator) y
 * volviendo a consultar el pago a la API de MP (PagoWebhookService).
 *
 * Responde 200 a todo lo que no necesita reintento (notificaciones que no son de pago,
 * pagos ya procesados) para que MP no insista; 401 si la firma no es válida; y deja
 * subir los errores transitorios (5xx) para que MP reintente.
 */
@Slf4j
@RestController
@RequestMapping("/payments/mercadopago")
@RequiredArgsConstructor
public class MercadoPagoWebhookController {

    private final MercadoPagoFirmaValidator firmaValidator;
    private final PagoWebhookService pagoWebhookService;

    @PostMapping("/webhook")
    public ResponseEntity<Void> recibirNotificacion(
            @RequestHeader(value = "x-signature", required = false) String xSignature,
            @RequestHeader(value = "x-request-id", required = false) String xRequestId,
            @RequestParam(value = "data.id", required = false) String dataIdQuery,
            @RequestParam(value = "type", required = false) String typeQuery,
            @RequestParam(value = "id", required = false) String idIpnQuery,
            @RequestParam(value = "topic", required = false) String topicIpnQuery,
            @RequestBody(required = false) JsonNode body) {

        // MP manda cada pago por dos vías: Webhooks (?data.id=…&type=payment) y el formato
        // viejo IPN (?id=…&topic=payment). Las dos van firmadas y se tratan igual.
        String idQuery = dataIdQuery != null ? dataIdQuery : idIpnQuery;

        // La firma se calcula con el id de la query string, tal como lo manda MP.
        if (!firmaValidator.esValida(xSignature, xRequestId, idQuery)) {
            log.warn("Webhook de MercadoPago rechazado: firma inválida o ausente");
            return ResponseEntity.status(401).build();
        }

        String tipo = typeQuery != null ? typeQuery : topicIpnQuery != null ? topicIpnQuery : texto(body, "type");
        if (!"payment".equals(tipo)) {
            log.debug("Notificación de MercadoPago de tipo '{}' ignorada", tipo);
            return ResponseEntity.ok().build();
        }

        String dataId = idQuery != null ? idQuery : texto(body == null ? null : body.get("data"), "id");
        Long paymentId;
        try {
            paymentId = Long.valueOf(dataId);
        } catch (NumberFormatException e) {
            log.warn("Webhook de pago de MercadoPago con data.id inválido: {}", dataId);
            return ResponseEntity.badRequest().build();
        }

        pagoWebhookService.procesarNotificacionPago(paymentId);
        return ResponseEntity.ok().build();
    }

    private static String texto(JsonNode nodo, String campo) {
        if (nodo == null || nodo.get(campo) == null || nodo.get(campo).isNull()) {
            return null;
        }
        return nodo.get(campo).asText();
    }
}
