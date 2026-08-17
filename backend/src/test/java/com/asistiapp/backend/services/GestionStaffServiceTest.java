package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.ForbiddenActionException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.dtos.staff.CrearStaffQRRequestDTO;
import com.asistiapp.backend.models.dtos.staff.CrearStaffVendedorRequestDTO;
import com.asistiapp.backend.models.dtos.staff.StaffResponseDTO;
import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.entities.StaffQR;
import com.asistiapp.backend.models.entities.StaffVendedor;
import com.asistiapp.backend.models.enums.EstadoUsuario;
import com.asistiapp.backend.models.enums.RolUsuario;
import com.asistiapp.backend.repositories.EventoRepository;
import com.asistiapp.backend.repositories.StaffQRRepository;
import com.asistiapp.backend.repositories.StaffVendedorRepository;
import com.asistiapp.backend.repositories.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * CU-005/CU-006: un Organizador solo puede dar de alta Staff QR para SUS
 * PROPIOS eventos (IDOR), y nunca con un email ya usado en el sistema.
 */
@ExtendWith(MockitoExtension.class)
class GestionStaffServiceTest {

    private static final Long ID_ORGANIZADOR = 1L;
    private static final Long ID_OTRO_ORGANIZADOR = 2L;

    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private EventoRepository eventoRepository;
    @Mock
    private StaffQRRepository staffQRRepository;
    @Mock
    private StaffVendedorRepository staffVendedorRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private EmailService emailService;

    @InjectMocks
    private GestionStaffService gestionStaffService;

    private Evento evento;

    @BeforeEach
    void setUp() {
        evento = new Evento();
        evento.setId(10L);
        evento.setIdOrganizador(ID_ORGANIZADOR);
    }

    // ─────────────────────────────────────────────
    // crearStaffQR
    // ─────────────────────────────────────────────

    @Test
    void crearStaffQR_eventoInexistente_lanzaResourceNotFoundException() {
        when(eventoRepository.findById(10L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> gestionStaffService.crearStaffQR(staffQRDto(), ID_ORGANIZADOR))
                .isInstanceOf(ResourceNotFoundException.class);

        verifyNoInteractions(staffQRRepository, emailService);
    }

    @Test
    void crearStaffQR_eventoDeOtroOrganizador_lanzaForbiddenActionException() {
        when(eventoRepository.findById(10L)).thenReturn(Optional.of(evento));

        assertThatThrownBy(() -> gestionStaffService.crearStaffQR(staffQRDto(), ID_OTRO_ORGANIZADOR))
                .isInstanceOf(ForbiddenActionException.class);

        verifyNoInteractions(staffQRRepository, emailService);
    }

    @Test
    void crearStaffQR_emailYaRegistrado_lanzaBusinessRuleException() {
        when(eventoRepository.findById(10L)).thenReturn(Optional.of(evento));
        when(usuarioRepository.existsByEmail("staffqr@test.com")).thenReturn(true);

        assertThatThrownBy(() -> gestionStaffService.crearStaffQR(staffQRDto(), ID_ORGANIZADOR))
                .isInstanceOf(BusinessRuleException.class);

        verify(staffQRRepository, never()).save(any());
    }

    @Test
    void crearStaffQR_exitoso_guardaAsignadoAlEventoYEnviaCredenciales() {
        when(eventoRepository.findById(10L)).thenReturn(Optional.of(evento));
        when(usuarioRepository.existsByEmail("staffqr@test.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hash-encriptado");
        when(staffQRRepository.save(any(StaffQR.class))).thenAnswer(inv -> {
            StaffQR s = inv.getArgument(0);
            s.setId(99L);
            return s;
        });

        StaffResponseDTO response = gestionStaffService.crearStaffQR(staffQRDto(), ID_ORGANIZADOR);

        assertThat(response.getRol()).isEqualTo(RolUsuario.Staff_QR);
        assertThat(response.getIdEvento()).isEqualTo(10L);
        verify(staffQRRepository).save(argThat(s ->
                s.getIdEvento().equals(10L)
                        && s.getCreadoPor().equals(ID_ORGANIZADOR)
                        && s.getPasswordHash().equals("hash-encriptado")));
        verify(emailService).enviarCredencialesStaff(eq("staffqr@test.com"), any(), eq("Staff QR"), any());
    }

    // ─────────────────────────────────────────────
    // crearStaffVendedor
    // ─────────────────────────────────────────────

    @Test
    void crearStaffVendedor_emailYaRegistrado_lanzaBusinessRuleException() {
        when(usuarioRepository.existsByEmail("vendedor@test.com")).thenReturn(true);

        assertThatThrownBy(() -> gestionStaffService.crearStaffVendedor(staffVendedorDto(), ID_ORGANIZADOR))
                .isInstanceOf(BusinessRuleException.class);

        verify(staffVendedorRepository, never()).save(any());
    }

    @Test
    void crearStaffVendedor_exitoso_quedaAsociadoAlOrganizador() {
        when(usuarioRepository.existsByEmail("vendedor@test.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hash-encriptado");
        when(staffVendedorRepository.save(any(StaffVendedor.class))).thenAnswer(inv -> inv.getArgument(0));

        StaffResponseDTO response = gestionStaffService.crearStaffVendedor(staffVendedorDto(), ID_ORGANIZADOR);

        assertThat(response.getRol()).isEqualTo(RolUsuario.Staff_Vendedor);
        assertThat(response.getIdEvento()).isNull();
        verify(staffVendedorRepository).save(argThat(s -> s.getIdOrganizador().equals(ID_ORGANIZADOR)));
    }

    // ─────────────────────────────────────────────
    // listarMiStaff
    // ─────────────────────────────────────────────

    @Test
    void listarMiStaff_combinaStaffQRYStaffVendedorDelOrganizador() {
        when(eventoRepository.findByIdOrganizador(ID_ORGANIZADOR)).thenReturn(List.of(evento));

        StaffQR staffQR = new StaffQR();
        staffQR.setId(1L);
        staffQR.setNombre("QR Uno");
        staffQR.setIdEvento(evento.getId());
        when(staffQRRepository.findByIdEventoIn(List.of(10L))).thenReturn(List.of(staffQR));

        StaffVendedor staffVendedor = new StaffVendedor();
        staffVendedor.setId(2L);
        staffVendedor.setNombre("Vendedor Uno");
        when(staffVendedorRepository.findByIdOrganizador(ID_ORGANIZADOR)).thenReturn(List.of(staffVendedor));

        List<StaffResponseDTO> resultado = gestionStaffService.listarMiStaff(ID_ORGANIZADOR);

        assertThat(resultado).hasSize(2);
        assertThat(resultado).extracting(StaffResponseDTO::getRol)
                .containsExactlyInAnyOrder(RolUsuario.Staff_QR, RolUsuario.Staff_Vendedor);
    }

    // ─────────────────────────────────────────────
    // desactivarStaff / reactivarStaff
    // ─────────────────────────────────────────────

    @Test
    void desactivarStaff_staffVendedorPropio_quedaInactivo() {
        StaffVendedor staff = new StaffVendedor();
        staff.setId(2L);
        staff.setEstado(EstadoUsuario.Activo);
        staff.setIdOrganizador(ID_ORGANIZADOR);
        when(staffVendedorRepository.findById(2L)).thenReturn(Optional.of(staff));
        when(staffVendedorRepository.save(any(StaffVendedor.class))).thenAnswer(inv -> inv.getArgument(0));

        StaffResponseDTO response = gestionStaffService.desactivarStaff(2L, ID_ORGANIZADOR);

        assertThat(response.getEstado()).isEqualTo(EstadoUsuario.Inactivo);
    }

    @Test
    void desactivarStaff_staffVendedorDeOtroOrganizador_lanzaForbiddenActionException() {
        StaffVendedor staff = new StaffVendedor();
        staff.setId(2L);
        staff.setEstado(EstadoUsuario.Activo);
        staff.setIdOrganizador(ID_OTRO_ORGANIZADOR);
        when(staffVendedorRepository.findById(2L)).thenReturn(Optional.of(staff));

        assertThatThrownBy(() -> gestionStaffService.desactivarStaff(2L, ID_ORGANIZADOR))
                .isInstanceOf(ForbiddenActionException.class);

        verify(staffVendedorRepository, never()).save(any());
    }

    @Test
    void desactivarStaff_staffQrDeEventoDeOtroOrganizador_lanzaForbiddenActionException() {
        StaffQR staff = new StaffQR();
        staff.setId(1L);
        staff.setEstado(EstadoUsuario.Activo);
        staff.setIdEvento(evento.getId());
        when(staffVendedorRepository.findById(1L)).thenReturn(Optional.empty());
        when(staffQRRepository.findById(1L)).thenReturn(Optional.of(staff));
        when(eventoRepository.findById(evento.getId())).thenReturn(Optional.of(evento));

        assertThatThrownBy(() -> gestionStaffService.desactivarStaff(1L, ID_OTRO_ORGANIZADOR))
                .isInstanceOf(ForbiddenActionException.class);

        verify(staffQRRepository, never()).save(any());
    }

    @Test
    void desactivarStaff_yaInactivo_lanzaBusinessRuleException() {
        StaffVendedor staff = new StaffVendedor();
        staff.setId(2L);
        staff.setEstado(EstadoUsuario.Inactivo);
        staff.setIdOrganizador(ID_ORGANIZADOR);
        when(staffVendedorRepository.findById(2L)).thenReturn(Optional.of(staff));

        assertThatThrownBy(() -> gestionStaffService.desactivarStaff(2L, ID_ORGANIZADOR))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void reactivarStaff_staffQrPropio_quedaActivo() {
        StaffQR staff = new StaffQR();
        staff.setId(1L);
        staff.setEstado(EstadoUsuario.Inactivo);
        staff.setIdEvento(evento.getId());
        when(staffVendedorRepository.findById(1L)).thenReturn(Optional.empty());
        when(staffQRRepository.findById(1L)).thenReturn(Optional.of(staff));
        when(eventoRepository.findById(evento.getId())).thenReturn(Optional.of(evento));
        when(staffQRRepository.save(any(StaffQR.class))).thenAnswer(inv -> inv.getArgument(0));

        StaffResponseDTO response = gestionStaffService.reactivarStaff(1L, ID_ORGANIZADOR);

        assertThat(response.getEstado()).isEqualTo(EstadoUsuario.Activo);
    }

    // ─────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────

    private CrearStaffQRRequestDTO staffQRDto() {
        CrearStaffQRRequestDTO dto = new CrearStaffQRRequestDTO();
        dto.setNombre("Staff QR Nuevo");
        dto.setEmail("staffqr@test.com");
        dto.setIdEvento(10L);
        return dto;
    }

    private CrearStaffVendedorRequestDTO staffVendedorDto() {
        CrearStaffVendedorRequestDTO dto = new CrearStaffVendedorRequestDTO();
        dto.setNombre("Staff Vendedor Nuevo");
        dto.setEmail("vendedor@test.com");
        return dto;
    }
}
