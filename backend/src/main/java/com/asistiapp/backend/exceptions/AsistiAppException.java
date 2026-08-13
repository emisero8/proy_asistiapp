package com.asistiapp.backend.exceptions;

import org.springframework.http.HttpStatus;

/**
 * Excepción base para errores de negocio de AsistíAPP.
 * Siempre lleva un HttpStatus explícito para construir la respuesta HTTP correcta.
 */
public class AsistiAppException extends RuntimeException {

    private final HttpStatus status;

    public AsistiAppException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
