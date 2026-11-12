package com.asistiapp.backend.services;

import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;

class ThrottleReconciliacionTest {

    private final AtomicLong reloj = new AtomicLong(1_000_000);
    private final ThrottleReconciliacion throttle = new ThrottleReconciliacion(10_000, reloj::get);

    @Test
    void laPrimeraConsultaDeUnaOrdenSiempreSePermite() {
        assertThat(throttle.permitir("ref-1")).isTrue();
    }

    @Test
    void dentroDelIntervaloNoSePermiteOtra_ypasadoElIntervaloSi() {
        assertThat(throttle.permitir("ref-1")).isTrue();

        reloj.addAndGet(4_000);
        assertThat(throttle.permitir("ref-1")).isFalse();
        reloj.addAndGet(5_999);
        assertThat(throttle.permitir("ref-1")).isFalse();

        reloj.addAndGet(1); // justo 10 s desde la última consulta que sí pasó
        assertThat(throttle.permitir("ref-1")).isTrue();
    }

    @Test
    void lasConsultasRechazadasNoCorrenElIntervalo() {
        assertThat(throttle.permitir("ref-1")).isTrue();
        // Un comprador que insiste cada 4 s igual consigue una consulta real cada 10 s, no nunca.
        reloj.addAndGet(4_000);
        assertThat(throttle.permitir("ref-1")).isFalse();
        reloj.addAndGet(4_000);
        assertThat(throttle.permitir("ref-1")).isFalse();
        reloj.addAndGet(2_000);
        assertThat(throttle.permitir("ref-1")).isTrue();
    }

    @Test
    void cadaOrdenTieneSuPropioIntervalo_aunqueCompartanIp() {
        assertThat(throttle.permitir("ref-1")).isTrue();
        assertThat(throttle.permitir("ref-2")).isTrue();
        assertThat(throttle.permitir("ref-1")).isFalse();
        assertThat(throttle.permitir("ref-2")).isFalse();
    }

    @Test
    void conUnIntervaloDeCero_noLimitaNada() {
        ThrottleReconciliacion sinLimite = new ThrottleReconciliacion(0, reloj::get);
        assertThat(sinLimite.permitir("ref-1")).isTrue();
        assertThat(sinLimite.permitir("ref-1")).isTrue();
    }

    @Test
    void elMapaNoCreceSinFin_sePurgaLoVencido() {
        for (int i = 0; i < 1500; i++) {
            throttle.permitir("ref-" + i);
        }
        reloj.addAndGet(20_000);
        // Esta consulta pasa y dispara la purga de todo lo vencido: no debe romper nada ni perder la actual.
        assertThat(throttle.permitir("ref-nueva")).isTrue();
        assertThat(throttle.permitir("ref-nueva")).isFalse();
        assertThat(throttle.permitir("ref-0")).isTrue();
    }
}
