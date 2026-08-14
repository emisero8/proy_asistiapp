package com.asistiapp.backend.controllers;

import com.asistiapp.backend.models.dtos.validacion.ValidacionQRRequestDTO;
import com.asistiapp.backend.models.dtos.validacion.ValidacionQRResponseDTO;
import com.asistiapp.backend.models.entities.StaffQR;
import com.asistiapp.backend.security.SecurityUtils;
import com.asistiapp.backend.services.StaffQRService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Controlador REST para el sistema de control de acceso por QR (CU-018).
 * Todos los endpoints son exclusivos para el rol Staff_QR.
 *
 * Endpoints:
 *   POST /tickets/validate          → Validar y marcar QR como Usado (operación principal)
 *   GET  /tickets/validate/{codigo} → Consultar estado de un QR sin modificarlo
 */
@RestController
@RequestMapping("/tickets")
@RequiredArgsConstructor
@PreAuthorize("hasRole('Staff_QR')")
public class StaffQRController {

    private final StaffQRService staffQRService;
    private final SecurityUtils securityUtils;

    /**
     * Valida un código QR y lo marca como Usado si es válido (CU-018).
     * Esta es la operación principal que el Staff ejecuta al escanear en puerta.
     *
     * Siempre retorna 200 OK con el resultado en el body (valido: true/false).
     * No usa 4xx para QRs inválidos porque la operación de "consultar"
     * en sí misma fue exitosa — el resultado de la validación está en el body.
     */
    @PostMapping("/validate")
    public ResponseEntity<ValidacionQRResponseDTO> validarQR(
            @Valid @RequestBody ValidacionQRRequestDTO dto) {
        StaffQR staffQR = securityUtils.getStaffQRAutenticado();
        ValidacionQRResponseDTO resultado = staffQRService.validarQR(dto, staffQR);
        return ResponseEntity.ok(resultado);
    }

    /**
     * Consulta el estado actual de una entrada por QR sin marcarla como Usada.
     * Útil para una vista previa antes de la validación definitiva.
     *
     * @param codigo código QR a consultar (en la URL)
     */
    @GetMapping("/validate/{codigo}")
    public ResponseEntity<ValidacionQRResponseDTO> consultarEstadoQR(
            @PathVariable String codigo) {
        StaffQR staffQR = securityUtils.getStaffQRAutenticado();
        ValidacionQRResponseDTO resultado = staffQRService.consultarEstadoQR(codigo, staffQR);
        return ResponseEntity.ok(resultado);
    }
}
