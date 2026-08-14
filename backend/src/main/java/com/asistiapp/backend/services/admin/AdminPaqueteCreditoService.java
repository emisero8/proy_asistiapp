package com.asistiapp.backend.services.admin;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.dtos.admin.paquete.PaqueteCreditoRequestDTO;
import com.asistiapp.backend.models.dtos.admin.paquete.PaqueteCreditoResponseDTO;
import com.asistiapp.backend.models.entities.PaqueteCredito;
import com.asistiapp.backend.models.enums.EstadoPaquete;
import com.asistiapp.backend.repositories.PaqueteCreditoRepository;
import com.asistiapp.backend.security.audit.Auditable;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Gestión administrativa de paquetes de crédito (Fase 7): CRUD completo
 * para el catálogo que los Organizadores compran para publicar eventos.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminPaqueteCreditoService {

    private final PaqueteCreditoRepository paqueteCreditoRepository;

    /** A diferencia del listado público, incluye también los paquetes Deshabilitados. */
    @Transactional(readOnly = true)
    public List<PaqueteCreditoResponseDTO> listarTodos() {
        return paqueteCreditoRepository.findAll().stream()
                .map(this::toResponseDTO)
                .toList();
    }

    @Transactional
    @Auditable(accion = "CREAR_PAQUETE", entidad = "PaqueteCredito")
    public PaqueteCreditoResponseDTO crear(PaqueteCreditoRequestDTO dto) {
        PaqueteCredito paquete = new PaqueteCredito();
        mapDtoToPaquete(dto, paquete);

        PaqueteCredito saved = paqueteCreditoRepository.save(paquete);
        log.info("Paquete de crédito creado: id={}, nombre={}", saved.getId(), saved.getNombre());
        return toResponseDTO(saved);
    }

    @Transactional
    @Auditable(accion = "ACTUALIZAR_PAQUETE", entidad = "PaqueteCredito")
    public PaqueteCreditoResponseDTO actualizar(Long idPaquete, PaqueteCreditoRequestDTO dto) {
        PaqueteCredito paquete = getPaqueteOrThrow(idPaquete);
        mapDtoToPaquete(dto, paquete);

        PaqueteCredito saved = paqueteCreditoRepository.save(paquete);
        log.info("Paquete de crédito actualizado: id={}", idPaquete);
        return toResponseDTO(saved);
    }

    @Transactional
    @Auditable(accion = "DESHABILITAR_PAQUETE", entidad = "PaqueteCredito")
    public PaqueteCreditoResponseDTO deshabilitar(Long idPaquete) {
        PaqueteCredito paquete = getPaqueteOrThrow(idPaquete);

        if (paquete.getEstado() == EstadoPaquete.Deshabilitado) {
            throw new BusinessRuleException("El paquete ya está deshabilitado");
        }

        paquete.setEstado(EstadoPaquete.Deshabilitado);
        PaqueteCredito saved = paqueteCreditoRepository.save(paquete);
        log.info("Paquete de crédito deshabilitado: id={}", idPaquete);
        return toResponseDTO(saved);
    }

    @Transactional
    @Auditable(accion = "HABILITAR_PAQUETE", entidad = "PaqueteCredito")
    public PaqueteCreditoResponseDTO habilitar(Long idPaquete) {
        PaqueteCredito paquete = getPaqueteOrThrow(idPaquete);

        if (paquete.getEstado() == EstadoPaquete.Activo) {
            throw new BusinessRuleException("El paquete ya está activo");
        }

        paquete.setEstado(EstadoPaquete.Activo);
        PaqueteCredito saved = paqueteCreditoRepository.save(paquete);
        log.info("Paquete de crédito habilitado: id={}", idPaquete);
        return toResponseDTO(saved);
    }

    private PaqueteCredito getPaqueteOrThrow(Long idPaquete) {
        return paqueteCreditoRepository.findById(idPaquete)
                .orElseThrow(() -> new ResourceNotFoundException("Paquete de crédito no encontrado con id: " + idPaquete));
    }

    private void mapDtoToPaquete(PaqueteCreditoRequestDTO dto, PaqueteCredito paquete) {
        paquete.setNombre(dto.getNombre());
        paquete.setCantidadCreditos(dto.getCantidadCreditos());
        paquete.setPrecio(dto.getPrecio());
    }

    private PaqueteCreditoResponseDTO toResponseDTO(PaqueteCredito paquete) {
        return PaqueteCreditoResponseDTO.builder()
                .id(paquete.getId())
                .nombre(paquete.getNombre())
                .cantidadCreditos(paquete.getCantidadCreditos())
                .precio(paquete.getPrecio())
                .estado(paquete.getEstado())
                .build();
    }
}
