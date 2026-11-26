package com.asistiapp.backend.services;

import com.asistiapp.backend.models.dtos.admin.auditoria.LogAuditoriaResponseDTO;
import com.asistiapp.backend.models.dtos.admin.auditoria.PaginaAuditoriaResponseDTO;
import com.asistiapp.backend.models.entities.LogAuditoria;
import com.asistiapp.backend.models.enums.RolUsuario;
import com.asistiapp.backend.repositories.LogAuditoriaRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * Registro y consulta del historial de auditoría (LOG_AUDITORIA): acciones del Admin, del
 * Organizador y de su Staff. Los registros los escribe AuditoriaAspect tras cada acción
 * exitosa anotada con @Auditable — nunca se editan ni se borran.
 */
@Service
@RequiredArgsConstructor
public class AuditoriaService {

    public static final int TAMANO_POR_DEFECTO = 20;
    public static final int TAMANO_MAXIMO = 100;
    private static final String FECHA_HORA = "fechaHora";

    private final LogAuditoriaRepository logAuditoriaRepository;

    @Transactional
    public void registrar(Long idEmisor, String emisorNombre, RolUsuario emisorRol, String accion,
                          String entidadAfectada, Long idEntidadAfectada, String entidadNombre, String detalle) {
        LogAuditoria log = new LogAuditoria();
        log.setIdEmisor(idEmisor);
        log.setEmisorNombre(emisorNombre);
        log.setEmisorRol(emisorRol == null ? null : emisorRol.name());
        log.setAccion(accion);
        log.setEntidadAfectada(entidadAfectada);
        log.setIdEntidadAfectada(idEntidadAfectada);
        log.setEntidadNombre(entidadNombre);
        log.setDetalle(detalle);
        logAuditoriaRepository.save(log);
    }

    /**
     * Filtros del listado; todos opcionales.
     *
     * @param roles     roles del emisor (varios = cualquiera de ellos)
     * @param idEmisor  un emisor puntual
     * @param idEntidad un registro puntual (se usa junto con {@code entidad})
     */
    public record Filtros(List<RolUsuario> roles, Long idEmisor, String accion, String entidad, Long idEntidad,
                          LocalDate desde, LocalDate hasta, String busqueda) {
    }

    /**
     * Una página del historial, de lo más reciente a lo más viejo. {@code busqueda} compara
     * (sin distinguir mayúsculas) contra el nombre del emisor, el de la entidad afectada, el
     * detalle y los códigos de acción y de entidad; si es un número, también contra el id del
     * emisor y el de la entidad.
     */
    @Transactional(readOnly = true)
    public PaginaAuditoriaResponseDTO listar(Filtros filtros, int pagina, int tamano) {
        int paginaValida = Math.max(pagina, 0);
        int tamanoValido = tamano <= 0 ? TAMANO_POR_DEFECTO : Math.min(tamano, TAMANO_MAXIMO);
        PageRequest pedido = PageRequest.of(paginaValida, tamanoValido,
                Sort.by(Sort.Direction.DESC, FECHA_HORA).and(Sort.by(Sort.Direction.DESC, "id")));

        Page<LogAuditoria> resultado = logAuditoriaRepository.findAll(especificacion(filtros), pedido);
        return PaginaAuditoriaResponseDTO.builder()
                .items(resultado.getContent().stream().map(this::toResponseDTO).toList())
                .pagina(resultado.getNumber())
                .tamano(resultado.getSize())
                .totalElementos(resultado.getTotalElements())
                .totalPaginas(resultado.getTotalPages())
                .build();
    }

    private static Specification<LogAuditoria> especificacion(Filtros f) {
        return (root, query, cb) -> {
            List<Predicate> condiciones = new ArrayList<>();
            if (f.roles() != null && !f.roles().isEmpty()) {
                condiciones.add(root.get("emisorRol").in(f.roles().stream().map(Enum::name).toList()));
            }
            if (f.idEmisor() != null) {
                condiciones.add(cb.equal(root.get("idEmisor"), f.idEmisor()));
            }
            if (tieneTexto(f.accion())) {
                condiciones.add(cb.equal(root.get("accion"), f.accion().strip()));
            }
            if (tieneTexto(f.entidad())) {
                condiciones.add(cb.equal(root.get("entidadAfectada"), f.entidad().strip()));
            }
            if (f.idEntidad() != null) {
                condiciones.add(cb.equal(root.get("idEntidadAfectada"), f.idEntidad()));
            }
            if (f.desde() != null) {
                condiciones.add(cb.greaterThanOrEqualTo(root.get(FECHA_HORA), f.desde().atStartOfDay()));
            }
            if (f.hasta() != null) {
                condiciones.add(cb.lessThan(root.get(FECHA_HORA), f.hasta().plusDays(1).atStartOfDay()));
            }
            if (tieneTexto(f.busqueda())) {
                String termino = f.busqueda().strip().toLowerCase(Locale.ROOT);
                String patron = "%" + escaparLike(termino) + "%";
                List<Predicate> alguna = new ArrayList<>();
                for (String campo : List.of("emisorNombre", "entidadNombre", "detalle", "accion", "entidadAfectada")) {
                    alguna.add(cb.like(cb.lower(root.get(campo)), patron, '\\'));
                }
                Long id = comoId(termino);
                if (id != null) {
                    alguna.add(cb.equal(root.get("idEmisor"), id));
                    alguna.add(cb.equal(root.get("idEntidadAfectada"), id));
                }
                condiciones.add(cb.or(alguna.toArray(Predicate[]::new)));
            }
            return cb.and(condiciones.toArray(Predicate[]::new));
        };
    }

    private static boolean tieneTexto(String s) {
        return s != null && !s.isBlank();
    }

    /** Escapa los comodines de LIKE para que "50%" busque el texto literal. */
    private static String escaparLike(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    /** "12" o "#12" → 12; cualquier otra cosa → null. */
    private static Long comoId(String termino) {
        String limpio = termino.startsWith("#") ? termino.substring(1) : termino;
        if (limpio.isEmpty() || limpio.length() > 18 || !limpio.chars().allMatch(Character::isDigit)) {
            return null;
        }
        return Long.parseLong(limpio);
    }

    private static RolUsuario rolDe(String valor) {
        return Arrays.stream(RolUsuario.values()).filter(r -> r.name().equals(valor)).findFirst().orElse(null);
    }

    private LogAuditoriaResponseDTO toResponseDTO(LogAuditoria log) {
        return LogAuditoriaResponseDTO.builder()
                .id(log.getId())
                .idEmisor(log.getIdEmisor())
                .emisorNombre(log.getEmisorNombre())
                .emisorRol(rolDe(log.getEmisorRol()))
                .accion(log.getAccion())
                .entidadAfectada(log.getEntidadAfectada())
                .idEntidadAfectada(log.getIdEntidadAfectada())
                .entidadNombre(log.getEntidadNombre())
                .detalle(log.getDetalle())
                .fechaHora(log.getFechaHora())
                .build();
    }
}
