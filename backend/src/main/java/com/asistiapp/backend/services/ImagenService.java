package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

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
    private static final String CARPETA_EVENTOS = "asistiapp/eventos";

    private final Cloudinary cloudinary;

    /** Sube la imagen de portada de un evento y devuelve su URL pública (https). */
    public String subirImagenEvento(MultipartFile archivo) {
        validar(archivo);
        try {
            Map<?, ?> resultado = cloudinary.uploader().upload(
                    archivo.getBytes(),
                    ObjectUtils.asMap("folder", CARPETA_EVENTOS, "resource_type", "image")
            );
            return (String) resultado.get("secure_url");
        } catch (IOException e) {
            log.error("Error al subir imagen a Cloudinary: {}", e.getMessage(), e);
            throw new BusinessRuleException("No se pudo subir la imagen. Intentá nuevamente.");
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
