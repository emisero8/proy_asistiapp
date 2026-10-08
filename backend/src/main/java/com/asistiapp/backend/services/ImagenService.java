package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Sube imágenes a Cloudinary y devuelve la URL segura para guardar en la base.
 * Valida tipo y tamaño antes de enviar, así no se gasta cuota en archivos que no sirven.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ImagenService {

    private static final List<String> TIPOS_PERMITIDOS = List.of("image/jpeg", "image/png", "image/webp");
    private static final long TAMANO_MAXIMO_BYTES = 5L * 1024 * 1024;
    static final String CARPETA_EVENTOS = "asistiapp/eventos";
    static final String CARPETA_PERFILES = "asistiapp/perfiles";

    private final Cloudinary cloudinary;

    @Value("${app.cloudinary.cloud-name}")
    private String cloudName;

    /**
     * El public_id de Cloudinary es lo que viene después de "/upload/", sin el
     * "v<versión>/" opcional y sin la extensión. Ej: para
     * ".../upload/v1700000000/asistiapp/eventos/abc123.png" → "asistiapp/eventos/abc123".
     */
    private static final Pattern PUBLIC_ID_DESDE_URL = Pattern.compile("/upload/(?:v\\d+/)?(.+)\\.[a-zA-Z0-9]+$");

    /** True si la URL apunta a nuestra propia cuenta de Cloudinary (no un link externo cualquiera). */
    public boolean esDeNuestroCloudinary(String url) {
        return url != null && url.startsWith("https://res.cloudinary.com/" + cloudName + "/image/upload/");
    }

    /**
     * Borra una imagen nuestra de Cloudinary a partir de su URL (reemplazo o "Quitar").
     * No lanza si falla: liberar espacio no es parte crítica del flujo que la llama, y el
     * usuario ya se quedó con el nombre/la URL nueva guardados igual.
     */
    public void eliminarSiEsNuestra(String url) {
        if (!esDeNuestroCloudinary(url)) {
            return;
        }
        Matcher m = PUBLIC_ID_DESDE_URL.matcher(url);
        if (!m.find()) {
            log.warn("No se pudo extraer el public_id de Cloudinary de la URL: {}", url);
            return;
        }
        String publicId = m.group(1);
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            log.info("Imagen eliminada de Cloudinary: {}", publicId);
        } catch (Exception e) {
            log.warn("No se pudo eliminar la imagen de Cloudinary ({}): {}", publicId, e.getMessage());
        }
    }

    /** Sube la imagen de portada de un evento y devuelve su URL pública (https). */
    public String subirImagenEvento(MultipartFile archivo) {
        return subirImagen(archivo, CARPETA_EVENTOS);
    }

    /** Sube la foto de perfil de un usuario y devuelve su URL pública (https). */
    public String subirFotoPerfil(MultipartFile archivo) {
        return subirImagen(archivo, CARPETA_PERFILES);
    }

    private String subirImagen(MultipartFile archivo, String carpeta) {
        validar(archivo);
        try {
            Map<?, ?> resultado = cloudinary.uploader().upload(
                    archivo.getBytes(),
                    ObjectUtils.asMap("folder", carpeta, "resource_type", "image")
            );
            return (String) resultado.get("secure_url");
        } catch (IOException e) {
            log.error("Error al subir imagen a Cloudinary: {}", e.getMessage(), e);
            throw new BusinessRuleException("No se pudo subir la imagen. Intentá nuevamente.");
        } catch (RuntimeException e) {
            // El SDK de Cloudinary no siempre tira IOException: credenciales vacías/invalidas,
            // cloud_name mal, o un error de su API devuelven excepciones sin checked (p.ej.
            // IllegalArgumentException, ApiException). Sin este catch, cualquiera de esas
            // escapaba sin manejar y el cliente veia un 500 generico en vez de un mensaje util.
            log.error("Error inesperado al subir imagen a Cloudinary (revisar credenciales CLOUDINARY_*): {}",
                    e.getMessage(), e);
            throw new BusinessRuleException("No se pudo subir la imagen. Intentá nuevamente en unos minutos.");
        }
    }

    private void validar(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw new BusinessRuleException("Seleccioná una imagen para subir");
        }
        if (!TIPOS_PERMITIDOS.contains(archivo.getContentType())) {
            throw new BusinessRuleException("Formato no permitido. Usá JPG, PNG o WEBP");
        }
        if (archivo.getSize() > TAMANO_MAXIMO_BYTES) {
            throw new BusinessRuleException("La imagen no puede superar los 5 MB");
        }
    }
}
