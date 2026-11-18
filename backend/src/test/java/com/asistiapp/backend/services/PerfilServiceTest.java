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
    @Mock
    private com.asistiapp.backend.repositories.OrganizadorRepository organizadorRepository;
    @Mock
    private LimiteCompradorService limiteCompradorService;
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
        lenient().when(usuarioRepository.findById(ID)).thenReturn(Optional.of(usuario));
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

    // ── Tope de entradas por comprador (8.9) ────────────────

    private com.asistiapp.backend.models.entities.Organizador organizador(Integer tope) {
        var o = new com.asistiapp.backend.models.entities.Organizador();
        o.setId(ID);
        o.setMaxEntradasPorComprador(tope);
        return o;
    }

    @Test
    void obtenerPerfil_traeElTopePropioYElDeLaPlataforma() {
        when(organizadorRepository.findById(ID)).thenReturn(Optional.of(organizador(4)));
        when(limiteCompradorService.limiteGlobal()).thenReturn(6);

        var response = perfilService.obtenerPerfil(ID);

        assertThat(response.getMaxEntradasPorComprador()).isEqualTo(4);
        assertThat(response.getMaxEntradasPorCompradorPlataforma()).isEqualTo(6);
    }

    // ── Comisión de Mercado Pago: quién la paga ─────────────

    @Test
    void obtenerPerfil_sinPreferenciaDeComision_laAbsorbeElOrganizadorConLosValoresPorDefecto() {
        when(organizadorRepository.findById(ID)).thenReturn(Optional.of(organizador(null)));

        var response = perfilService.obtenerPerfil(ID);

        assertThat(response.isTrasladarCargoMp()).isFalse();
        assertThat(response.getPlazoLiberacionMp()).isEqualTo(com.asistiapp.backend.models.enums.PlazoLiberacionMp.AlInstante);
        assertThat(response.getZonaComisionMp()).isEqualTo(com.asistiapp.backend.models.enums.ZonaComisionMp.General);
        assertThat(response.getPorcentajeCargoComprador()).isEqualTo(8.24);
    }

    @Test
    void cambiarComisionMp_guardaQuienPagaElPlazoYLaZona() {
        var org = organizador(null);
        when(organizadorRepository.findById(ID)).thenReturn(Optional.of(org));
        when(organizadorRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var response = perfilService.cambiarComisionMp(ID, true,
                com.asistiapp.backend.models.enums.PlazoLiberacionMp.Dias35,
                com.asistiapp.backend.models.enums.ZonaComisionMp.General);

        assertThat(org.isTrasladarCargoMp()).isTrue();
        assertThat(org.getPlazoLiberacionMp()).isEqualTo(com.asistiapp.backend.models.enums.PlazoLiberacionMp.Dias35);
        assertThat(response.isTrasladarCargoMp()).isTrue();
        assertThat(response.getPorcentajeCargoComprador()).isEqualTo(1.84);
    }

    @Test
    void cambiarComisionMp_sinPlazo_lanzaBusinessRuleExceptionYNoGuarda() {
        assertThatThrownBy(() -> perfilService.cambiarComisionMp(ID, true, null,
                com.asistiapp.backend.models.enums.ZonaComisionMp.General))
                .isInstanceOf(com.asistiapp.backend.exceptions.BusinessRuleException.class);
        verify(organizadorRepository, never()).save(any());
    }

    @Test
    void obtenerPerfil_sinTopePropio_viene_null() {
        when(organizadorRepository.findById(ID)).thenReturn(Optional.of(organizador(null)));

        assertThat(perfilService.obtenerPerfil(ID).getMaxEntradasPorComprador()).isNull();
    }

    @Test
    void cambiarTopeComprador_guardaElValor() {
        var org = organizador(null);
        when(organizadorRepository.findById(ID)).thenReturn(Optional.of(org));
        when(organizadorRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var response = perfilService.cambiarTopeComprador(ID, 10);

        assertThat(org.getMaxEntradasPorComprador()).isEqualTo(10);
        assertThat(response.getMaxEntradasPorComprador()).isEqualTo(10);
    }

    @Test
    void cambiarTopeComprador_conNull_vuelveAlDeLaPlataforma() {
        var org = organizador(4);
        when(organizadorRepository.findById(ID)).thenReturn(Optional.of(org));
        when(organizadorRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        perfilService.cambiarTopeComprador(ID, null);

        assertThat(org.getMaxEntradasPorComprador()).isNull();
    }

    @Test
    void cambiarTopeComprador_fueraDeRango_lanzaBusinessRuleExceptionYNoGuarda() {
        assertThatThrownBy(() -> perfilService.cambiarTopeComprador(ID, 0)).isInstanceOf(BusinessRuleException.class);
        assertThatThrownBy(() -> perfilService.cambiarTopeComprador(ID, 101)).isInstanceOf(BusinessRuleException.class);
        verify(organizadorRepository, never()).save(any());
    }

    // ── Contacto para el arrepentimiento (8.8) ──────────────

    @Test
    void cambiarContacto_guardaWhatsappSoloConDigitos_yEmail() {
        var org = organizador(null);
        when(organizadorRepository.findById(ID)).thenReturn(Optional.of(org));
        when(organizadorRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var response = perfilService.cambiarContacto(ID, "+54 9 11 5555-1234", " Hola@Evento.com ");

        assertThat(org.getContactoWhatsapp()).isEqualTo("5491155551234");
        assertThat(org.getContactoEmail()).isEqualTo("hola@evento.com");
        assertThat(response.getContactoWhatsapp()).isEqualTo("5491155551234");
        assertThat(response.getContactoEmail()).isEqualTo("hola@evento.com");
    }

    @Test
    void cambiarContacto_conUnSoloMedio_alcanza() {
        var org = organizador(null);
        when(organizadorRepository.findById(ID)).thenReturn(Optional.of(org));
        when(organizadorRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        perfilService.cambiarContacto(ID, "", "hola@evento.com");

        assertThat(org.getContactoWhatsapp()).isNull();
        assertThat(org.getContactoEmail()).isEqualTo("hola@evento.com");
    }

    @Test
    void cambiarContacto_vacioEnAmbos_loBorra() {
        var org = organizador(null);
        org.setContactoWhatsapp("5491155551234");
        org.setContactoEmail("hola@evento.com");
        when(organizadorRepository.findById(ID)).thenReturn(Optional.of(org));
        when(organizadorRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        perfilService.cambiarContacto(ID, null, "  ");

        assertThat(org.getContactoWhatsapp()).isNull();
        assertThat(org.getContactoEmail()).isNull();
    }

    @Test
    void cambiarContacto_whatsappInvalido_lanzaBusinessRuleExceptionYNoGuarda() {
        assertThatThrownBy(() -> perfilService.cambiarContacto(ID, "12345", null)).isInstanceOf(BusinessRuleException.class);
        assertThatThrownBy(() -> perfilService.cambiarContacto(ID, "abc", null)).isInstanceOf(BusinessRuleException.class);
        verify(organizadorRepository, never()).save(any());
    }

    @Test
    void cambiarContacto_emailInvalido_lanzaBusinessRuleExceptionYNoGuarda() {
        assertThatThrownBy(() -> perfilService.cambiarContacto(ID, null, "no-es-un-mail")).isInstanceOf(BusinessRuleException.class);
        verify(organizadorRepository, never()).save(any());
    }

    @Test
    void obtenerPerfil_traeElContacto() {
        var org = organizador(null);
        org.setContactoWhatsapp("5491155551234");
        when(organizadorRepository.findById(ID)).thenReturn(Optional.of(org));

        assertThat(perfilService.obtenerPerfil(ID).getContactoWhatsapp()).isEqualTo("5491155551234");
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
