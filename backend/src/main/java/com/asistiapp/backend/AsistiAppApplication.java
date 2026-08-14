package com.asistiapp.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Punto de entrada principal de AsistíAPP.
 *
 * @EnableAsync: habilita el procesamiento asíncrono para el EmailService,
 * permitiendo que el envío de emails no bloquee el hilo HTTP principal.
 */
@SpringBootApplication
@EnableAsync
public class AsistiAppApplication {

    public static void main(String[] args) {
        SpringApplication.run(AsistiAppApplication.class, args);
    }
}
