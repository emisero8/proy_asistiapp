package com.asistiapp.backend.services;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Map;

/**
 * Genera la imagen PNG de un código QR a partir del string codigo_qr de la Entrada.
 *
 * Es la mitad que faltaba de la Fase 5/16: codigo_qr ya era un string único,
 * pero en ningún lado se renderizaba como imagen de código de barras escaneable.
 */
@Service
public class QrImageService {

    /**
     * Codifica el contenido como QR y devuelve los bytes PNG resultantes.
     *
     * @param contenido texto a codificar (típicamente el codigo_qr de la Entrada)
     * @param tamano    ancho/alto en píxeles de la imagen cuadrada resultante
     * @return bytes PNG del código QR
     */
    public byte[] generarPng(String contenido, int tamano) {
        try {
            Map<EncodeHintType, Object> hints = Map.of(
                    EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M,
                    EncodeHintType.MARGIN, 1
            );

            BitMatrix matrix = new QRCodeWriter().encode(
                    contenido, BarcodeFormat.QR_CODE, tamano, tamano, hints);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", out);
            return out.toByteArray();

        } catch (WriterException | IOException e) {
            throw new IllegalStateException("Error al generar la imagen del código QR", e);
        }
    }
}
