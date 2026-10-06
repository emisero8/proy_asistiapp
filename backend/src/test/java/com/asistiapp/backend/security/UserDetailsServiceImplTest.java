package com.asistiapp.backend.security;

import com.asistiapp.backend.models.entities.Usuario;
import com.asistiapp.backend.models.enums.EstadoUsuario;
import com.asistiapp.backend.models.enums.RolUsuario;
import com.asistiapp.backend.repositories.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Una cuenta suspendida o inactiva no puede autenticarse: el UserDetails tiene que
 * venir deshabilitado (Fase 18.2). Si esto falla, el login y el JWT dejan entrar a
 * cuentas suspendidas.
 */
@ExtendWith(MockitoExtension.class)
class UserDetailsServiceImplTest {

    private static final String EMAIL = "organizador@demo.com";

    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private UserDetailsServiceImpl userDetailsService;

    private Usuario usuarioConEstado(EstadoUsuario estado) {
        Usuario usuario = new Usuario();
        usuario.setEmail(EMAIL);
        usuario.setPasswordHash("hash");
        usuario.setRol(RolUsuario.Organizador);
        usuario.setEstado(estado);
        return usuario;
    }

    @Test
    void cuentaActiva_quedaHabilitada() {
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuarioConEstado(EstadoUsuario.Activo)));

        assertThat(userDetailsService.loadUserByUsername(EMAIL).isEnabled()).isTrue();
    }

    @Test
    void cuentaSuspendida_quedaDeshabilitada() {
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuarioConEstado(EstadoUsuario.Suspendido)));

        assertThat(userDetailsService.loadUserByUsername(EMAIL).isEnabled()).isFalse();
    }

    @Test
    void cuentaInactiva_quedaDeshabilitada() {
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuarioConEstado(EstadoUsuario.Inactivo)));

        assertThat(userDetailsService.loadUserByUsername(EMAIL).isEnabled()).isFalse();
    }
}
