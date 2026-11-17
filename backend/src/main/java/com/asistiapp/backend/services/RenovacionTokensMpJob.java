package com.asistiapp.backend.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Renueva los tokens de Mercado Pago de los Organizadores antes de que venzan y limpia intentos de vinculación viejos (8.4). */
@Slf4j
@Component
@RequiredArgsConstructor
public class RenovacionTokensMpJob {

    private static final long SEIS_HORAS_MS = 6L * 60 * 60 * 1000;
    private static final long CINCO_MINUTOS_MS = 5L * 60 * 1000;

    private final VinculacionMercadoPagoService vinculacionService;

    @Scheduled(fixedDelay = SEIS_HORAS_MS, initialDelay = CINCO_MINUTOS_MS)
    public void ejecutar() {
        int renovadas = vinculacionService.renovarProximosAVencer();
        vinculacionService.limpiarIntentosVencidos();
        if (renovadas > 0) {
            log.info("Tokens de Mercado Pago renovados: {}", renovadas);
        }
    }
}
