package com.asistiapp.backend;

import com.asistiapp.backend.config.ZonaHoraria;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Punto de entrada principal de AsistíAPP.
 *
 * @EnableAsync: habilita el procesamiento asíncrono para el EmailService,
 * permitiendo que el envío de emails no bloquee el hilo HTTP principal.
 * @EnableScheduling: habilita el job de vencimiento de órdenes de MercadoPago
 * (VencimientoOrdenesJob) que corre cada 10 minutos.
 *
 * La zona horaria se fija en main(), antes de arrancar Spring (ver ZonaHoraria).
 */
@SpringBootApplication
@EnableAsync
@EnableScheduling
public class AsistiAppApplication {

    public static void main(String[] args) {
        String zonaDelServidor = java.util.TimeZone.getDefault().getID();
        var zona = ZonaHoraria.aplicar(System.getenv(ZonaHoraria.VARIABLE_DE_ENTORNO));
        LoggerFactory.getLogger(AsistiAppApplication.class)
                .info("Zona horaria de la aplicación: {} (el servidor estaba en {})", zona, zonaDelServidor);
        SpringApplication.run(AsistiAppApplication.class, args);
    }
}
