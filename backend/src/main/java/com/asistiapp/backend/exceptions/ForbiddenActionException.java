package com.asistiapp.backend.exceptions;

import org.springframework.http.HttpStatus;

/** Acceso denegado por rol insuficiente o recurso que no pertenece al usuario (403). */
public class ForbiddenActionException extends AsistiAppException {
    public ForbiddenActionException(String message) {
        super(message, HttpStatus.FORBIDDEN);
    }
}
