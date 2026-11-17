package com.asistiapp.backend.config;

import com.cloudinary.Cloudinary;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

class CloudinaryConfigTest {

    @Test
    void sinCredenciales_elBackendArrancaIgual() {
        assertThatCode(() -> new CloudinaryConfig().cloudinary("", "", "")).doesNotThrowAnyException();
    }

    @Test
    void conCredenciales_configuraElClienteConHttps() {
        Cloudinary cloudinary = new CloudinaryConfig().cloudinary("mi-nube", "123", "secreto");

        assertThat(cloudinary.config.cloudName).isEqualTo("mi-nube");
        assertThat(cloudinary.config.secure).isTrue();
    }
}
