package com.asistiapp.backend.controllers;

import com.asistiapp.backend.models.dtos.evento.ImagenSubidaResponseDTO;
import com.asistiapp.backend.models.dtos.perfil.CambiarPasswordRequestDTO;
import com.asistiapp.backend.models.dtos.perfil.PerfilRequestDTO;
import com.asistiapp.backend.models.dtos.perfil.PerfilResponseDTO;
import com.asistiapp.backend.security.SecurityUtils;
import com.asistiapp.backend.services.ImagenService;
import com.asistiapp.backend.services.PerfilService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * Perfil del Organizador autenticado. El ID sale del JWT, nunca de la URL.
 *
 *   GET    /organizador/perfil            → ver mi perfil
 *   PUT    /organizador/perfil            → nombre y foto (URL ya subida)
 *   POST   /organizador/perfil/foto       → subir la foto a Cloudinary (devuelve la URL)
 *   PUT    /organizador/perfil/password   → cambiar contraseña (exige la actual)
 */
@RestController
@RequestMapping("/organizador/perfil")
@RequiredArgsConstructor
@PreAuthorize("hasRole('Organizador')")
public class PerfilController {

    private final PerfilService perfilService;
    private final ImagenService imagenService;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ResponseEntity<PerfilResponseDTO> obtenerPerfil() {
        return ResponseEntity.ok(perfilService.obtenerPerfil(securityUtils.getIdUsuarioAutenticado()));
    }

    @PutMapping
    public ResponseEntity<PerfilResponseDTO> actualizarPerfil(@Valid @RequestBody PerfilRequestDTO dto) {
        return ResponseEntity.ok(perfilService.actualizarPerfil(securityUtils.getIdUsuarioAutenticado(), dto));
    }

    @PostMapping(value = "/foto", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImagenSubidaResponseDTO> subirFoto(@RequestParam("archivo") MultipartFile archivo) {
        String url = imagenService.subirFotoPerfil(archivo);
        return ResponseEntity.status(HttpStatus.CREATED).body(new ImagenSubidaResponseDTO(url));
    }

    @PutMapping("/password")
    public ResponseEntity<Void> cambiarPassword(@Valid @RequestBody CambiarPasswordRequestDTO dto) {
        perfilService.cambiarPassword(securityUtils.getIdUsuarioAutenticado(), dto);
        return ResponseEntity.noContent().build();
    }
}
