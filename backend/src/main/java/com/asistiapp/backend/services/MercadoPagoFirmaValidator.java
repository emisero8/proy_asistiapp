package com.asistiapp.backend.services;

import com.asistiapp.backend.config.MercadoPagoConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * Valida la firma (header x-signature) con la que MercadoPago autentica cada webhook.
 *
 * MP firma con HMAC-SHA256, usando como clave el secreto de Webhooks de la aplicación,
 * el siguiente "manifest" (las partes ausentes se omiten):
 *
 *     id:[data.id en minúsculas];request-id:[header x-request-id];ts:[ts de x-signature];
 *
 * y manda el resultado en x-signature como `ts=<epoch>,v1=<hex>`.
 * Sin esto, cualquiera que conozca la URL podría simular un pago aprobado.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MercadoPagoFirmaValidator {

    private static final String ALGORITMO = "HmacSHA256";

    private final MercadoPagoConfig config;

    /**
     * @param xSignature valor del header x-signature
     * @param xRequestId valor del header x-request-id (puede ser null)
     * @param dataId     valor del query param data.id (puede ser null)
     */
    public boolean esValida(String xSignature, String xRequestId, String dataId) {
        boolean firmaCorrecta = firmaCoincide(xSignature, xRequestId, dataId);
        if (!firmaCorrecta && !config.isValidarFirmaWebhook()) {
            // Validación apagada (solo sandbox local): se deja pasar, pero se deja constancia.
            // El pago igual se verifica contra la API de MP antes de entregar nada.
            log.warn("La firma del webhook no coincide, pero MP_VALIDAR_FIRMA=false: se procesa igual");
            return true;
        }
        return firmaCorrecta;
    }

    private boolean firmaCoincide(String xSignature, String xRequestId, String dataId) {
        String secreto = config.getWebhookSecret();
        if (secreto == null || secreto.isBlank()) {
            // Falla cerrado: sin secreto no hay forma de autenticar, así que no se acepta nada.
            log.error("MP_WEBHOOK_SECRET no configurado: se rechaza el webhook de MercadoPago");
            return false;
        }
        if (xSignature == null || xSignature.isBlank()) {
            return false;
        }

        String ts = null;
        String v1 = null;
        for (String parte : xSignature.split(",")) {
            String[] clavevalor = parte.trim().split("=", 2);
            if (clavevalor.length != 2) {
                continue;
            }
            switch (clavevalor[0].trim()) {
                case "ts" -> ts = clavevalor[1].trim();
                case "v1" -> v1 = clavevalor[1].trim();
                default -> { }
            }
        }
        if (ts == null || ts.isEmpty() || v1 == null || v1.isEmpty()) {
            return false;
        }

        String esperada = calcularFirma(secreto, construirManifest(dataId, xRequestId, ts));
        // Comparación en tiempo constante para no filtrar información por timing.
        return MessageDigest.isEqual(
                esperada.getBytes(StandardCharsets.UTF_8),
                v1.toLowerCase().getBytes(StandardCharsets.UTF_8));
    }

    static String construirManifest(String dataId, String xRequestId, String ts) {
        StringBuilder manifest = new StringBuilder();
        if (dataId != null && !dataId.isBlank()) {
            manifest.append("id:").append(dataId.toLowerCase()).append(';');
        }
        if (xRequestId != null && !xRequestId.isBlank()) {
            manifest.append("request-id:").append(xRequestId).append(';');
        }
        manifest.append("ts:").append(ts).append(';');
        return manifest.toString();
    }

    static String calcularFirma(String secreto, String manifest) {
        try {
            Mac mac = Mac.getInstance(ALGORITMO);
            mac.init(new SecretKeySpec(secreto.getBytes(StandardCharsets.UTF_8), ALGORITMO));
            return HexFormat.of().formatHex(mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("No se pudo calcular el HMAC-SHA256", e);
        }
    }
}
