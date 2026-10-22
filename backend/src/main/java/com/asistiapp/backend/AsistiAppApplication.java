package com.asistiapp.backend;

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
 */
@SpringBootApplication
@EnableAsync
@EnableScheduling
public class AsistiAppApplication {

    public static void main(String[] args) {
        SpringApplication.run(AsistiAppApplication.class, args);
    }
}
