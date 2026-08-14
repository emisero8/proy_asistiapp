package com.asistiapp.backend.models.dtos.auth;

import com.asistiapp.backend.models.enums.RolUsuario;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * DTO de respuesta para login y registro.
 * Devuelve el token JWT junto con los datos básicos del usuario autenticado
 * para que el frontend pueda inicializar su estado de sesión sin hacer una
 * segunda petición.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponseDTO {

    /** Token JWT a incluir en el header Authorization: Bearer <token> */
    private String token;

    /** Siempre "Bearer" — facilita al cliente armar el header sin hardcodear. */
    @Builder.Default
    private String tipo = "Bearer";

    private Long id;
    private String nombre;
    private String email;
    private RolUsuario rol;
}
