package com.asistiapp.backend.services;

import com.asistiapp.backend.models.dtos.admin.auditoria.LogAuditoriaResponseDTO;
import com.asistiapp.backend.models.entities.LogAuditoria;
import com.asistiapp.backend.repositories.LogAuditoriaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Registro y consulta del historial de auditoría administrativa (LOG_AUDITORIA).
 * Los registros son invocados por AuditoriaAspect tras cada acción exitosa
 * anotada con @Auditable — nunca se editan ni se borran.
 */
@Service
@RequiredArgsConstructor
public class AuditoriaService {

    private final LogAuditoriaRepository logAuditoriaRepository;

    @Transactional
    public void registrar(Long idAdmin, String accion, String entidadAfectada,
                           Long idEntidadAfectada, String detalle) {
        LogAuditoria log = new LogAuditoria();
        log.setIdAdmin(idAdmin);
        log.setAccion(accion);
        log.setEntidadAfectada(entidadAfectada);
        log.setIdEntidadAfectada(idEntidadAfectada);
        log.setDetalle(detalle);
        logAuditoriaRepository.save(log);
    }

    @Transactional(readOnly = true)
    public List<LogAuditoriaResponseDTO> listarTodos() {
        return logAuditoriaRepository.findAll(Sort.by(Sort.Direction.DESC, "fechaHora"))
                .stream()
                .map(this::toResponseDTO)
                .toList();
    }

    private LogAuditoriaResponseDTO toResponseDTO(LogAuditoria log) {
        return LogAuditoriaResponseDTO.builder()
                .id(log.getId())
                .idAdmin(log.getIdAdmin())
                .accion(log.getAccion())
                .entidadAfectada(log.getEntidadAfectada())
                .idEntidadAfectada(log.getIdEntidadAfectada())
                .detalle(log.getDetalle())
                .fechaHora(log.getFechaHora())
                .build();
    }
}
