package com.asistiapp.backend.services.admin;

import com.asistiapp.backend.models.dtos.admin.configuracion.ActualizarConfiguracionRequestDTO;
import com.asistiapp.backend.models.dtos.admin.configuracion.ConfiguracionSistemaResponseDTO;
import com.asistiapp.backend.models.entities.ConfiguracionSistema;
import com.asistiapp.backend.repositories.ConfiguracionSistemaRepository;
import com.asistiapp.backend.security.SecurityUtils;
import com.asistiapp.backend.security.audit.Auditable;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Administración de configuraciones globales del sistema (CU-028).
 * `actualizar` funciona como upsert: si la clave no existe todavía, la crea
 * — no hace falta un script de seed para arrancar a usar el sistema.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminConfiguracionService {

    private final ConfiguracionSistemaRepository configuracionSistemaRepository;
    private final SecurityUtils securityUtils;

    @Transactional(readOnly = true)
    public List<ConfiguracionSistemaResponseDTO> listarTodas() {
        return configuracionSistemaRepository.findAll().stream()
                .map(this::toResponseDTO)
                .toList();
    }

    @Transactional
    @Auditable(accion = "ACTUALIZAR_CONFIGURACION", entidad = "ConfiguracionSistema")
    public ConfiguracionSistemaResponseDTO actualizar(String clave, ActualizarConfiguracionRequestDTO dto) {
        ConfiguracionSistema configuracion = configuracionSistemaRepository.findByClave(clave)
                .orElseGet(() -> {
                    ConfiguracionSistema nueva = new ConfiguracionSistema();
                    nueva.setClave(clave);
                    return nueva;
                });

        configuracion.setValor(dto.getValor());
        if (dto.getDescripcion() != null) {
            configuracion.setDescripcion(dto.getDescripcion());
        }
        configuracion.setIdAdministrador(securityUtils.getIdUsuarioAutenticado());

        ConfiguracionSistema saved = configuracionSistemaRepository.save(configuracion);
        log.info("Configuración actualizada: clave={}, valor={}", clave, dto.getValor());
        return toResponseDTO(saved);
    }

    private ConfiguracionSistemaResponseDTO toResponseDTO(ConfiguracionSistema configuracion) {
        return ConfiguracionSistemaResponseDTO.builder()
                .id(configuracion.getId())
                .clave(configuracion.getClave())
                .valor(configuracion.getValor())
                .descripcion(configuracion.getDescripcion())
                .fechaActualizacion(configuracion.getFechaActualizacion())
                .idAdministrador(configuracion.getIdAdministrador())
                .build();
    }
}
