package com.asistiapp.backend.controllers;

import com.asistiapp.backend.models.dtos.staff.CrearStaffQRRequestDTO;
import com.asistiapp.backend.models.dtos.staff.CrearStaffVendedorRequestDTO;
import com.asistiapp.backend.models.dtos.staff.StaffResponseDTO;
import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.security.SecurityUtils;
import com.asistiapp.backend.services.GestionStaffService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Alta de Staff por parte del Organizador (CU-005, CU-006).
 * Todos los endpoints requieren rol Organizador — el ID se extrae del JWT.
 */
@RestController
@RequestMapping("/organizador/staff")
@RequiredArgsConstructor
@PreAuthorize("hasRole('Organizador')")
public class GestionStaffController {

    private final GestionStaffService gestionStaffService;
    private final SecurityUtils securityUtils;

    @PostMapping("/qr")
    public ResponseEntity<StaffResponseDTO> crearStaffQR(@Valid @RequestBody CrearStaffQRRequestDTO dto) {
        Organizador org = securityUtils.getOrganizadorAutenticado();
        StaffResponseDTO response = gestionStaffService.crearStaffQR(dto, org.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/vendedor")
    public ResponseEntity<StaffResponseDTO> crearStaffVendedor(@Valid @RequestBody CrearStaffVendedorRequestDTO dto) {
        Organizador org = securityUtils.getOrganizadorAutenticado();
        StaffResponseDTO response = gestionStaffService.crearStaffVendedor(dto, org.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<StaffResponseDTO>> listarMiStaff() {
        Organizador org = securityUtils.getOrganizadorAutenticado();
        return ResponseEntity.ok(gestionStaffService.listarMiStaff(org.getId()));
    }

    @PatchMapping("/{id}/desactivar")
    public ResponseEntity<StaffResponseDTO> desactivarStaff(@PathVariable Long id) {
        Organizador org = securityUtils.getOrganizadorAutenticado();
        return ResponseEntity.ok(gestionStaffService.desactivarStaff(id, org.getId()));
    }

    @PatchMapping("/{id}/reactivar")
    public ResponseEntity<StaffResponseDTO> reactivarStaff(@PathVariable Long id) {
        Organizador org = securityUtils.getOrganizadorAutenticado();
        return ResponseEntity.ok(gestionStaffService.reactivarStaff(id, org.getId()));
    }
}
