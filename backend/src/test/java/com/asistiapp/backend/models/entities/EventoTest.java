package com.asistiapp.backend.models.entities;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

/** "Evento finalizado" tiene una sola definición: esta. */
class EventoTest {

    private Evento enMinutos(long minutos) {
        LocalDateTime inicio = LocalDateTime.now().plusMinutes(minutos);
        Evento e = new Evento();
        e.setFechaEvento(inicio.toLocalDate());
        e.setHoraEvento(inicio.toLocalTime());
        return e;
    }

    @Test
    void conInicioEnElFuturo_noFinalizo() {
        assertThat(enMinutos(5).yaFinalizo()).isFalse();
        assertThat(enMinutos(60 * 24 * 30).yaFinalizo()).isFalse();
    }

    @Test
    void conInicioEnElPasado_yaFinalizo() {
        assertThat(enMinutos(-5).yaFinalizo()).isTrue();
        assertThat(enMinutos(-60 * 24 * 30).yaFinalizo()).isTrue();
    }

    @Test
    void sinFechaOHora_todaviaNoFinalizo() {
        assertThat(new Evento().yaFinalizo()).isFalse();
        Evento soloFecha = new Evento();
        soloFecha.setFechaEvento(LocalDate.now().minusDays(1));
        assertThat(soloFecha.yaFinalizo()).isFalse();
        Evento soloHora = new Evento();
        soloHora.setHoraEvento(LocalTime.of(10, 0));
        assertThat(soloHora.yaFinalizo()).isFalse();
    }
}
