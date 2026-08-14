package com.asistiapp.backend.security;

import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.models.entities.StaffQR;
import com.asistiapp.backend.models.entities.StaffVendedor;
import com.asistiapp.backend.models.entities.Usuario;
import com.asistiapp.backend.repositories.OrganizadorRepository;
import com.asistiapp.backend.repositories.StaffQRRepository;
import com.asistiapp.backend.repositories.StaffVendedorRepository;
import com.asistiapp.backend.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

/**
 * Utilidad para extraer el usuario autenticado del SecurityContext.
 * Centraliza la lógica de "¿quién está logueado?" para no repetirla
 * en cada controlador/servicio.
 */
@Component
@RequiredArgsConstructor
public class SecurityUtils {

    private final OrganizadorRepository organizadorRepository;
    private final StaffVendedorRepository staffVendedorRepository;
    private final StaffQRRepository staffQRRepository;
    private final UsuarioRepository usuarioRepository;

    /** Retorna el email del usuario actualmente autenticado. */
    public String getEmailAutenticado() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalStateException("No hay usuario autenticado en el contexto de seguridad");
        }
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        return userDetails.getUsername();
    }

    /** Retorna el Organizador actualmente autenticado. */
    public Organizador getOrganizadorAutenticado() {
        String email = getEmailAutenticado();
        return organizadorRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No se encontró el organizador con email: " + email));
    }

    /** Retorna el StaffVendedor actualmente autenticado. */
    public StaffVendedor getStaffVendedorAutenticado() {
        String email = getEmailAutenticado();
        return staffVendedorRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No se encontró el staff vendedor con email: " + email));
    }

    /** Retorna el StaffQR actualmente autenticado. */
    public StaffQR getStaffQRAutenticado() {
        String email = getEmailAutenticado();
        return staffQRRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No se encontró el staff QR con email: " + email));
    }

    /** Retorna el Usuario (base) actualmente autenticado, sin importar su rol. */
    public Usuario getUsuarioAutenticado() {
        String email = getEmailAutenticado();
        return usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No se encontró el usuario con email: " + email));
    }

    /** Retorna el ID del usuario actualmente autenticado. */
    public Long getIdUsuarioAutenticado() {
        return getUsuarioAutenticado().getId();
    }
}
