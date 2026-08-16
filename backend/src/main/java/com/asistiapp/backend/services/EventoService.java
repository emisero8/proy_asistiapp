package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.ForbiddenActionException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.dtos.evento.EventoRequestDTO;
import com.asistiapp.backend.models.dtos.evento.EventoResponseDTO;
import com.asistiapp.backend.models.dtos.tanda.TandaResponseDTO;
import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.models.enums.EstadoEvento;
import com.asistiapp.backend.models.entities.Entrada;
import com.asistiapp.backend.repositories.EntradaRepository;
import com.asistiapp.backend.repositories.EventoRepository;
import com.asistiapp.backend.repositories.OrganizadorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Servicio de gestión de Eventos para el rol Organizador.
 *
 * Reglas de negocio implementadas:
 *  - CU-007: Crear evento en estado Borrador.
 *  - CU-010: Publicar evento consume 1 crédito del Organizador.
 *  - Un Organizador solo puede ver/modificar sus propios eventos.
 *  - Solo se pueden editar eventos en estado Borrador.
 *  - Solo se pueden cancelar eventos en estado Borrador o Publicado.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EventoService {

    /** Créditos que cuesta publicar un evento si el Admin no configuró otro valor (CU-028). */
    private static final int CREDITOS_POR_PUBLICACION_DEFAULT = 1;
    private static final String CLAVE_CREDITOS_POR_PUBLICACION = "creditos_por_publicacion";

    private final EventoRepository eventoRepository;
    private final OrganizadorRepository organizadorRepository;
    private final EntradaRepository entradaRepository;
    private final CreditoLedgerService creditoLedgerService;
    private final ConfiguracionService configuracionService;
    private final EmailService emailService;

    // ─────────────────────────────────────────────
    // Consultas
    // ─────────────────────────────────────────────

    /** Retorna todos los eventos del organizador autenticado. */
    @Transactional(readOnly = true)
    public List<EventoResponseDTO> listarMisEventos(Long idOrganizador) {
        return eventoRepository.findByIdOrganizador(idOrganizador)
                .stream()
                .map(this::toResponseDTO)
                .toList();
    }

    /** Retorna un evento por ID, verificando que pertenezca al organizador. */
    @Transactional(readOnly = true)
    public EventoResponseDTO obtenerEvento(Long idEvento, Long idOrganizador) {
        Evento evento = getEventoOrThrow(idEvento);
        verificarPropietario(evento, idOrganizador);
        return toResponseDTO(evento);
    }

    /**
     * Retorna los eventos Publicados de un organizador — usado por el Staff Vendedor
     * (CU-019) para elegir en qué evento está vendiendo entradas manualmente.
     */
    @Transactional(readOnly = true)
    public List<EventoResponseDTO> listarEventosPublicadosDeOrganizador(Long idOrganizador) {
        return eventoRepository.findByIdOrganizadorAndEstado(idOrganizador, EstadoEvento.Publicado)
                .stream()
                .map(this::toResponseDTO)
                .toList();
    }

    // ─────────────────────────────────────────────
    // Creación
    // ─────────────────────────────────────────────

    /**
     * Crea un nuevo Evento en estado Borrador (CU-007).
     * No consume créditos — la publicación es el paso que los consume.
     */
    @Transactional
    public EventoResponseDTO crearEvento(EventoRequestDTO dto, Long idOrganizador) {
        // Verificar que el organizador existe
        organizadorRepository.findById(idOrganizador)
                .orElseThrow(() -> new ResourceNotFoundException("Organizador no encontrado"));

        Evento evento = new Evento();
        mapDtoToEvento(dto, evento);
        evento.setIdOrganizador(idOrganizador);
        // estado se setea en Borrador por el @PrePersist de la entidad

        Evento saved = eventoRepository.save(evento);
        log.info("Evento creado: id={}, organizador={}", saved.getId(), idOrganizador);
        return toResponseDTO(saved);
    }

    // ─────────────────────────────────────────────
    // Actualización
    // ─────────────────────────────────────────────

    /**
     * Actualiza los datos básicos de un evento.
     * Solo permitido si el evento está en estado Borrador.
     */
    @Transactional
    public EventoResponseDTO actualizarEvento(Long idEvento, EventoRequestDTO dto, Long idOrganizador) {
        Evento evento = getEventoOrThrow(idEvento);
        verificarPropietario(evento, idOrganizador);
        verificarEstadoBorrador(evento, "editar");

        mapDtoToEvento(dto, evento);
        Evento saved = eventoRepository.save(evento);
        log.info("Evento actualizado: id={}", idEvento);
        return toResponseDTO(saved);
    }

    // ─────────────────────────────────────────────
    // Publicación (CU-010)
    // ─────────────────────────────────────────────

    /**
     * Publica un evento consumiendo 1 crédito del Organizador (CU-010).
     *
     * Precondiciones:
     *  - Evento debe estar en Borrador.
     *  - Debe tener al menos 1 Tanda configurada.
     *  - El Organizador debe tener saldo_creditos > 0.
     *
     * @throws BusinessRuleException si no se cumplen las precondiciones.
     */
    @Transactional
    public EventoResponseDTO publicarEvento(Long idEvento, Long idOrganizador) {
        Evento evento = getEventoOrThrow(idEvento);
        verificarPropietario(evento, idOrganizador);
        verificarEstadoBorrador(evento, "publicar");

        // Debe tener al menos una tanda para poder publicarse
        if (evento.getTandas().isEmpty()) {
            throw new BusinessRuleException(
                    "El evento debe tener al menos una tanda configurada antes de publicarse");
        }

        // Verificar y descontar créditos del organizador
        Organizador organizador = organizadorRepository.findById(idOrganizador)
                .orElseThrow(() -> new ResourceNotFoundException("Organizador no encontrado"));

        int costoPublicacion = configuracionService.obtenerEntero(
                CLAVE_CREDITOS_POR_PUBLICACION, CREDITOS_POR_PUBLICACION_DEFAULT);

        if (organizador.getSaldoCreditos() < costoPublicacion) {
            throw new BusinessRuleException(
                    "Saldo de créditos insuficiente. Necesitás " + costoPublicacion +
                    " crédito(s) para publicar un evento. Saldo actual: " + organizador.getSaldoCreditos());
        }

        // Descontar crédito (deja rastro en MOVIMIENTO_CREDITO) y cambiar estado
        creditoLedgerService.registrarConsumoPublicacion(organizador, costoPublicacion, evento.getId());

        evento.setEstado(EstadoEvento.Publicado);
        evento.setUrlPublica(generarUrlPublica(evento));
        evento.setFechaPublicacion(LocalDateTime.now());
        Evento saved = eventoRepository.save(evento);

        log.info("Evento publicado: id={}, organizador={}, créditos restantes={}",
                idEvento, idOrganizador, organizador.getSaldoCreditos());
        return toResponseDTO(saved);
    }

    // ─────────────────────────────────────────────
    // Cancelación
    // ─────────────────────────────────────────────

    /**
     * Cancela un evento. Permitido en estado Borrador o Publicado.
     * No devuelve los créditos consumidos al publicar.
     */
    @Transactional
    public EventoResponseDTO cancelarEvento(Long idEvento, Long idOrganizador) {
        Evento evento = getEventoOrThrow(idEvento);
        verificarPropietario(evento, idOrganizador);

        if (evento.getEstado() == EstadoEvento.Cancelado) {
            throw new BusinessRuleException("El evento ya está cancelado");
        }

        evento.setEstado(EstadoEvento.Cancelado);
        evento.setFechaCancelacion(LocalDateTime.now());
        Evento saved = eventoRepository.save(evento);
        notificarCancelacionACompradores(saved);
        log.info("Evento cancelado: id={}", idEvento);
        return toResponseDTO(saved);
    }

    /**
     * Avisa por email a todos los compradores de entradas del evento que
     * fue cancelado. Usado tanto por esta clase (Organizador) como por
     * AdminEventoService (Admin) para no duplicar la lógica de notificación.
     */
    public void notificarCancelacionACompradores(Evento evento) {
        for (Entrada entrada : entradaRepository.findByEventoId(evento.getId())) {
            emailService.enviarNotificacionCancelacion(
                    entrada.getEmailComprador(), entrada.getNombreComprador(), evento.getNombre());
        }
    }

    // ─────────────────────────────────────────────
    // Helpers privados
    // ─────────────────────────────────────────────

    private Evento getEventoOrThrow(Long idEvento) {
        return eventoRepository.findById(idEvento)
                .orElseThrow(() -> new ResourceNotFoundException("Evento no encontrado con id: " + idEvento));
    }

    private void verificarPropietario(Evento evento, Long idOrganizador) {
        if (!evento.getIdOrganizador().equals(idOrganizador)) {
            throw new ForbiddenActionException("No tenés permiso para acceder a este evento");
        }
    }

    private void verificarEstadoBorrador(Evento evento, String accion) {
        if (evento.getEstado() != EstadoEvento.Borrador) {
            throw new BusinessRuleException(
                    "Solo podés " + accion + " un evento en estado Borrador. " +
                    "Estado actual: " + evento.getEstado());
        }
    }

    private void mapDtoToEvento(EventoRequestDTO dto, Evento evento) {
        evento.setNombre(dto.getNombre());
        evento.setDescripcion(dto.getDescripcion());
        evento.setFechaEvento(dto.getFechaEvento());
        evento.setHoraEvento(dto.getHoraEvento());
        evento.setLugar(dto.getLugar());
        evento.setImagenPortadaUrl(dto.getImagenPortadaUrl());
    }

    /**
     * Genera una URL pública única basada en el nombre del evento y un UUID corto.
     * Ejemplo: "festival-de-rock-a1b2c3d4"
     */
    private String generarUrlPublica(Evento evento) {
        String slug = evento.getNombre()
                .toLowerCase()
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-");
        String shortUuid = UUID.randomUUID().toString().substring(0, 8);
        return slug + "-" + shortUuid;
    }

    public EventoResponseDTO toResponseDTO(Evento evento) {
        List<TandaResponseDTO> tandaResponses = evento.getTandas().stream()
                .map(t -> TandaResponseDTO.builder()
                        .id(t.getId())
                        .idEvento(evento.getId())
                        .nombre(t.getNombre())
                        .precio(t.getPrecio())
                        .cupoMaximo(t.getCupoMaximo())
                        .cupoDisponible(t.getCupoDisponible())
                        .fechaInicioVigencia(t.getFechaInicioVigencia())
                        .fechaFinVigencia(t.getFechaFinVigencia())
                        .build())
                .toList();

        return EventoResponseDTO.builder()
                .id(evento.getId())
                .idOrganizador(evento.getIdOrganizador())
                .nombre(evento.getNombre())
                .descripcion(evento.getDescripcion())
                .fechaEvento(evento.getFechaEvento())
                .horaEvento(evento.getHoraEvento())
                .lugar(evento.getLugar())
                .imagenPortadaUrl(evento.getImagenPortadaUrl())
                .estado(evento.getEstado())
                .urlPublica(evento.getUrlPublica())
                .fechaCreacion(evento.getFechaCreacion())
                .fechaPublicacion(evento.getFechaPublicacion())
                .fechaCancelacion(evento.getFechaCancelacion())
                .tandas(tandaResponses)
                .build();
    }
}
