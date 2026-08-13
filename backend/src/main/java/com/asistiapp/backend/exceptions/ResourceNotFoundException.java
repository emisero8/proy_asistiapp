package com.asistiapp.backend.exceptions;

import org.springframework.http.HttpStatus;

/** Recurso no encontrado en la base de datos (404). */
public class ResourceNotFoundException extends AsistiAppException {
    public ResourceNotFoundException(String message) {
        super(message, HttpStatus.NOT_FOUND);
    }
}
