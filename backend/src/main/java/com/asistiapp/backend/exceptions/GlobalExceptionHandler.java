package com.asistiapp.backend.exceptions;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.TypeMismatchException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

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
 *
 * Extiende ResponseEntityExceptionHandler para que los errores del propio cliente que detecta
 * Spring MVC (método HTTP no soportado → 405, Content-Type no soportado → 415, JSON inválido o
 * parámetro faltante → 400, archivo demasiado grande → 413, ruta inexistente → 404…) respondan con
 * su código correcto y este mismo formato. Antes caían en el catch-all y devolvían 500, que significa
 * "falló el servidor" cuando en realidad el que se equivocó fue quien llamó.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

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

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {

        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fe.getField(), fe.getDefaultMessage());
        }

        Map<String, Object> body = new HashMap<>();
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("error", "Error de validación en los campos enviados");
        body.put("fields", fieldErrors);
        body.put("path", pathDe(request));
        body.put("timestamp", LocalDateTime.now().toString());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).headers(headers).body(body);
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

    // ─────────────────────────────────────────────
    // 4. Errores de cliente que detecta Spring MVC antes del controlador
    // ─────────────────────────────────────────────

    /**
     * ResponseEntityExceptionHandler ya clasifica cada caso (404, 405, 406, 413, 415, 400…); todos
     * pasan por acá para responder con el formato de error de la app en vez del ProblemDetail por
     * defecto. Los mensajes son propios y en español: nunca se expone el texto interno de la excepción.
     */
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception ex, Object body, HttpHeaders headers, HttpStatusCode statusCode, WebRequest request) {

        String path = pathDe(request);

        // El cliente no acepta JSON: cualquier cuerpo que mandemos va a volver a fallar al escribirlo.
        if (statusCode.value() == HttpStatus.NOT_ACCEPTABLE.value()) {
            return ResponseEntity.status(statusCode).headers(headers).build();
        }

        if (statusCode.is5xxServerError()) {
            log.error("Error inesperado en {}: {}", path, ex.getMessage(), ex);
        } else {
            log.debug("Solicitud rechazada en {} ({}): {}", path, statusCode.value(), ex.getMessage());
        }

        Map<String, Object> cuerpo = new HashMap<>();
        cuerpo.put("status", statusCode.value());
        cuerpo.put("error", mensajeDeCliente(ex, statusCode));
        cuerpo.put("path", path);
        cuerpo.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(statusCode).headers(headers).body(cuerpo);
    }

    private static String mensajeDeCliente(Exception ex, HttpStatusCode status) {
        if (status.is5xxServerError()) {
            return "Ocurrió un error interno inesperado. Por favor intenta nuevamente.";
        }
        if (ex instanceof MissingServletRequestParameterException falta) {
            return "Falta el parámetro obligatorio '" + falta.getParameterName() + "'";
        }
        if (ex instanceof TypeMismatchException mismatch) {
            return "El valor del parámetro '" + mismatch.getPropertyName() + "' no es válido";
        }
        return switch (status.value()) {
            case 400 -> "La solicitud no es válida: revisá el formato de los datos enviados";
            case 404 -> "Recurso no encontrado";
            case 405 -> "Método HTTP no soportado en esta ruta";
            case 413 -> "El archivo enviado supera el tamaño máximo permitido";
            case 415 -> "Tipo de contenido no soportado";
            default -> "No se pudo procesar la solicitud";
        };
    }

    private static String pathDe(WebRequest request) {
        return request instanceof ServletWebRequest servlet ? servlet.getRequest().getRequestURI() : "";
    }

    // ─────────────────────────────────────────────
    // 5. Catch-all: cualquier error inesperado
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
