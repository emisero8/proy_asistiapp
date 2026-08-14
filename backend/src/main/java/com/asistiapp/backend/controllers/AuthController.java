package com.asistiapp.backend.controllers;

import com.asistiapp.backend.models.dtos.auth.AuthResponseDTO;
import com.asistiapp.backend.models.dtos.auth.LoginRequestDTO;
import com.asistiapp.backend.models.dtos.auth.RegisterRequestDTO;
import com.asistiapp.backend.models.dtos.auth.RestablecerPasswordRequestDTO;
import com.asistiapp.backend.models.dtos.auth.SolicitarRecuperacionRequestDTO;
import com.asistiapp.backend.services.AuthService;
import com.asistiapp.backend.services.PasswordRecoveryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controlador de autenticación — endpoints públicos.
 *
 * Rutas:
 *  POST /auth/login                → Login con email y contraseña, retorna JWT.
 *  POST /auth/register             → Registro de nuevo Organizador, retorna JWT.
 *  POST /auth/recuperar-password   → Solicita el email de recuperación (CU-003).
 *  POST /auth/restablecer-password → Confirma el nuevo password con el token recibido.
 *
 * Todas las rutas están declaradas como públicas en SecurityConfig (/auth/**).
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final PasswordRecoveryService passwordRecoveryService;

    /**
     * Inicia sesión con email y contraseña.
     *
     * @param dto credenciales del usuario
     * @return 200 OK con token JWT y datos básicos del usuario
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponseDTO> login(@Valid @RequestBody LoginRequestDTO dto) {
        AuthResponseDTO response = authService.login(dto);
        return ResponseEntity.ok(response);
    }

    /**
     * Registra un nuevo Organizador en el sistema.
     * Solo crea usuarios con rol Organizador; otros roles son creados por el Admin.
     *
     * @param dto datos del nuevo Organizador (nombre, email, contraseña)
     * @return 201 Created con token JWT listo para usar
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponseDTO> register(@Valid @RequestBody RegisterRequestDTO dto) {
        AuthResponseDTO response = authService.register(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Solicita el email de recuperación de contraseña (CU-003).
     * Siempre responde 200 OK, exista o no el email — no revela qué
     * cuentas están registradas en el sistema.
     */
    @PostMapping("/recuperar-password")
    public ResponseEntity<Void> recuperarPassword(@Valid @RequestBody SolicitarRecuperacionRequestDTO dto) {
        passwordRecoveryService.solicitarRecuperacion(dto.getEmail());
        return ResponseEntity.ok().build();
    }

    /**
     * Confirma el restablecimiento de contraseña con el token recibido por email.
     */
    @PostMapping("/restablecer-password")
    public ResponseEntity<Void> restablecerPassword(@Valid @RequestBody RestablecerPasswordRequestDTO dto) {
        passwordRecoveryService.restablecerPassword(dto.getToken(), dto.getNuevaPassword());
        return ResponseEntity.ok().build();
    }
}
