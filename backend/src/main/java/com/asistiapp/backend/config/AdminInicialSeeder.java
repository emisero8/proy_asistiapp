package com.asistiapp.backend.config;

import com.asistiapp.backend.models.entities.Usuario;
import com.asistiapp.backend.models.enums.EstadoUsuario;
import com.asistiapp.backend.models.enums.RolUsuario;
import com.asistiapp.backend.repositories.UsuarioRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Crea el primer Administrador si todavía no existe ninguno.
 *
 * No hay ningún flujo de auto-registro para Administrador (a propósito: CU-001/002 solo
 * permiten auto-registro de Organizador, el resto de los roles los da de alta un Administrador
 * ya existente) — sin este seeder, la única forma de tener el primer Admin es insertarlo a mano
 * en la BD con un hash de contraseña.
 *
 * Las credenciales salen de las variables de entorno ADMIN_INICIAL_EMAIL y ADMIN_INICIAL_PASSWORD,
 * así que no hace falta que ninguna contraseña real esté en el repo. Si no se definen:
 *  - en desarrollo se crea un Admin con una contraseña de desarrollo (pública, está en este archivo)
 *    para no obligar a configurar nada en local;
 *  - en producción (perfil "prod") NO se crea nada y se avisa: crear un Admin con una contraseña
 *    pública sería regalar el sistema. Hay que definir ADMIN_INICIAL_PASSWORD.
 *
 * La contraseña de una variable de entorno nunca se escribe en el log.
 */
@Slf4j
@Component
public class AdminInicialSeeder implements CommandLineRunner {

    static final String EMAIL_POR_DEFECTO = "admin@asistiapp.com";
    static final String PASSWORD_DE_DESARROLLO = "Admin123!";
    /** Mismo mínimo que piden el registro y el cambio de contraseña del Admin. */
    static final int LONGITUD_MINIMA_PASSWORD = 8;

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final Environment environment;
    private final String emailConfigurado;
    private final String passwordConfigurada;

    public AdminInicialSeeder(UsuarioRepository usuarioRepository,
                              PasswordEncoder passwordEncoder,
                              Environment environment,
                              @Value("${app.admin-inicial.email:}") String emailConfigurado,
                              @Value("${app.admin-inicial.password:}") String passwordConfigurada) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.environment = environment;
        this.emailConfigurado = emailConfigurado;
        this.passwordConfigurada = passwordConfigurada;
    }

    @Override
    public void run(String... args) {
        boolean existeAdmin = usuarioRepository.findByRol(RolUsuario.Administrador).stream().findAny().isPresent();
        if (existeAdmin) {
            return;
        }

        boolean hayPasswordConfigurada = passwordConfigurada != null && !passwordConfigurada.isBlank();
        boolean esProduccion = environment.acceptsProfiles(Profiles.of("prod"));

        if (!hayPasswordConfigurada && esProduccion) {
            log.warn("No hay ningún Administrador y ADMIN_INICIAL_PASSWORD no está definida: no se crea ninguno. "
                    + "Definí ADMIN_INICIAL_PASSWORD (y opcionalmente ADMIN_INICIAL_EMAIL) y reiniciá el backend.");
            return;
        }

        String email = emailConfigurado != null && !emailConfigurado.isBlank()
                ? emailConfigurado.trim()
                : EMAIL_POR_DEFECTO;
        String password = hayPasswordConfigurada ? passwordConfigurada : PASSWORD_DE_DESARROLLO;

        if (hayPasswordConfigurada) {
            // Configuración explícita equivocada: mejor no arrancar que crear un Admin con una clave débil.
            if (password.length() < LONGITUD_MINIMA_PASSWORD) {
                throw new IllegalStateException("ADMIN_INICIAL_PASSWORD es demasiado corta: necesita al menos "
                        + LONGITUD_MINIMA_PASSWORD + " caracteres.");
            }
            if (!email.contains("@")) {
                throw new IllegalStateException("ADMIN_INICIAL_EMAIL no parece un email válido.");
            }
        }

        Usuario admin = new Usuario();
        admin.setNombre("Administrador AsistíAPP");
        admin.setEmail(email);
        admin.setPasswordHash(passwordEncoder.encode(password));
        admin.setRol(RolUsuario.Administrador);
        admin.setEstado(EstadoUsuario.Activo);
        usuarioRepository.save(admin);

        if (hayPasswordConfigurada) {
            log.info("No había ningún Administrador: se creó {} con la contraseña de ADMIN_INICIAL_PASSWORD.", email);
        } else {
            log.warn("No había ningún Administrador — se creó uno de desarrollo: {} / {} (público: en producción "
                    + "definí ADMIN_INICIAL_PASSWORD)", email, PASSWORD_DE_DESARROLLO);
        }
    }
}
