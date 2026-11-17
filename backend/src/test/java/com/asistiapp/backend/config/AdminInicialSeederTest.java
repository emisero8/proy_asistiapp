package com.asistiapp.backend.config;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.asistiapp.backend.models.entities.Usuario;
import com.asistiapp.backend.models.enums.EstadoUsuario;
import com.asistiapp.backend.models.enums.RolUsuario;
import com.asistiapp.backend.repositories.UsuarioRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminInicialSeederTest {

    private static final String PASSWORD_REAL = "Pr0d-Clave-Larga-Y-Propia!";

    @Mock private UsuarioRepository usuarioRepository;
    @Mock private PasswordEncoder passwordEncoder;

    private ListAppender<ILoggingEvent> log;
    private Logger logger;
    private ch.qos.logback.classic.Level nivelOriginal;

    @BeforeEach
    void capturarLog() {
        logger = (Logger) LoggerFactory.getLogger(AdminInicialSeeder.class);
        // Otros tests de la suite dejan este paquete en un nivel más alto: se fija para que no dependa del orden.
        nivelOriginal = logger.getLevel();
        logger.setLevel(ch.qos.logback.classic.Level.DEBUG);
        log = new ListAppender<>();
        log.start();
        logger.addAppender(log);
    }

    @AfterEach
    void liberarLog() {
        logger.detachAppender(log);
        logger.setLevel(nivelOriginal);
    }

    private AdminInicialSeeder seeder(String email, String password, String... perfiles) {
        StandardEnvironment env = new StandardEnvironment();
        env.setActiveProfiles(perfiles);
        return new AdminInicialSeeder(usuarioRepository, passwordEncoder, env, email, password);
    }

    private void sinAdmins() {
        when(usuarioRepository.findByRol(RolUsuario.Administrador)).thenReturn(List.of());
    }

    private Usuario adminGuardado() {
        ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepository).save(captor.capture());
        return captor.getValue();
    }

    private String todoElLog() {
        return log.list.stream().map(ILoggingEvent::getFormattedMessage).reduce("", (a, b) -> a + "\n" + b);
    }

    @Test
    void siYaHayUnAdmin_noHaceNada() {
        when(usuarioRepository.findByRol(RolUsuario.Administrador)).thenReturn(List.of(new Usuario()));

        seeder("", "", "prod").run();
        seeder(PASSWORD_REAL, PASSWORD_REAL).run();

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void enDesarrolloSinVariables_creaElAdminDeDesarrollo() {
        sinAdmins();
        when(passwordEncoder.encode(AdminInicialSeeder.PASSWORD_DE_DESARROLLO)).thenReturn("hash-dev");

        seeder("", "").run();

        Usuario admin = adminGuardado();
        assertThat(admin.getEmail()).isEqualTo(AdminInicialSeeder.EMAIL_POR_DEFECTO);
        assertThat(admin.getPasswordHash()).isEqualTo("hash-dev");
        assertThat(admin.getRol()).isEqualTo(RolUsuario.Administrador);
        assertThat(admin.getEstado()).isEqualTo(EstadoUsuario.Activo);
    }

    @Test
    void enProduccionSinPassword_noCreaNingunAdminYAvisa() {
        sinAdmins();

        seeder("", "", "prod").run();
        seeder("jefe@empresa.com", "   ", "prod").run();

        verify(usuarioRepository, never()).save(any());
        assertThat(todoElLog()).contains("ADMIN_INICIAL_PASSWORD");
        assertThat(todoElLog()).doesNotContain(AdminInicialSeeder.PASSWORD_DE_DESARROLLO);
    }

    @Test
    void conVariablesDefinidas_creaElAdminConEsasCredenciales_enCualquierPerfil() {
        sinAdmins();
        when(passwordEncoder.encode(PASSWORD_REAL)).thenReturn("hash-real");

        seeder("jefe@empresa.com", PASSWORD_REAL, "prod").run();

        Usuario admin = adminGuardado();
        assertThat(admin.getEmail()).isEqualTo("jefe@empresa.com");
        assertThat(admin.getPasswordHash()).isEqualTo("hash-real");
        // Nunca queda la contraseña pública cuando se configuró una propia.
        verify(passwordEncoder, never()).encode(AdminInicialSeeder.PASSWORD_DE_DESARROLLO);
    }

    @Test
    void conPasswordPeroSinEmail_usaElEmailPorDefecto() {
        sinAdmins();
        when(passwordEncoder.encode(PASSWORD_REAL)).thenReturn("hash-real");

        seeder("  ", PASSWORD_REAL).run();

        assertThat(adminGuardado().getEmail()).isEqualTo(AdminInicialSeeder.EMAIL_POR_DEFECTO);
    }

    @Test
    void laPasswordConfiguradaNuncaSeEscribeEnElLog() {
        sinAdmins();
        when(passwordEncoder.encode(PASSWORD_REAL)).thenReturn("hash-real");

        seeder("jefe@empresa.com", PASSWORD_REAL, "prod").run();

        assertThat(log.list).isNotEmpty();
        assertThat(todoElLog()).doesNotContain(PASSWORD_REAL).doesNotContain("hash-real");
    }

    @Test
    void unaPasswordConfiguradaDemasiadoCorta_haceFallarElArranque() {
        sinAdmins();

        assertThatThrownBy(() -> seeder("", "corta").run())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ADMIN_INICIAL_PASSWORD");
        assertThatThrownBy(() -> seeder("", "corta", "prod").run())
                .isInstanceOf(IllegalStateException.class);

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void unEmailConfiguradoSinArroba_haceFallarElArranque() {
        sinAdmins();

        assertThatThrownBy(() -> seeder("no-es-un-mail", PASSWORD_REAL).run())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ADMIN_INICIAL_EMAIL");

        verify(usuarioRepository, never()).save(any());
    }
}
