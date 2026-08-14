package com.asistiapp.backend.security;

import com.asistiapp.backend.models.entities.Usuario;
import com.asistiapp.backend.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Implementación de UserDetailsService que Spring Security invoca
 * durante la autenticación para cargar el usuario por su identificador (email).
 *
 * El prefijo "ROLE_" es requerido por Spring Security para que
 * hasRole("Organizador") y hasAuthority("ROLE_Organizador") funcionen.
 */
@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UsuarioRepository usuarioRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "No se encontró ningún usuario con el email: " + email));

        // Mapear el enum de rol a una GrantedAuthority con prefijo ROLE_
        SimpleGrantedAuthority authority =
                new SimpleGrantedAuthority("ROLE_" + usuario.getRol().name());

        return new User(
                usuario.getEmail(),
                usuario.getPasswordHash(),
                List.of(authority)
        );
    }
}
