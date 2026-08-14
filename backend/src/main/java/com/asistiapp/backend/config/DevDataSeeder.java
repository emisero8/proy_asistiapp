package com.asistiapp.backend.config;

import com.asistiapp.backend.models.entities.Usuario;
import com.asistiapp.backend.models.enums.EstadoUsuario;
import com.asistiapp.backend.models.enums.RolUsuario;
import com.asistiapp.backend.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Siembra el primer Administrador si todavía no existe ninguno.
 *
 * No hay ningún flujo de auto-registro para Administrador (a propósito:
 * CU-001/002 solo permiten auto-registro de Organizador, el resto de los
 * roles los da de alta un Administrador ya existente) — sin este seeder,
 * la única forma de tener el primer Admin es insertarlo a mano en la BD.
 * Corre solo fuera del perfil "prod" (ver application-prod.yml).
 */
@Slf4j
@Component
@Profile("!prod")
@RequiredArgsConstructor
public class DevDataSeeder implements CommandLineRunner {

    private static final String ADMIN_EMAIL = "admin@asistiapp.com";
    private static final String ADMIN_PASSWORD_DEV = "Admin123!";

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        boolean existeAdmin = usuarioRepository.findByRol(RolUsuario.Administrador).stream().findAny().isPresent();
        if (existeAdmin) {
            return;
        }

        Usuario admin = new Usuario();
        admin.setNombre("Administrador AsistíAPP");
        admin.setEmail(ADMIN_EMAIL);
        admin.setPasswordHash(passwordEncoder.encode(ADMIN_PASSWORD_DEV));
        admin.setRol(RolUsuario.Administrador);
        admin.setEstado(EstadoUsuario.Activo);
        usuarioRepository.save(admin);

        log.warn("No había ningún Administrador — se creó uno de desarrollo: {} / {} (cambiar en producción)",
                ADMIN_EMAIL, ADMIN_PASSWORD_DEV);
    }
}
