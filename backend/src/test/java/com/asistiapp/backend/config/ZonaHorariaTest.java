package com.asistiapp.backend.config;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.ZoneId;
import java.util.TimeZone;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ZonaHorariaTest {

    private TimeZone original;

    @BeforeEach
    void guardar() {
        original = TimeZone.getDefault();
    }

    @AfterEach
    void restaurar() {
        TimeZone.setDefault(original);
    }

    @Test
    void sinConfigurar_usaBuenosAires_aunqueElServidorEsteEnUtc() {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));

        ZoneId zona = ZonaHoraria.aplicar(null);

        assertThat(zona).isEqualTo(ZoneId.of("America/Argentina/Buenos_Aires"));
        assertThat(TimeZone.getDefault().getID()).isEqualTo("America/Argentina/Buenos_Aires");
        // Lo que importa: LocalDateTime.now() sigue la zona fijada (Argentina es UTC-3 todo el año).
        assertThat(java.time.LocalDateTime.now().getHour())
                .isEqualTo(java.time.ZonedDateTime.now(ZoneId.of("UTC")).minusHours(3).getHour());
    }

    @Test
    void enBlanco_seTrataComoSinConfigurar() {
        assertThat(ZonaHoraria.aplicar("   ")).isEqualTo(ZoneId.of(ZonaHoraria.POR_DEFECTO));
    }

    @Test
    void conUnaZonaExplicita_laRespeta() {
        assertThat(ZonaHoraria.aplicar("America/Montevideo")).isEqualTo(ZoneId.of("America/Montevideo"));
        assertThat(TimeZone.getDefault().getID()).isEqualTo("America/Montevideo");
    }

    @Test
    void conUnaZonaInvalida_hacerFallarElArranqueSinCambiarLaZona() {
        TimeZone antes = TimeZone.getDefault();

        assertThatThrownBy(() -> ZonaHoraria.aplicar("Marte/Olympus"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("APP_TIMEZONE");

        assertThat(TimeZone.getDefault()).isEqualTo(antes);
    }
}
