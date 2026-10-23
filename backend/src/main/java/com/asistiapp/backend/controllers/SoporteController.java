package com.asistiapp.backend.controllers;

import com.asistiapp.backend.models.dtos.publico.SoporteResponseDTO;
import com.asistiapp.backend.services.ConfiguracionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Contacto de soporte — sin autenticación, igual que el catálogo público (permitAll para
 * GET /public/**), porque el Comprador también puede necesitarlo sin tener cuenta.
 */
@RestController
@RequestMapping("/public/soporte")
@RequiredArgsConstructor
public class SoporteController {

    private static final String CLAVE_EMAIL = "email_soporte";
    private static final String CLAVE_WHATSAPP = "whatsapp_soporte";
    private static final String DEFAULT_EMAIL = "soporte@asistiapp.com";

    private final ConfiguracionService configuracionService;

    @GetMapping
    public ResponseEntity<SoporteResponseDTO> obtenerContacto() {
        return ResponseEntity.ok(SoporteResponseDTO.builder()
                .emailSoporte(configuracionService.obtenerTexto(CLAVE_EMAIL, DEFAULT_EMAIL))
                .whatsappSoporte(configuracionService.obtenerTexto(CLAVE_WHATSAPP, null))
                .build());
    }
}
