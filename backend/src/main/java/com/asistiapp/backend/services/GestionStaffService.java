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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

/**
 * Alta de Staff por parte del Organizador (CU-005, CU-006).
 * El Organizador da de alta a su propio equipo — Staff QR asignado a uno
 * de sus eventos, o Staff Vendedor asociado directamente a él.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GestionStaffService {

    private final UsuarioRepository usuarioRepository;
    private final EventoRepository eventoRepository;
    private final StaffQRRepository staffQRRepository;
    private final StaffVendedorRepository staffVendedorRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Transactional
    public StaffResponseDTO crearStaffQR(CrearStaffQRRequestDTO dto, Long idOrganizador) {
        Evento evento = eventoRepository.findById(dto.getIdEvento())
                .orElseThrow(() -> new ResourceNotFoundException("Evento no encontrado con id: " + dto.getIdEvento()));

        if (!evento.getIdOrganizador().equals(idOrganizador)) {
            throw new ForbiddenActionException("No podés asignar Staff a un evento que no te pertenece");
        }

        verificarEmailDisponible(dto.getEmail());

        String passwordTemporal = generarPasswordTemporal();

        StaffQR staff = new StaffQR();
        staff.setNombre(dto.getNombre());
        staff.setEmail(dto.getEmail());
        staff.setPasswordHash(passwordEncoder.encode(passwordTemporal));
        staff.setRol(RolUsuario.Staff_QR);
        staff.setEstado(EstadoUsuario.Activo);
        staff.setCreadoPor(idOrganizador);
        staff.setIdEvento(dto.getIdEvento());

        StaffQR saved = staffQRRepository.save(staff);
        log.info("Staff QR creado: id={}, evento={}, organizador={}", saved.getId(), dto.getIdEvento(), idOrganizador);

        emailService.enviarCredencialesStaff(saved.getEmail(), saved.getNombre(), "Staff QR", passwordTemporal);

        return toResponseDTO(saved.getId(), saved.getNombre(), saved.getEmail(), RolUsuario.Staff_QR,
                saved.getEstado(), saved.getIdEvento());
    }

    @Transactional
    public StaffResponseDTO crearStaffVendedor(CrearStaffVendedorRequestDTO dto, Long idOrganizador) {
        verificarEmailDisponible(dto.getEmail());

        String passwordTemporal = generarPasswordTemporal();

        StaffVendedor staff = new StaffVendedor();
        staff.setNombre(dto.getNombre());
        staff.setEmail(dto.getEmail());
        staff.setPasswordHash(passwordEncoder.encode(passwordTemporal));
        staff.setRol(RolUsuario.Staff_Vendedor);
        staff.setEstado(EstadoUsuario.Activo);
        staff.setCreadoPor(idOrganizador);
        staff.setIdOrganizador(idOrganizador);

        StaffVendedor saved = staffVendedorRepository.save(staff);
        log.info("Staff Vendedor creado: id={}, organizador={}", saved.getId(), idOrganizador);

        emailService.enviarCredencialesStaff(saved.getEmail(), saved.getNombre(), "Staff Vendedor", passwordTemporal);

        return toResponseDTO(saved.getId(), saved.getNombre(), saved.getEmail(), RolUsuario.Staff_Vendedor,
                saved.getEstado(), null);
    }

    @Transactional(readOnly = true)
    public List<StaffResponseDTO> listarMiStaff(Long idOrganizador) {
        List<Long> idEventosPropios = eventoRepository.findByIdOrganizador(idOrganizador).stream()
                .map(Evento::getId)
                .toList();

        List<StaffResponseDTO> staffQR = staffQRRepository.findByIdEventoIn(idEventosPropios).stream()
                .map(s -> toResponseDTO(s.getId(), s.getNombre(), s.getEmail(), RolUsuario.Staff_QR, s.getEstado(), s.getIdEvento()))
                .toList();

        List<StaffResponseDTO> staffVendedores = staffVendedorRepository.findByIdOrganizador(idOrganizador).stream()
                .map(s -> toResponseDTO(s.getId(), s.getNombre(), s.getEmail(), RolUsuario.Staff_Vendedor, s.getEstado(), null))
                .toList();

        return Stream.concat(staffQR.stream(), staffVendedores.stream()).toList();
    }

    @Transactional
    public StaffResponseDTO desactivarStaff(Long idStaff, Long idOrganizador) {
        return cambiarEstadoStaff(idStaff, idOrganizador, EstadoUsuario.Inactivo);
    }

    @Transactional
    public StaffResponseDTO reactivarStaff(Long idStaff, Long idOrganizador) {
        return cambiarEstadoStaff(idStaff, idOrganizador, EstadoUsuario.Activo);
    }

    /** Verifica ownership (IDOR) antes de tocar el estado — directo en StaffVendedor, vía su evento en StaffQR. */
    private StaffResponseDTO cambiarEstadoStaff(Long idStaff, Long idOrganizador, EstadoUsuario nuevoEstado) {
        var staffVendedor = staffVendedorRepository.findById(idStaff);
        if (staffVendedor.isPresent()) {
            StaffVendedor sv = staffVendedor.get();
            if (!sv.getIdOrganizador().equals(idOrganizador)) {
                throw new ForbiddenActionException("No podés modificar un miembro de staff que no te pertenece");
            }
            if (sv.getEstado() == nuevoEstado) {
                throw new BusinessRuleException("El staff ya está en ese estado");
            }
            sv.setEstado(nuevoEstado);
            StaffVendedor saved = staffVendedorRepository.save(sv);
            log.info("Staff Vendedor id={} pasa a estado={}", idStaff, nuevoEstado);
            return toResponseDTO(saved.getId(), saved.getNombre(), saved.getEmail(), RolUsuario.Staff_Vendedor, saved.getEstado(), null);
        }

        StaffQR sq = staffQRRepository.findById(idStaff)
                .orElseThrow(() -> new ResourceNotFoundException("Staff no encontrado con id: " + idStaff));
        Evento evento = eventoRepository.findById(sq.getIdEvento())
                .orElseThrow(() -> new ResourceNotFoundException("Evento no encontrado con id: " + sq.getIdEvento()));
        if (!evento.getIdOrganizador().equals(idOrganizador)) {
            throw new ForbiddenActionException("No podés modificar un miembro de staff que no te pertenece");
        }
        if (sq.getEstado() == nuevoEstado) {
            throw new BusinessRuleException("El staff ya está en ese estado");
        }
        sq.setEstado(nuevoEstado);
        StaffQR saved = staffQRRepository.save(sq);
        log.info("Staff QR id={} pasa a estado={}", idStaff, nuevoEstado);
        return toResponseDTO(saved.getId(), saved.getNombre(), saved.getEmail(), RolUsuario.Staff_QR, saved.getEstado(), saved.getIdEvento());
    }

    private void verificarEmailDisponible(String email) {
        if (usuarioRepository.existsByEmail(email)) {
            throw new BusinessRuleException("Ya existe una cuenta registrada con el email: " + email);
        }
    }

    /** Contraseña temporal legible, enviada por email — el Staff puede cambiarla luego. */
    private String generarPasswordTemporal() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }

    private StaffResponseDTO toResponseDTO(Long id, String nombre, String email, RolUsuario rol,
                                            EstadoUsuario estado, Long idEvento) {
        return StaffResponseDTO.builder()
                .id(id)
                .nombre(nombre)
                .email(email)
                .rol(rol)
                .estado(estado)
                .idEvento(idEvento)
                .build();
    }
}
