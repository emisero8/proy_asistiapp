package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.entities.TokenRecuperacion;
import com.asistiapp.backend.models.entities.Usuario;
import com.asistiapp.backend.repositories.TokenRecuperacionRepository;
import com.asistiapp.backend.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

/**
 * Recuperación de contraseña (CU-003).
 *
 * `solicitarRecuperacion` nunca revela si un email existe o no en el sistema
 * — responde igual en ambos casos — para no filtrar qué cuentas están
 * registradas (ver SECURITY.md).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordRecoveryService {

    private static final int EXPIRACION_MINUTOS = 30;

    private final UsuarioRepository usuarioRepository;
    private final TokenRecuperacionRepository tokenRecuperacionRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Transactional
    public void solicitarRecuperacion(String email) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findByEmail(email);
        if (usuarioOpt.isEmpty()) {
            log.info("Recuperación solicitada para email no registrado: {}", email);
            return;
        }

        Usuario usuario = usuarioOpt.get();
        String token = UUID.randomUUID().toString();

        TokenRecuperacion tokenRecuperacion = new TokenRecuperacion();
        tokenRecuperacion.setToken(token);
        tokenRecuperacion.setIdUsuario(usuario.getId());
        tokenRecuperacion.setFechaExpiracion(LocalDateTime.now().plusMinutes(EXPIRACION_MINUTOS));
        tokenRecuperacion.setUsado(false);
        tokenRecuperacionRepository.save(tokenRecuperacion);

        emailService.enviarEmailRecuperacion(usuario.getEmail(), usuario.getNombre(), token);
        log.info("Token de recuperación generado para usuario id={}", usuario.getId());
    }

    @Transactional
    public void restablecerPassword(String token, String nuevaPassword) {
        TokenRecuperacion tokenRecuperacion = tokenRecuperacionRepository.findByToken(token)
                .orElseThrow(() -> new BusinessRuleException("Token de recuperación inválido"));

        if (tokenRecuperacion.isUsado()) {
            throw new BusinessRuleException("Este token ya fue utilizado");
        }
        if (tokenRecuperacion.getFechaExpiracion().isBefore(LocalDateTime.now())) {
            throw new BusinessRuleException("El token de recuperación expiró, solicitá uno nuevo");
        }

        Usuario usuario = usuarioRepository.findById(tokenRecuperacion.getIdUsuario())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));

        usuario.setPasswordHash(passwordEncoder.encode(nuevaPassword));
        usuarioRepository.save(usuario);

        tokenRecuperacion.setUsado(true);
        tokenRecuperacionRepository.save(tokenRecuperacion);

        log.info("Contraseña restablecida para usuario id={}", usuario.getId());
    }
}
