package com.asistiapp.backend.services.admin;

import com.asistiapp.backend.models.dtos.admin.configuracion.ActualizarConfiguracionRequestDTO;
import com.asistiapp.backend.models.dtos.admin.configuracion.ConfiguracionSistemaResponseDTO;
import com.asistiapp.backend.models.entities.ConfiguracionSistema;
import com.asistiapp.backend.repositories.ConfiguracionSistemaRepository;
import com.asistiapp.backend.security.SecurityUtils;
import com.asistiapp.backend.security.audit.Auditable;
import com.asistiapp.backend.security.audit.AuditoriaContexto;
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
        boolean nueva = configuracion.getId() == null;
        String valorAntes = configuracion.getValor();
        String descripcionAntes = configuracion.getDescripcion();

        configuracion.setValor(dto.getValor());
        if (dto.getDescripcion() != null) {
            configuracion.setDescripcion(dto.getDescripcion());
        }
        configuracion.setIdAdministrador(securityUtils.getIdUsuarioAutenticado());

        ConfiguracionSistema saved = configuracionSistemaRepository.save(configuracion);
        auditar(saved, nueva, valorAntes, descripcionAntes);
        log.info("Configuración actualizada: clave={}, valor={}", clave, dto.getValor());
        return toResponseDTO(saved);
    }

    /**
     * Auditoría: la clave es el "nombre" de la entidad. El valor se escribe salvo que la clave
     * parezca un secreto (mismo criterio que el aspecto para los parámetros sensibles).
     */
    private static void auditar(ConfiguracionSistema saved, boolean nueva, String valorAntes, String descripcionAntes) {
        AuditoriaContexto.objetivo(saved.getId(), saved.getClave());
        boolean sensible = esClaveSensible(saved.getClave());
        if (nueva) {
            AuditoriaContexto.detalle(sensible ? "Se creó la configuración."
                    : "Se creó la configuración con el valor " + saved.getValor() + ".");
            return;
        }
        boolean cambioValor = !java.util.Objects.equals(valorAntes, saved.getValor());
        boolean cambioDescripcion = !java.util.Objects.equals(descripcionAntes, saved.getDescripcion());
        if (cambioValor && sensible) {
            AuditoriaContexto.detalle("Valor: modificado");
        } else if (cambioValor) {
            AuditoriaContexto.cambio("Valor", valorAntes, saved.getValor());
        }
        AuditoriaContexto.cambio("Descripción", descripcionAntes, saved.getDescripcion());
        if (!cambioValor && !cambioDescripcion) {
            AuditoriaContexto.detalle("Se guardó sin cambios.");
        }
    }

    private static boolean esClaveSensible(String clave) {
        String c = clave == null ? "" : clave.toLowerCase(java.util.Locale.ROOT);
        return c.contains("password") || c.contains("secret") || c.contains("token") || c.contains("clave");
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
