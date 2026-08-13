package com.asistiapp.backend.exceptions;

import org.springframework.http.HttpStatus;

/** Violación de una regla de negocio (ej. cupo agotado, créditos insuficientes). */
public class BusinessRuleException extends AsistiAppException {
    public BusinessRuleException(String message) {
        super(message, HttpStatus.CONFLICT);
    }
}
