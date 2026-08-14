package com.asistiapp.backend.services.admin;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.entities.StaffVendedor;
import com.asistiapp.backend.models.entities.Usuario;
import com.asistiapp.backend.models.enums.EstadoUsuario;
import com.asistiapp.backend.models.enums.RolUsuario;
import com.asistiapp.backend.repositories.EventoRepository;
import com.asistiapp.backend.repositories.StaffVendedorRepository;
import com.asistiapp.backend.repositories.UsuarioRepository;
import com.asistiapp.backend.security.SecurityUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * AdminUsuarioService: la propia cuenta del Admin nunca puede ser el blanco
 * de sus propias acciones destructivas, y eliminar un Organizador con
 * recursos a cargo tiene que quedar bloqueado para no dejar referencias
 * huérfanas (eventos/staff sin dueño).
 */
@ExtendWith(MockitoExtension.class)
class AdminUsuarioServiceTest {

    private static final Long ID_ADMIN_AUTENTICADO = 1L;
    private static final Long ID_OTRO_USUARIO = 2L;

    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private EventoRepository eventoRepository;
    @Mock
    private StaffVendedorRepository staffVendedorRepository;
    @Mock
    private SecurityUtils securityUtils;

    @InjectMocks
    private AdminUsuarioService adminUsuarioService;

    private Usuario usuario;

    @BeforeEach
    void setUp() {
        usuario = new Usuario();
        usuario.setId(ID_OTRO_USUARIO);
        usuario.setNombre("Usuario de prueba");
        usuario.setEmail("usuario@test.com");
        usuario.setRol(RolUsuario.Organizador);
        usuario.setEstado(EstadoUsuario.Activo);
    }

    // ─────────────────────────────────────────────
    // Protección contra auto-acción del Admin
    // ─────────────────────────────────────────────

    @Test
    void suspenderUsuario_aSiMismo_lanzaBusinessRuleException() {
        usuario.setId(ID_ADMIN_AUTENTICADO);
        when(usuarioRepository.findById(ID_ADMIN_AUTENTICADO)).thenReturn(Optional.of(usuario));
        when(securityUtils.getIdUsuarioAutenticado()).thenReturn(ID_ADMIN_AUTENTICADO);

        assertThatThrownBy(() -> adminUsuarioService.suspenderUsuario(ID_ADMIN_AUTENTICADO))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("propia cuenta");

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void reasignarRol_aSiMismo_lanzaBusinessRuleException() {
        usuario.setId(ID_ADMIN_AUTENTICADO);
        when(usuarioRepository.findById(ID_ADMIN_AUTENTICADO)).thenReturn(Optional.of(usuario));
        when(securityUtils.getIdUsuarioAutenticado()).thenReturn(ID_ADMIN_AUTENTICADO);

        assertThatThrownBy(() -> adminUsuarioService.reasignarRol(ID_ADMIN_AUTENTICADO, RolUsuario.Staff_QR))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void eliminarUsuario_aSiMismo_lanzaBusinessRuleException() {
        usuario.setId(ID_ADMIN_AUTENTICADO);
        usuario.setRol(RolUsuario.Administrador);
        when(usuarioRepository.findById(ID_ADMIN_AUTENTICADO)).thenReturn(Optional.of(usuario));
        when(securityUtils.getIdUsuarioAutenticado()).thenReturn(ID_ADMIN_AUTENTICADO);

        assertThatThrownBy(() -> adminUsuarioService.eliminarUsuario(ID_ADMIN_AUTENTICADO))
                .isInstanceOf(BusinessRuleException.class);

        verify(usuarioRepository, never()).delete(any());
    }

    // ─────────────────────────────────────────────
    // suspenderUsuario / activarUsuario
    // ─────────────────────────────────────────────

    @Test
    void suspenderUsuario_yaSuspendido_lanzaBusinessRuleException() {
        usuario.setEstado(EstadoUsuario.Suspendido);
        when(usuarioRepository.findById(ID_OTRO_USUARIO)).thenReturn(Optional.of(usuario));
        when(securityUtils.getIdUsuarioAutenticado()).thenReturn(ID_ADMIN_AUTENTICADO);

        assertThatThrownBy(() -> adminUsuarioService.suspenderUsuario(ID_OTRO_USUARIO))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void activarUsuario_yaActivo_lanzaBusinessRuleException() {
        when(usuarioRepository.findById(ID_OTRO_USUARIO)).thenReturn(Optional.of(usuario));

        assertThatThrownBy(() -> adminUsuarioService.activarUsuario(ID_OTRO_USUARIO))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void suspenderUsuario_exitoso_cambiaEstado() {
        when(usuarioRepository.findById(ID_OTRO_USUARIO)).thenReturn(Optional.of(usuario));
        when(securityUtils.getIdUsuarioAutenticado()).thenReturn(ID_ADMIN_AUTENTICADO);
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = adminUsuarioService.suspenderUsuario(ID_OTRO_USUARIO);

        assertThat(response.getEstado()).isEqualTo(EstadoUsuario.Suspendido);
    }

    // ─────────────────────────────────────────────
    // reasignarRol
    // ─────────────────────────────────────────────

    @Test
    void reasignarRol_alMismoRolQueYaTiene_lanzaBusinessRuleException() {
        when(usuarioRepository.findById(ID_OTRO_USUARIO)).thenReturn(Optional.of(usuario));
        when(securityUtils.getIdUsuarioAutenticado()).thenReturn(ID_ADMIN_AUTENTICADO);

        assertThatThrownBy(() -> adminUsuarioService.reasignarRol(ID_OTRO_USUARIO, RolUsuario.Organizador))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void reasignarRol_exitoso_cambiaElRol() {
        when(usuarioRepository.findById(ID_OTRO_USUARIO)).thenReturn(Optional.of(usuario));
        when(securityUtils.getIdUsuarioAutenticado()).thenReturn(ID_ADMIN_AUTENTICADO);
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = adminUsuarioService.reasignarRol(ID_OTRO_USUARIO, RolUsuario.Staff_QR);

        assertThat(response.getRol()).isEqualTo(RolUsuario.Staff_QR);
    }

    // ─────────────────────────────────────────────
    // eliminarUsuario — bloqueo de referencias huérfanas
    // ─────────────────────────────────────────────

    @Test
    void eliminarUsuario_organizadorConEventos_lanzaBusinessRuleExceptionYNoElimina() {
        when(usuarioRepository.findById(ID_OTRO_USUARIO)).thenReturn(Optional.of(usuario));
        when(securityUtils.getIdUsuarioAutenticado()).thenReturn(ID_ADMIN_AUTENTICADO);
        when(eventoRepository.findByIdOrganizador(ID_OTRO_USUARIO)).thenReturn(List.of(new Evento()));

        assertThatThrownBy(() -> adminUsuarioService.eliminarUsuario(ID_OTRO_USUARIO))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("eventos creados");

        verify(usuarioRepository, never()).delete(any());
    }

    @Test
    void eliminarUsuario_organizadorConStaffVendedor_lanzaBusinessRuleExceptionYNoElimina() {
        when(usuarioRepository.findById(ID_OTRO_USUARIO)).thenReturn(Optional.of(usuario));
        when(securityUtils.getIdUsuarioAutenticado()).thenReturn(ID_ADMIN_AUTENTICADO);
        when(eventoRepository.findByIdOrganizador(ID_OTRO_USUARIO)).thenReturn(List.of());
        when(staffVendedorRepository.findByIdOrganizador(ID_OTRO_USUARIO)).thenReturn(List.of(new StaffVendedor()));

        assertThatThrownBy(() -> adminUsuarioService.eliminarUsuario(ID_OTRO_USUARIO))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Staff Vendedor");

        verify(usuarioRepository, never()).delete(any());
    }

    @Test
    void eliminarUsuario_organizadorSinRecursosACargo_seElimina() {
        when(usuarioRepository.findById(ID_OTRO_USUARIO)).thenReturn(Optional.of(usuario));
        when(securityUtils.getIdUsuarioAutenticado()).thenReturn(ID_ADMIN_AUTENTICADO);
        when(eventoRepository.findByIdOrganizador(ID_OTRO_USUARIO)).thenReturn(List.of());
        when(staffVendedorRepository.findByIdOrganizador(ID_OTRO_USUARIO)).thenReturn(List.of());

        adminUsuarioService.eliminarUsuario(ID_OTRO_USUARIO);

        verify(usuarioRepository).delete(usuario);
    }

    @Test
    void eliminarUsuario_noEsOrganizador_seEliminaSinChequearRecursos() {
        usuario.setRol(RolUsuario.Staff_QR);
        when(usuarioRepository.findById(ID_OTRO_USUARIO)).thenReturn(Optional.of(usuario));
        when(securityUtils.getIdUsuarioAutenticado()).thenReturn(ID_ADMIN_AUTENTICADO);

        adminUsuarioService.eliminarUsuario(ID_OTRO_USUARIO);

        verify(usuarioRepository).delete(usuario);
        verifyNoInteractions(eventoRepository, staffVendedorRepository);
    }

    @Test
    void usuarioInexistente_lanzaResourceNotFoundException() {
        when(usuarioRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminUsuarioService.suspenderUsuario(999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
