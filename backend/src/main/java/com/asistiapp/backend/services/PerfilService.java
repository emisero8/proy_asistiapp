package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.dtos.perfil.CambiarPasswordRequestDTO;
import com.asistiapp.backend.models.dtos.perfil.PerfilRequestDTO;
import com.asistiapp.backend.models.dtos.perfil.PerfilResponseDTO;
import com.asistiapp.backend.models.entities.Usuario;
import com.asistiapp.backend.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Perfil del Organizador: nombre, foto de perfil y cambio de contraseña.
 *
 * La foto solo puede apuntar a una imagen de nuestro propio Cloudinary, así nadie
 * puede guardar como foto de perfil un link externo arbitrario.
 */
@Service
@RequiredArgsConstructor
public class PerfilService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.cloudinary.cloud-name}")
    private String cloudName;

    @Transactional(readOnly = true)
    public PerfilResponseDTO obtenerPerfil(Long idUsuario) {
        return toResponseDTO(getUsuarioOrThrow(idUsuario));
    }

    @Transactional
    public PerfilResponseDTO actualizarPerfil(Long idUsuario, PerfilRequestDTO dto) {
        Usuario usuario = getUsuarioOrThrow(idUsuario);
        String foto = dto.getFotoPerfilUrl() == null || dto.getFotoPerfilUrl().isBlank()
                ? null
                : dto.getFotoPerfilUrl().trim();
        if (foto != null) {
            validarFotoDeNuestroCloudinary(foto);
        }
        usuario.setNombre(dto.getNombre().trim());
        usuario.setFotoPerfilUrl(foto);
        return toResponseDTO(usuarioRepository.save(usuario));
    }

    @Transactional
    public void cambiarPassword(Long idUsuario, CambiarPasswordRequestDTO dto) {
        Usuario usuario = getUsuarioOrThrow(idUsuario);
        if (!passwordEncoder.matches(dto.getPasswordActual(), usuario.getPasswordHash())) {
            throw new BusinessRuleException("La contraseña actual no es correcta");
        }
        if (passwordEncoder.matches(dto.getPasswordNueva(), usuario.getPasswordHash())) {
            throw new BusinessRuleException("La nueva contraseña debe ser distinta a la actual");
        }
        usuario.setPasswordHash(passwordEncoder.encode(dto.getPasswordNueva()));
        usuarioRepository.save(usuario);
    }

    private void validarFotoDeNuestroCloudinary(String url) {
        String prefijo = "https://res.cloudinary.com/" + cloudName + "/image/upload/";
        if (!url.startsWith(prefijo)) {
            throw new BusinessRuleException("La foto de perfil debe subirse desde la aplicación");
        }
    }

    private Usuario getUsuarioOrThrow(Long id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
    }

    private PerfilResponseDTO toResponseDTO(Usuario usuario) {
        return PerfilResponseDTO.builder()
                .id(usuario.getId())
                .nombre(usuario.getNombre())
                .email(usuario.getEmail())
                .fotoPerfilUrl(usuario.getFotoPerfilUrl())
                .build();
    }
}
