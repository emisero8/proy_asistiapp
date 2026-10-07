package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.models.dtos.perfil.CambiarPasswordRequestDTO;
import com.asistiapp.backend.models.dtos.perfil.PerfilRequestDTO;
import com.asistiapp.backend.models.entities.Usuario;
import com.asistiapp.backend.repositories.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PerfilServiceTest {

    private static final Long ID = 7L;
    private static final String FOTO_NUESTRA_VIEJA = "https://res.cloudinary.com/cloud-de-prueba/image/upload/v1/asistiapp/perfiles/vieja.png";
    private static final String FOTO_NUESTRA_NUEVA = "https://res.cloudinary.com/cloud-de-prueba/image/upload/v2/asistiapp/perfiles/nueva.png";

    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private ImagenService imagenService;
    @InjectMocks
    private PerfilService perfilService;

    private Usuario usuario;

    @BeforeEach
    void setUp() {
        usuario = new Usuario();
        usuario.setId(ID);
        usuario.setNombre("Nombre viejo");
        usuario.setEmail("organizador@demo.com");
        usuario.setPasswordHash("hash-actual");
        when(usuarioRepository.findById(ID)).thenReturn(Optional.of(usuario));
    }

    private PerfilRequestDTO perfil(String nombre, String foto) {
        PerfilRequestDTO dto = new PerfilRequestDTO();
        dto.setNombre(nombre);
        dto.setFotoPerfilUrl(foto);
        return dto;
    }

    private CambiarPasswordRequestDTO cambio(String actual, String nueva) {
        CambiarPasswordRequestDTO dto = new CambiarPasswordRequestDTO();
        dto.setPasswordActual(actual);
        dto.setPasswordNueva(nueva);
        return dto;
    }

    // ── Perfil: validación de la foto ───────────────────────

    @Test
    void actualizarPerfil_fotoDeNuestroCloudinary_laGuarda() {
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));
        when(imagenService.esDeNuestroCloudinary(FOTO_NUESTRA_NUEVA)).thenReturn(true);

        var response = perfilService.actualizarPerfil(ID, perfil("Nombre nuevo", FOTO_NUESTRA_NUEVA));

        assertThat(response.getNombre()).isEqualTo("Nombre nuevo");
        assertThat(response.getFotoPerfilUrl()).isEqualTo(FOTO_NUESTRA_NUEVA);
    }

    @Test
    void actualizarPerfil_fotoDeOtroHost_lanzaBusinessRuleExceptionYNoGuarda() {
        when(imagenService.esDeNuestroCloudinary("https://evil.example.com/foto.png")).thenReturn(false);

        assertThatThrownBy(() -> perfilService.actualizarPerfil(ID,
                perfil("Nombre", "https://evil.example.com/foto.png")))
                .isInstanceOf(BusinessRuleException.class);
        verify(usuarioRepository, never()).save(any());
        verify(imagenService, never()).eliminarSiEsNuestra(any());
    }

    // ── Perfil: liberar la foto anterior en Cloudinary ──────

    @Test
    void actualizarPerfil_cambiaLaFoto_borraLaAnteriorDeCloudinary() {
        usuario.setFotoPerfilUrl(FOTO_NUESTRA_VIEJA);
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));
        when(imagenService.esDeNuestroCloudinary(FOTO_NUESTRA_NUEVA)).thenReturn(true);

        perfilService.actualizarPerfil(ID, perfil("Nombre", FOTO_NUESTRA_NUEVA));

        verify(imagenService).eliminarSiEsNuestra(FOTO_NUESTRA_VIEJA);
    }

    @Test
    void actualizarPerfil_quitaLaFoto_borraLaAnteriorDeCloudinary() {
        usuario.setFotoPerfilUrl(FOTO_NUESTRA_VIEJA);
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = perfilService.actualizarPerfil(ID, perfil("Nombre", null));

        assertThat(response.getFotoPerfilUrl()).isNull();
        verify(imagenService).eliminarSiEsNuestra(FOTO_NUESTRA_VIEJA);
    }

    @Test
    void actualizarPerfil_fotoSinCambios_noBorraNada() {
        usuario.setFotoPerfilUrl(FOTO_NUESTRA_VIEJA);
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));
        when(imagenService.esDeNuestroCloudinary(FOTO_NUESTRA_VIEJA)).thenReturn(true);

        perfilService.actualizarPerfil(ID, perfil("Nombre nuevo", FOTO_NUESTRA_VIEJA));

        verify(imagenService, never()).eliminarSiEsNuestra(any());
    }

    @Test
    void actualizarPerfil_sinFotoPrevia_noIntentaBorrarNada() {
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        perfilService.actualizarPerfil(ID, perfil("Nombre", null));

        verify(imagenService, never()).eliminarSiEsNuestra(any());
    }

    // ── Contraseña ──────────────────────────────────────────

    @Test
    void cambiarPassword_actualIncorrecta_lanzaBusinessRuleExceptionYNoCambia() {
        when(passwordEncoder.matches("mal", "hash-actual")).thenReturn(false);

        assertThatThrownBy(() -> perfilService.cambiarPassword(ID, cambio("mal", "Nueva1234")))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("La contraseña actual no es correcta");
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void cambiarPassword_nuevaIgualALaActual_lanzaBusinessRuleException() {
        when(passwordEncoder.matches("Actual1234", "hash-actual")).thenReturn(true);

        assertThatThrownBy(() -> perfilService.cambiarPassword(ID, cambio("Actual1234", "Actual1234")))
                .isInstanceOf(BusinessRuleException.class);
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void cambiarPassword_correcta_guardaElHashNuevo() {
        when(passwordEncoder.matches("Actual1234", "hash-actual")).thenReturn(true);
        when(passwordEncoder.matches("Nueva1234", "hash-actual")).thenReturn(false);
        when(passwordEncoder.encode("Nueva1234")).thenReturn("hash-nuevo");

        perfilService.cambiarPassword(ID, cambio("Actual1234", "Nueva1234"));

        assertThat(usuario.getPasswordHash()).isEqualTo("hash-nuevo");
        verify(usuarioRepository).save(usuario);
    }
}
