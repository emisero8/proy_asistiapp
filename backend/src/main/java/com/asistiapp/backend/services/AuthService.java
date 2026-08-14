package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.dtos.auth.AuthResponseDTO;
import com.asistiapp.backend.models.dtos.auth.LoginRequestDTO;
import com.asistiapp.backend.models.dtos.auth.RegisterRequestDTO;
import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.models.entities.Usuario;
import com.asistiapp.backend.models.enums.EstadoUsuario;
import com.asistiapp.backend.models.enums.RolUsuario;
import com.asistiapp.backend.repositories.OrganizadorRepository;
import com.asistiapp.backend.repositories.UsuarioRepository;
import com.asistiapp.backend.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Servicio de autenticación: gestiona login y registro de Organizadores.
 *
 * Reglas de negocio:
 *  - Solo los Organizadores pueden auto-registrarse (CU-001/CU-002).
 *  - Los demás roles (Admin, Staff) son creados por un Administrador.
 *  - Al registrarse, el Organizador comienza con saldo_creditos = 0.
 *  - Al registrarse o loguearse, se genera un JWT inmediatamente para que
 *    el cliente no tenga que hacer un segundo request.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    /** Créditos de cortesía que recibe todo Organizador nuevo si el Admin no configuró otro valor (CU-028). */
    private static final int CREDITOS_BIENVENIDA_DEFAULT = 5;
    private static final String CLAVE_CREDITOS_BIENVENIDA = "creditos_bienvenida";

    private final UsuarioRepository usuarioRepository;
    private final OrganizadorRepository organizadorRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final CreditoLedgerService creditoLedgerService;
    private final ConfiguracionService configuracionService;

    // ─────────────────────────────────────────────
    // Login
    // ─────────────────────────────────────────────

    /**
     * Autentica un usuario con sus credenciales y devuelve un JWT.
     *
     * @param dto email y contraseña del usuario
     * @return AuthResponseDTO con el token JWT y datos básicos del usuario
     * @throws org.springframework.security.core.AuthenticationException si las credenciales son incorrectas
     */
    public AuthResponseDTO login(LoginRequestDTO dto) {
        // Spring Security verifica las credenciales internamente.
        // Si son incorrectas, lanza BadCredentialsException (→ 401 en GlobalExceptionHandler).
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(dto.getEmail(), dto.getPassword())
        );

        // Si llegamos aquí, las credenciales son válidas
        Usuario usuario = usuarioRepository.findByEmail(dto.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));

        String token = jwtUtils.generateToken(usuario);
        log.info("Login exitoso para el usuario: {}", usuario.getEmail());

        return buildAuthResponse(usuario, token);
    }

    // ─────────────────────────────────────────────
    // Registro de Organizador
    // ─────────────────────────────────────────────

    /**
     * Registra un nuevo Organizador en el sistema.
     * El endpoint es público y solo crea usuarios con rol Organizador.
     *
     * @param dto datos del nuevo Organizador (nombre, email, contraseña)
     * @return AuthResponseDTO con token JWT listo para usar
     * @throws BusinessRuleException 409 si el email ya está registrado
     */
    @Transactional
    public AuthResponseDTO register(RegisterRequestDTO dto) {
        // Verificar que el email no esté en uso
        if (usuarioRepository.existsByEmail(dto.getEmail())) {
            throw new BusinessRuleException(
                    "Ya existe una cuenta registrada con el email: " + dto.getEmail());
        }

        // Crear y persistir el Organizador
        Organizador organizador = new Organizador();
        organizador.setNombre(dto.getNombre());
        organizador.setEmail(dto.getEmail());
        organizador.setPasswordHash(passwordEncoder.encode(dto.getPassword()));
        organizador.setRol(RolUsuario.Organizador);
        organizador.setEstado(EstadoUsuario.Activo);
        organizador.setSaldoCreditos(0);

        Organizador saved = organizadorRepository.save(organizador);
        int creditosBienvenida = configuracionService.obtenerEntero(
                CLAVE_CREDITOS_BIENVENIDA, CREDITOS_BIENVENIDA_DEFAULT);
        creditoLedgerService.registrarBienvenida(saved, creditosBienvenida);
        log.info("Nuevo Organizador registrado: {} (id={}), créditos de bienvenida={}",
                saved.getEmail(), saved.getId(), creditosBienvenida);

        // Generar token inmediatamente para que el cliente quede autenticado
        String token = jwtUtils.generateToken(saved);

        return buildAuthResponse(saved, token);
    }

    // ─────────────────────────────────────────────
    // Helper
    // ─────────────────────────────────────────────

    private AuthResponseDTO buildAuthResponse(Usuario usuario, String token) {
        return AuthResponseDTO.builder()
                .token(token)
                .id(usuario.getId())
                .nombre(usuario.getNombre())
                .email(usuario.getEmail())
                .rol(usuario.getRol())
                .build();
    }
}
