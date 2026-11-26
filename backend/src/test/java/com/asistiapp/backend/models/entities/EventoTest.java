package com.asistiapp.backend.models.entities;

import com.asistiapp.backend.models.enums.EstadoEvento;
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

    private static final long MARGEN = 5;
    private static final long GRACIA = 60L * Evento.HORAS_HASTA_FINALIZAR;

    @Test
    void conInicioEnElFuturo_niComenzoNiFinalizo() {
        assertThat(enMinutos(MARGEN).yaComenzo()).isFalse();
        assertThat(enMinutos(MARGEN).yaFinalizo()).isFalse();
        assertThat(enMinutos(60 * 24 * 30).yaFinalizo()).isFalse();
    }

    @Test
    void recienEmpezado_comenzoPeroSigueSinFinalizar() {
        assertThat(enMinutos(-MARGEN).yaComenzo()).isTrue();
        assertThat(enMinutos(-MARGEN).yaFinalizo()).isFalse();
        assertThat(enMinutos(-GRACIA + MARGEN).yaFinalizo()).isFalse();
    }

    @Test
    void pasadasDoceHorasDesdeElInicio_finalizo() {
        assertThat(enMinutos(-GRACIA - MARGEN).yaFinalizo()).isTrue();
        assertThat(enMinutos(-60 * 24 * 30).yaFinalizo()).isTrue();
    }

    @Test
    void soloUnEventoPublicadoYFinalizadoEstaCerrado() {
        Evento pasado = enMinutos(-60 * 24 * 2);
        pasado.setEstado(EstadoEvento.Borrador);
        assertThat(pasado.estaCerrado()).isFalse();   // un borrador viejo se sigue pudiendo editar
        pasado.setEstado(EstadoEvento.Publicado);
        assertThat(pasado.estaCerrado()).isTrue();

        Evento enCurso = enMinutos(-MARGEN);
        enCurso.setEstado(EstadoEvento.Publicado);
        assertThat(enCurso.estaCerrado()).isFalse();
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
