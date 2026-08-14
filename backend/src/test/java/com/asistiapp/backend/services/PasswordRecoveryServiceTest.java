package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.entities.TokenRecuperacion;
import com.asistiapp.backend.models.entities.Usuario;
import com.asistiapp.backend.repositories.TokenRecuperacionRepository;
import com.asistiapp.backend.repositories.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * CU-003. Dos garantías de seguridad puntuales a cubrir (ver SECURITY.md):
 * no revelar si un email existe, y que un token sea de un solo uso y con
 * vencimiento real — no solo "un uso lógico" sino que expirado también corte.
 */
@ExtendWith(MockitoExtension.class)
class PasswordRecoveryServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private TokenRecuperacionRepository tokenRecuperacionRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private EmailService emailService;

    @InjectMocks
    private PasswordRecoveryService passwordRecoveryService;

    private Usuario usuario;

    @BeforeEach
    void setUp() {
        usuario = new Usuario();
        usuario.setId(1L);
        usuario.setNombre("Usuario Test");
        usuario.setEmail("usuario@test.com");
    }

    // ─────────────────────────────────────────────
    // solicitarRecuperacion — no debe filtrar qué emails existen
    // ─────────────────────────────────────────────

    @Test
    void solicitarRecuperacion_emailNoRegistrado_noHaceNadaYNoLanzaExcepcion() {
        when(usuarioRepository.findByEmail("noexiste@test.com")).thenReturn(Optional.empty());

        passwordRecoveryService.solicitarRecuperacion("noexiste@test.com");

        verifyNoInteractions(tokenRecuperacionRepository, emailService);
    }

    @Test
    void solicitarRecuperacion_emailRegistrado_generaTokenYEnviaEmail() {
        when(usuarioRepository.findByEmail(usuario.getEmail())).thenReturn(Optional.of(usuario));

        passwordRecoveryService.solicitarRecuperacion(usuario.getEmail());

        verify(tokenRecuperacionRepository).save(argThat(t ->
                t.getIdUsuario().equals(usuario.getId())
                        && !t.isUsado()
                        && t.getFechaExpiracion().isAfter(LocalDateTime.now())));
        verify(emailService).enviarEmailRecuperacion(eq(usuario.getEmail()), eq(usuario.getNombre()), anyString());
    }

    // ─────────────────────────────────────────────
    // restablecerPassword
    // ─────────────────────────────────────────────

    @Test
    void restablecerPassword_tokenInexistente_lanzaBusinessRuleException() {
        when(tokenRecuperacionRepository.findByToken("token-invalido")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> passwordRecoveryService.restablecerPassword("token-invalido", "nuevaPass123"))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void restablecerPassword_tokenYaUsado_lanzaBusinessRuleException() {
        TokenRecuperacion token = tokenValido();
        token.setUsado(true);
        when(tokenRecuperacionRepository.findByToken(token.getToken())).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> passwordRecoveryService.restablecerPassword(token.getToken(), "nuevaPass123"))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("ya fue utilizado");

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void restablecerPassword_tokenExpirado_lanzaBusinessRuleException() {
        TokenRecuperacion token = tokenValido();
        token.setFechaExpiracion(LocalDateTime.now().minusMinutes(1));
        when(tokenRecuperacionRepository.findByToken(token.getToken())).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> passwordRecoveryService.restablecerPassword(token.getToken(), "nuevaPass123"))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("expiró");

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void restablecerPassword_usuarioDelTokenYaNoExiste_lanzaResourceNotFoundException() {
        TokenRecuperacion token = tokenValido();
        when(tokenRecuperacionRepository.findByToken(token.getToken())).thenReturn(Optional.of(token));
        when(usuarioRepository.findById(token.getIdUsuario())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> passwordRecoveryService.restablecerPassword(token.getToken(), "nuevaPass123"))
                .isInstanceOf(ResourceNotFoundException.class);

        // El token NO debe quedar marcado como usado si la operación falló
        assertThat(token.isUsado()).isFalse();
    }

    @Test
    void restablecerPassword_exitoso_actualizaHashYMarcaElTokenComoUsado() {
        TokenRecuperacion token = tokenValido();
        when(tokenRecuperacionRepository.findByToken(token.getToken())).thenReturn(Optional.of(token));
        when(usuarioRepository.findById(token.getIdUsuario())).thenReturn(Optional.of(usuario));
        when(passwordEncoder.encode("nuevaPass123")).thenReturn("hash-nuevo");

        passwordRecoveryService.restablecerPassword(token.getToken(), "nuevaPass123");

        assertThat(usuario.getPasswordHash()).isEqualTo("hash-nuevo");
        assertThat(token.isUsado()).isTrue();
        verify(usuarioRepository).save(usuario);
        verify(tokenRecuperacionRepository).save(token);
    }

    // ─────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────

    private TokenRecuperacion tokenValido() {
        TokenRecuperacion token = new TokenRecuperacion();
        token.setToken("token-valido-123");
        token.setIdUsuario(usuario.getId());
        token.setFechaExpiracion(LocalDateTime.now().plusMinutes(30));
        token.setUsado(false);
        return token;
    }
}
