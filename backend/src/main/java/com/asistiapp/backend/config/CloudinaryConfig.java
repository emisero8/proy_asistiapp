package com.asistiapp.backend.config;

import com.cloudinary.Cloudinary;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

/**
 * Cliente de Cloudinary para el alojamiento de imágenes (portadas de eventos, fotos de perfil).
 * Las credenciales vienen de variables de entorno (app.cloudinary.*), nunca del repo.
 *
 * Sin credenciales el backend arranca igual (el resto del sistema no las necesita) pero subir una imagen
 * falla recién cuando alguien lo intenta: por eso se avisa en el log al arrancar. Con el perfil "prod"
 * son obligatorias (ConfiguracionProdValidator) y ni siquiera arranca.
 */
@Slf4j
@Configuration
public class CloudinaryConfig {

    @Bean
    public Cloudinary cloudinary(
            @Value("${app.cloudinary.cloud-name}") String cloudName,
            @Value("${app.cloudinary.api-key}") String apiKey,
            @Value("${app.cloudinary.api-secret}") String apiSecret) {
        if (cloudName.isBlank() || apiKey.isBlank() || apiSecret.isBlank()) {
            log.warn("Cloudinary sin credenciales (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET): "
                    + "subir portadas de eventos y fotos de perfil va a fallar. El resto del sistema funciona igual.");
        }
        return new Cloudinary(Map.of(
                "cloud_name", cloudName,
                "api_key", apiKey,
                "api_secret", apiSecret,
                "secure", true
        ));
    }
}
