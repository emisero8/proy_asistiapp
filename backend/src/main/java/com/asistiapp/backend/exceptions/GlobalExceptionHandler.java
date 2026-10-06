package com.asistiapp.backend.exceptions;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Manejador global de excepciones para AsistíAPP.
 * Garantiza que TODA respuesta de error sea un JSON estructurado y consistente.
 *
 * Formato de respuesta:
 * {
 *   "status":  409,
 *   "error":   "Mensaje descriptivo",
 *   "path":    "/api/tickets/validate",
 *   "timestamp": "2024-01-01T12:00:00"
 * }
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // ─────────────────────────────────────────────
    // 1. Excepciones de negocio propias de la app
    // ─────────────────────────────────────────────

    @ExceptionHandler(AsistiAppException.class)
    public ResponseEntity<Map<String, Object>> handleAsistiAppException(
            AsistiAppException ex, HttpServletRequest request) {

        return buildResponse(ex.getStatus(), ex.getMessage(), request.getRequestURI());
    }

    // ─────────────────────────────────────────────
    // 2. Errores de validación de Bean (@Valid)
    // ─────────────────────────────────────────────

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationException(
            MethodArgumentNotValidException ex, HttpServletRequest request) {

        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fe.getField(), fe.getDefaultMessage());
        }

        Map<String, Object> body = new HashMap<>();
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("error", "Error de validación en los campos enviados");
        body.put("fields", fieldErrors);
        body.put("path", request.getRequestURI());
        body.put("timestamp", LocalDateTime.now().toString());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    // ─────────────────────────────────────────────
    // 3. Spring Security: Autenticación y Autorización
    // ─────────────────────────────────────────────

    /**
     * Cuenta suspendida o inactiva: se avisa explícitamente en vez de "Credenciales inválidas"
     * para que el usuario sepa que el problema no es la contraseña.
     */
    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<Map<String, Object>> handleCuentaSuspendida(
            DisabledException ex, HttpServletRequest request) {

        return buildResponse(HttpStatus.FORBIDDEN, "Cuenta suspendida", request.getRequestURI());
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuthenticationException(
            AuthenticationException ex, HttpServletRequest request) {

        return buildResponse(HttpStatus.UNAUTHORIZED, "Credenciales inválidas o token expirado", request.getRequestURI());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDeniedException(
            AccessDeniedException ex, HttpServletRequest request) {

        return buildResponse(HttpStatus.FORBIDDEN, "No tienes permisos para realizar esta acción", request.getRequestURI());
    }

    /**
     * Ruta que no existe: Spring lanza NoResourceFoundException. Sin este handler caía en el
     * catch-all y respondía 500, cuando el error real es un 404.
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleRutaInexistente(
            NoResourceFoundException ex, HttpServletRequest request) {

        return buildResponse(HttpStatus.NOT_FOUND, "Recurso no encontrado", request.getRequestURI());
    }

    // ─────────────────────────────────────────────
    // 4. Catch-all: cualquier error inesperado
    // ─────────────────────────────────────────────

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(
            Exception ex, HttpServletRequest request) {

        // Loguear en servidor para debugging, pero no exponer el stack al cliente
        log.error("Error inesperado en {}: {}", request.getRequestURI(), ex.getMessage(), ex);
        return buildResponse(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Ocurrió un error interno inesperado. Por favor intenta nuevamente.",
                request.getRequestURI()
        );
    }

    // ─────────────────────────────────────────────
    // Helper
    // ─────────────────────────────────────────────

    private ResponseEntity<Map<String, Object>> buildResponse(HttpStatus status, String message, String path) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", status.value());
        body.put("error", message);
        body.put("path", path);
        body.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(status).body(body);
    }
}
