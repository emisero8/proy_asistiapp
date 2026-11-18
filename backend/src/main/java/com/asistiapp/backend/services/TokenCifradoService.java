package com.asistiapp.backend.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Cifra con AES-256-GCM los tokens de Mercado Pago que se guardan en la base (8.4). La clave (32 bytes en
 * Base64) viene de MP_TOKEN_ENCRYPTION_KEY: sin ella, una copia de la base no sirve para cobrar a nombre de nadie.
 * Cada texto lleva su propio IV aleatorio, y GCM detecta cualquier alteración.
 */
@Service
public class TokenCifradoService {

    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;

    private final SecretKeySpec clave;
    private final SecureRandom random = new SecureRandom();

    public TokenCifradoService(@Value("${app.mercadopago.token-encryption-key}") String claveBase64) {
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(claveBase64 == null ? "" : claveBase64.trim());
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("MP_TOKEN_ENCRYPTION_KEY no es Base64 válido: tiene que ser una clave de 32 bytes en Base64");
        }
        if (bytes.length != 32) {
            throw new IllegalStateException("MP_TOKEN_ENCRYPTION_KEY tiene que ser de 32 bytes (en Base64); tiene " + bytes.length);
        }
        this.clave = new SecretKeySpec(bytes, "AES");
    }

    public String cifrar(String textoPlano) {
        try {
            byte[] iv = new byte[IV_BYTES];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, clave, new GCMParameterSpec(TAG_BITS, iv));
            byte[] cifrado = cipher.doFinal(textoPlano.getBytes(StandardCharsets.UTF_8));
            byte[] salida = new byte[iv.length + cifrado.length];
            System.arraycopy(iv, 0, salida, 0, iv.length);
            System.arraycopy(cifrado, 0, salida, iv.length, cifrado.length);
            return Base64.getEncoder().encodeToString(salida);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("No se pudo cifrar el token", e);
        }
    }

    public String descifrar(String cifradoBase64) {
        try {
            byte[] todo = Base64.getDecoder().decode(cifradoBase64);
            if (todo.length <= IV_BYTES) {
                throw new IllegalStateException("Token cifrado inválido");
            }
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, clave, new GCMParameterSpec(TAG_BITS, todo, 0, IV_BYTES));
            return new String(cipher.doFinal(todo, IV_BYTES, todo.length - IV_BYTES), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            throw new IllegalStateException("No se pudo descifrar el token (clave distinta o dato alterado)", e);
        }
    }
}
