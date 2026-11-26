package com.asistiapp.backend.controllers.admin;

import com.asistiapp.backend.models.dtos.admin.auditoria.PaginaAuditoriaResponseDTO;
import com.asistiapp.backend.services.AuditoriaService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.asistiapp.backend.models.enums.RolUsuario;

import java.time.LocalDate;
import java.util.List;

/**
 * Consulta del historial de auditoría (acciones del Admin, del Organizador y de su Staff),
 * paginada y con filtros. Solo la ve el Administrador.
 */
@RestController
@RequestMapping("/admin/auditoria")
@RequiredArgsConstructor
@PreAuthorize("hasRole('Administrador')")
public class AdminAuditoriaController {

    private final AuditoriaService auditoriaService;

    /**
     * @param rol       rol del emisor; se puede repetir (?rol=Staff_QR&rol=Staff_Vendedor)
     * @param idEmisor  un emisor puntual
     * @param accion    código exacto de la acción (ej. SUSPENDER_USUARIO)
     * @param entidad   tipo de entidad afectada (ej. Usuario, Evento)
     * @param idEntidad un registro puntual (junto con {@code entidad})
     * @param desde     fecha inicial inclusive (yyyy-MM-dd)
     * @param hasta     fecha final inclusive (yyyy-MM-dd)
     * @param q         texto libre: nombre del emisor o de la entidad, detalle, código; un número busca por id
     * @param pagina    número de página, desde 0
     * @param tamano    filas por página (20 por defecto, máximo 100)
     */
    @GetMapping
    public ResponseEntity<PaginaAuditoriaResponseDTO> listar(
            @RequestParam(required = false) List<RolUsuario> rol,
            @RequestParam(required = false) Long idEmisor,
            @RequestParam(required = false) String accion,
            @RequestParam(required = false) String entidad,
            @RequestParam(required = false) Long idEntidad,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "" + AuditoriaService.TAMANO_POR_DEFECTO) int tamano) {
        AuditoriaService.Filtros filtros = new AuditoriaService.Filtros(
                rol, idEmisor, accion, entidad, idEntidad, desde, hasta, q);
        return ResponseEntity.ok(auditoriaService.listar(filtros, pagina, tamano));
    }
}
