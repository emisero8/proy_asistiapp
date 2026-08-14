package com.asistiapp.backend.services.admin;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.dtos.admin.UsuarioResponseDTO;
import com.asistiapp.backend.models.entities.Usuario;
import com.asistiapp.backend.models.enums.EstadoUsuario;
import com.asistiapp.backend.models.enums.RolUsuario;
import com.asistiapp.backend.repositories.EventoRepository;
import com.asistiapp.backend.repositories.StaffVendedorRepository;
import com.asistiapp.backend.repositories.UsuarioRepository;
import com.asistiapp.backend.security.SecurityUtils;
import com.asistiapp.backend.security.audit.Auditable;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Gestión administrativa de usuarios (Fase 7 + Fase 12): listado con filtros,
 * suspensión/activación, reasignación de rol y eliminación de cuentas.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminUsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final EventoRepository eventoRepository;
    private final StaffVendedorRepository staffVendedorRepository;
    private final SecurityUtils securityUtils;

    @Transactional(readOnly = true)
    public List<UsuarioResponseDTO> listarUsuarios(RolUsuario rolFiltro, EstadoUsuario estadoFiltro) {
        return usuarioRepository.findAll().stream()
                .filter(u -> rolFiltro == null || u.getRol() == rolFiltro)
                .filter(u -> estadoFiltro == null || u.getEstado() == estadoFiltro)
                .map(this::toResponseDTO)
                .toList();
    }

    @Transactional
    @Auditable(accion = "SUSPENDER_USUARIO", entidad = "Usuario")
    public UsuarioResponseDTO suspenderUsuario(Long idUsuario) {
        Usuario usuario = getUsuarioOrThrow(idUsuario);
        verificarNoEsUnoMismo(idUsuario, "suspender");

        if (usuario.getEstado() == EstadoUsuario.Suspendido) {
            throw new BusinessRuleException("El usuario ya está suspendido");
        }

        usuario.setEstado(EstadoUsuario.Suspendido);
        Usuario saved = usuarioRepository.save(usuario);
        log.info("Usuario suspendido: id={}", idUsuario);
        return toResponseDTO(saved);
    }

    @Transactional
    @Auditable(accion = "ACTIVAR_USUARIO", entidad = "Usuario")
    public UsuarioResponseDTO activarUsuario(Long idUsuario) {
        Usuario usuario = getUsuarioOrThrow(idUsuario);

        if (usuario.getEstado() == EstadoUsuario.Activo) {
            throw new BusinessRuleException("El usuario ya está activo");
        }

        usuario.setEstado(EstadoUsuario.Activo);
        Usuario saved = usuarioRepository.save(usuario);
        log.info("Usuario activado: id={}", idUsuario);
        return toResponseDTO(saved);
    }

    /** CU-022: reasigna el rol de un usuario a cualquier valor del enum (no solo "promover a Admin"). */
    @Transactional
    @Auditable(accion = "CAMBIAR_ROL", entidad = "Usuario")
    public UsuarioResponseDTO reasignarRol(Long idUsuario, RolUsuario nuevoRol) {
        Usuario usuario = getUsuarioOrThrow(idUsuario);
        verificarNoEsUnoMismo(idUsuario, "reasignar el rol de");

        if (usuario.getRol() == nuevoRol) {
            throw new BusinessRuleException("El usuario ya tiene el rol " + nuevoRol);
        }

        usuario.setRol(nuevoRol);
        Usuario saved = usuarioRepository.save(usuario);
        log.info("Rol reasignado: id={}, nuevoRol={}", idUsuario, nuevoRol);
        return toResponseDTO(saved);
    }

    /**
     * CU-021: elimina un usuario del sistema.
     * Bloquea la eliminación de un Organizador con eventos o Staff Vendedor
     * a cargo — esos recursos quedarían con una referencia huérfana. En esos
     * casos, sugiere suspender la cuenta en lugar de eliminarla.
     */
    @Transactional
    @Auditable(accion = "ELIMINAR_USUARIO", entidad = "Usuario")
    public void eliminarUsuario(Long idUsuario) {
        Usuario usuario = getUsuarioOrThrow(idUsuario);
        verificarNoEsUnoMismo(idUsuario, "eliminar");

        if (usuario.getRol() == RolUsuario.Organizador) {
            if (!eventoRepository.findByIdOrganizador(idUsuario).isEmpty()) {
                throw new BusinessRuleException(
                        "No se puede eliminar un Organizador con eventos creados. Suspendé la cuenta en su lugar.");
            }
            if (!staffVendedorRepository.findByIdOrganizador(idUsuario).isEmpty()) {
                throw new BusinessRuleException(
                        "No se puede eliminar un Organizador con Staff Vendedor a cargo. Suspendé la cuenta en su lugar.");
            }
        }

        usuarioRepository.delete(usuario);
        log.info("Usuario eliminado: id={}, rol={}", idUsuario, usuario.getRol());
    }

    private Usuario getUsuarioOrThrow(Long idUsuario) {
        return usuarioRepository.findById(idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con id: " + idUsuario));
    }

    private void verificarNoEsUnoMismo(Long idUsuario, String accion) {
        if (idUsuario.equals(securityUtils.getIdUsuarioAutenticado())) {
            throw new BusinessRuleException("No podés " + accion + " tu propia cuenta");
        }
    }

    private UsuarioResponseDTO toResponseDTO(Usuario usuario) {
        return UsuarioResponseDTO.builder()
                .id(usuario.getId())
                .nombre(usuario.getNombre())
                .email(usuario.getEmail())
                .rol(usuario.getRol())
                .estado(usuario.getEstado())
                .fechaCreacion(usuario.getFechaCreacion())
                .build();
    }
}
