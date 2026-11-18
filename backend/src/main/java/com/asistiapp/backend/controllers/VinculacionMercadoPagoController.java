package com.asistiapp.backend.controllers;

import com.asistiapp.backend.exceptions.AsistiAppException;
import com.asistiapp.backend.models.dtos.mercadopago.EstadoCuentaMpResponseDTO;
import com.asistiapp.backend.models.dtos.mercadopago.IniciarVinculacionResponseDTO;
import com.asistiapp.backend.security.SecurityUtils;
import com.asistiapp.backend.services.VinculacionMercadoPagoService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

/**
 * Vinculación de la cuenta de Mercado Pago del Organizador (8.4).
 *
 *   POST   /organizador/mercadopago/vincular   → devuelve la URL de Mercado Pago (el frontend redirige ahí)
 *   GET    /mercadopago/oauth/callback         → a donde vuelve Mercado Pago; público (lo abre el navegador sin JWT)
 *   GET    /organizador/mercadopago/estado     → ¿tiene cuenta vinculada?
 *   DELETE /organizador/mercadopago            → desvincular
 *
 * El callback no autentica por JWT: el `state` de un solo uso (que solo conoce quien lo inició) identifica al Organizador.
 */
@Slf4j
@RestController
public class VinculacionMercadoPagoController {

    private final VinculacionMercadoPagoService servicio;
    private final SecurityUtils securityUtils;
    private final String frontendBaseUrl;

    public VinculacionMercadoPagoController(VinculacionMercadoPagoService servicio, SecurityUtils securityUtils,
                                            @Value("${app.frontend-base-url}") String frontendBaseUrl) {
        this.servicio = servicio;
        this.securityUtils = securityUtils;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @PostMapping("/organizador/mercadopago/vincular")
    @PreAuthorize("hasRole('Organizador')")
    public ResponseEntity<IniciarVinculacionResponseDTO> vincular() {
        Long id = securityUtils.getOrganizadorAutenticado().getId();
        return ResponseEntity.ok(new IniciarVinculacionResponseDTO(servicio.iniciar(id)));
    }

    @GetMapping("/organizador/mercadopago/estado")
    @PreAuthorize("hasRole('Organizador')")
    public ResponseEntity<EstadoCuentaMpResponseDTO> estado() {
        return ResponseEntity.ok(servicio.estado(securityUtils.getOrganizadorAutenticado().getId()));
    }

    @DeleteMapping("/organizador/mercadopago")
    @PreAuthorize("hasRole('Organizador')")
    public ResponseEntity<Void> desvincular() {
        servicio.desvincular(securityUtils.getOrganizadorAutenticado().getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/mercadopago/oauth/callback")
    public ResponseEntity<Void> callback(@RequestParam(required = false) String code,
                                         @RequestParam(required = false) String state,
                                         @RequestParam(required = false) String error) {
        if (error != null) {
            return volverAlPerfil("cancelado");
        }
        if (code == null || code.isBlank() || state == null || state.isBlank()) {
            return volverAlPerfil("error");
        }
        try {
            servicio.completar(state, code);
            return volverAlPerfil("ok");
        } catch (AsistiAppException e) {
            log.warn("No se pudo completar la vinculación de Mercado Pago: {}", e.getMessage());
            return volverAlPerfil("error");
        }
    }

    private ResponseEntity<Void> volverAlPerfil(String resultado) {
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, URI.create(frontendBaseUrl + "/organizador/perfil?mp=" + resultado).toString())
                .build();
    }
}
