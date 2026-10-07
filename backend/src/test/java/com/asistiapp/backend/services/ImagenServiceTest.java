package com.asistiapp.backend.services;

import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Liberar imágenes de Cloudinary al reemplazarlas o quitarlas (Fase de limpieza de
 * portadas y fotos de perfil). Nunca debe tirar una excepción: liberar espacio no es
 * parte crítica del flujo que lo pide.
 */
@ExtendWith(MockitoExtension.class)
class ImagenServiceTest {

    private static final String CLOUD = "mi-cuenta";

    @Mock
    private Cloudinary cloudinary;
    @Mock
    private Uploader uploader;
    @InjectMocks
    private ImagenService imagenService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(imagenService, "cloudName", CLOUD);
    }

    @Test
    void esDeNuestroCloudinary_urlNuestra_true() {
        assertThat(imagenService.esDeNuestroCloudinary(
                "https://res.cloudinary.com/" + CLOUD + "/image/upload/v1/asistiapp/eventos/x.png")).isTrue();
    }

    @Test
    void esDeNuestroCloudinary_urlDeOtraCuenta_false() {
        assertThat(imagenService.esDeNuestroCloudinary(
                "https://res.cloudinary.com/otra-cuenta/image/upload/v1/asistiapp/eventos/x.png")).isFalse();
    }

    @Test
    void esDeNuestroCloudinary_urlExterna_false() {
        assertThat(imagenService.esDeNuestroCloudinary("https://evil.example.com/foto.png")).isFalse();
    }

    @Test
    void esDeNuestroCloudinary_null_false() {
        assertThat(imagenService.esDeNuestroCloudinary(null)).isFalse();
    }

    @Test
    void eliminarSiEsNuestra_urlAjena_noTocaCloudinary() {
        imagenService.eliminarSiEsNuestra("https://evil.example.com/foto.png");

        verifyNoInteractions(cloudinary);
    }

    @Test
    void eliminarSiEsNuestra_urlConVersion_extraeElPublicIdCorrecto() throws Exception {
        when(cloudinary.uploader()).thenReturn(uploader);

        imagenService.eliminarSiEsNuestra(
                "https://res.cloudinary.com/" + CLOUD + "/image/upload/v1700000000/asistiapp/eventos/abc123.png");

        verify(uploader).destroy(eq("asistiapp/eventos/abc123"), any(Map.class));
    }

    @Test
    void eliminarSiEsNuestra_urlSinVersion_extraeElPublicIdCorrecto() throws Exception {
        when(cloudinary.uploader()).thenReturn(uploader);

        imagenService.eliminarSiEsNuestra(
                "https://res.cloudinary.com/" + CLOUD + "/image/upload/asistiapp/perfiles/xyz789.webp");

        verify(uploader).destroy(eq("asistiapp/perfiles/xyz789"), any(Map.class));
    }

    @Test
    void eliminarSiEsNuestra_siCloudinaryFalla_noLanzaExcepcion() throws Exception {
        when(cloudinary.uploader()).thenReturn(uploader);
        when(uploader.destroy(any(), any())).thenThrow(new RuntimeException("timeout"));

        imagenService.eliminarSiEsNuestra(
                "https://res.cloudinary.com/" + CLOUD + "/image/upload/v1/asistiapp/eventos/x.png");
        // no debe lanzar
    }
}
