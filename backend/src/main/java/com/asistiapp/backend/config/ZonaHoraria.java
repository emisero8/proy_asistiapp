package com.asistiapp.backend.config;

import java.time.DateTimeException;
import java.time.ZoneId;
import java.util.TimeZone;

/**
 * Zona horaria de la aplicación.
 *
 * Todas las fechas del sistema son "hora de pared" sin zona (LocalDate/LocalTime/LocalDateTime):
 * el Organizador carga "21:00" pensando en hora argentina, y el backend las compara con
 * LocalDateTime.now(), que usa la zona del JVM. Un servidor en UTC (lo normal en la nube)
 * corría todo 3 horas: un evento de las 21:00 "finalizaba" a las 18:00 argentinas, y las órdenes
 * de MercadoPago vencían a destiempo. En lugar de depender de cómo esté configurado el servidor,
 * se fija la zona del JVM al arrancar, antes de que Spring toque ninguna fecha.
 *
 * Configurable con la variable de entorno APP_TIMEZONE (default America/Argentina/Buenos_Aires).
 */
public final class ZonaHoraria {

    public static final String POR_DEFECTO = "America/Argentina/Buenos_Aires";
    public static final String VARIABLE_DE_ENTORNO = "APP_TIMEZONE";

    private ZonaHoraria() {
    }

    /** Fija la zona del JVM. Falla si el id no es una zona válida: mejor no arrancar que correr corrido. */
    public static ZoneId aplicar(String id) {
        String elegido = (id == null || id.isBlank()) ? POR_DEFECTO : id.trim();
        ZoneId zona;
        try {
            zona = ZoneId.of(elegido);
        } catch (DateTimeException e) {
            throw new IllegalStateException(VARIABLE_DE_ENTORNO + "='" + elegido
                    + "' no es una zona horaria válida (ejemplo: " + POR_DEFECTO + ").", e);
        }
        TimeZone.setDefault(TimeZone.getTimeZone(zona));
        return zona;
    }
}
