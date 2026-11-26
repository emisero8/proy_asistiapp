package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.ForbiddenActionException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.dtos.tanda.TandaRequestDTO;
import com.asistiapp.backend.models.dtos.tanda.TandaResponseDTO;
import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.models.entities.Tanda;
import com.asistiapp.backend.models.enums.EstadoEvento;
import com.asistiapp.backend.repositories.EventoRepository;
import com.asistiapp.backend.repositories.OrganizadorRepository;
import com.asistiapp.backend.repositories.TandaRepository;
import com.asistiapp.backend.security.audit.Auditable;
import com.asistiapp.backend.security.audit.AuditoriaContexto;
import com.asistiapp.backend.security.audit.FotosAuditoria;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Servicio de gestión de Tandas para el rol Organizador.
 *
 * Reglas de negocio:
 *  - Las tandas se pueden crear/editar mientras el evento no esté Cancelado
 *    (en Borrador se puede todo; en Publicado con restricciones — no reducir
 *    cupo por debajo de lo vendido, no borrar la última tanda, etc.).
 *  - La ventana de venta (fecha_inicio/fin_vigencia) no puede terminar después
 *    del comienzo del evento ni empezar después de que el evento arrancó.
 *  - El cupo_disponible se inicializa igual al cupo_maximo (@PrePersist de Tanda).
 *  - Al actualizar cupo_maximo, se ajusta cupo_disponible proporcionalmente.
 *  - El Organizador solo puede gestionar tandas de sus propios eventos.
 *  - Cada entrada de una tanda consume 1 crédito: al crear, el cupo se descuenta del saldo;
 *    al subir el cupo se cobra la diferencia, al bajarlo o eliminar la tanda se devuelve.
 *    No se puede crear ni subir un cupo por encima del saldo disponible.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TandaService {

    private final TandaRepository tandaRepository;
    private final EventoRepository eventoRepository;
    private final OrganizadorRepository organizadorRepository;
    private final CreditoLedgerService creditoLedgerService;
    private final CreditoService creditoService;

    // ─────────────────────────────────────────────
    // Consultas
    // ─────────────────────────────────────────────

    /** Lista todas las tandas de un evento. Verificando que el evento pertenezca al organizador. */
    @Transactional(readOnly = true)
    public List<TandaResponseDTO> listarTandas(Long idEvento, Long idOrganizador) {
        Evento evento = getEventoOrThrow(idEvento);
        verificarPropietario(evento, idOrganizador);
        return tandaRepository.findByEventoId(idEvento)
                .stream()
                .map(this::toResponseDTO)
                .toList();
    }

    /** Retorna una tanda específica. */
    @Transactional(readOnly = true)
    public TandaResponseDTO obtenerTanda(Long idEvento, Long idTanda, Long idOrganizador) {
        Evento evento = getEventoOrThrow(idEvento);
        verificarPropietario(evento, idOrganizador);
        Tanda tanda = getTandaOrThrow(idTanda);
        verificarTandaDelEvento(tanda, idEvento);
        return toResponseDTO(tanda);
    }

    // ─────────────────────────────────────────────
    // Creación
    // ─────────────────────────────────────────────

    /**
     * Crea una nueva Tanda asociada a un Evento en Borrador.
     * El @PrePersist de Tanda inicializa cupo_disponible = cupo_maximo.
     */
    @Transactional
    @Auditable(accion = "CREAR_TANDA", entidad = "Tanda")
    public TandaResponseDTO crearTanda(Long idEvento, TandaRequestDTO dto, Long idOrganizador) {
        Evento evento = getEventoOrThrow(idEvento);
        verificarPropietario(evento, idOrganizador);
        verificarEventoModificable(evento);
        validarVentana(dto, evento);

        Organizador organizador = getOrganizadorOrThrow(idOrganizador);
        verificarSaldoParaEntradas(organizador, dto.getCupoMaximo());

        Tanda tanda = new Tanda();
        tanda.setEvento(evento);
        mapDtoToTanda(dto, tanda);

        Tanda saved = tandaRepository.save(tanda);
        creditoLedgerService.registrarConsumoTanda(organizador, dto.getCupoMaximo(), idEvento);
        AuditoriaContexto.objetivo(saved.getId(), FotosAuditoria.nombreTanda(saved.getNombre(), evento));
        FotosAuditoria.detallarTodo(FotosAuditoria.tanda(saved));
        AuditoriaContexto.detalle("Consumió " + creditos(dto.getCupoMaximo()) + ".");
        log.info("Tanda creada: id={}, evento={}, créditos consumidos={}", saved.getId(), idEvento, dto.getCupoMaximo());
        return toResponseDTO(saved);
    }

    // ─────────────────────────────────────────────
    // Actualización
    // ─────────────────────────────────────────────

    /**
     * Actualiza una Tanda existente.
     * Si se modifica cupo_maximo, se ajusta cupo_disponible:
     *   nuevo_disponible = cupo_disponible + (nuevo_maximo - viejo_maximo)
     * Esto preserva los cupos ya vendidos.
     */
    @Transactional
    @Auditable(accion = "EDITAR_TANDA", entidad = "Tanda")
    public TandaResponseDTO actualizarTanda(Long idEvento, Long idTanda, TandaRequestDTO dto, Long idOrganizador) {
        Evento evento = getEventoOrThrow(idEvento);
        verificarPropietario(evento, idOrganizador);
        verificarEventoModificable(evento);
        validarVentana(dto, evento);

        Tanda tanda = getTandaOrThrow(idTanda);
        verificarTandaDelEvento(tanda, idEvento);

        // Ajustar cupo_disponible si cambia el cupo_maximo
        int deltaMaximo = dto.getCupoMaximo() - tanda.getCupoMaximo();
        int nuevoCupoDisponible = tanda.getCupoDisponible() + deltaMaximo;

        if (nuevoCupoDisponible < 0) {
            throw new BusinessRuleException(
                    "No podés reducir el cupo máximo por debajo de las entradas ya vendidas. " +
                    "Entradas vendidas: " + (tanda.getCupoMaximo() - tanda.getCupoDisponible()));
        }

        // Subir el cupo consume créditos extra; bajarlo devuelve la diferencia
        Organizador organizador = getOrganizadorOrThrow(idOrganizador);
        if (deltaMaximo > 0) {
            verificarSaldoParaEntradas(organizador, deltaMaximo);
            creditoLedgerService.registrarConsumoTanda(organizador, deltaMaximo, idEvento);
        } else if (deltaMaximo < 0) {
            creditoLedgerService.registrarDevolucionTanda(organizador, -deltaMaximo, idEvento);
        }

        boolean soloEmision = Boolean.TRUE.equals(dto.getSoloEmision());
        if (soloEmision != tanda.isSoloEmision() && tanda.getCupoMaximo() > tanda.getCupoDisponible()) {
            throw new BusinessRuleException(
                    "No podés cambiar si la tanda es de cortesía: ya tiene entradas emitidas o vendidas.");
        }

        java.util.Map<String, Object> antes = FotosAuditoria.tanda(tanda);
        mapDtoToTanda(dto, tanda);
        tanda.setCupoDisponible(nuevoCupoDisponible);

        Tanda saved = tandaRepository.save(tanda);
        AuditoriaContexto.objetivo(saved.getId(), FotosAuditoria.nombreTanda(saved.getNombre(), evento));
        AuditoriaContexto.cambios(antes, FotosAuditoria.tanda(saved));
        if (deltaMaximo > 0) {
            AuditoriaContexto.detalle("Consumió " + creditos(deltaMaximo) + " más.");
        } else if (deltaMaximo < 0) {
            AuditoriaContexto.detalle("Se devolvió " + creditos(-deltaMaximo) + ".");
        }
        log.info("Tanda actualizada: id={}", idTanda);
        return toResponseDTO(saved);
    }

    // ─────────────────────────────────────────────
    // Eliminación
    // ─────────────────────────────────────────────

    /**
     * Elimina una Tanda. Solo posible si el evento está en Borrador
     * y la tanda no tiene entradas vendidas.
     */
    @Transactional
    @Auditable(accion = "ELIMINAR_TANDA", entidad = "Tanda")
    public void eliminarTanda(Long idEvento, Long idTanda, Long idOrganizador) {
        Evento evento = getEventoOrThrow(idEvento);
        verificarPropietario(evento, idOrganizador);
        verificarEventoModificable(evento);

        Tanda tanda = getTandaOrThrow(idTanda);
        verificarTandaDelEvento(tanda, idEvento);

        int entradasVendidas = tanda.getCupoMaximo() - tanda.getCupoDisponible();
        if (entradasVendidas > 0) {
            throw new BusinessRuleException(
                    "No podés eliminar una tanda con entradas vendidas. " +
                    "Entradas vendidas: " + entradasVendidas);
        }

        // Un evento publicado no puede quedarse sin ninguna tanda que vender (las de cortesía no se venden).
        if (evento.getEstado() == EstadoEvento.Publicado && !tanda.isSoloEmision()
                && tandaRepository.findByEventoId(idEvento).stream()
                        .noneMatch(t -> !t.getId().equals(tanda.getId()) && !t.isSoloEmision())) {
            throw new BusinessRuleException(
                    "Un evento publicado necesita al menos una tanda de venta. " +
                    "No podés eliminar la última — cancelá el evento si querés bajarlo.");
        }

        // Sin entradas vendidas (verificado arriba): se devuelven todos los créditos de la tanda
        if (tanda.getCupoMaximo() > 0) {
            creditoLedgerService.registrarDevolucionTanda(
                    getOrganizadorOrThrow(idOrganizador), tanda.getCupoMaximo(), idEvento);
        }
        AuditoriaContexto.objetivo(tanda.getId(), FotosAuditoria.nombreTanda(tanda.getNombre(), evento));
        FotosAuditoria.detallarTodo(FotosAuditoria.tanda(tanda));
        if (tanda.getCupoMaximo() > 0) {
            AuditoriaContexto.detalle("Se devolvió " + creditos(tanda.getCupoMaximo()) + ".");
        }
        tandaRepository.delete(tanda);
        log.info("Tanda eliminada: id={}", idTanda);
    }

    // ─────────────────────────────────────────────
    // Helpers privados
    // ─────────────────────────────────────────────

    private Evento getEventoOrThrow(Long idEvento) {
        return eventoRepository.findById(idEvento)
                .orElseThrow(() -> new ResourceNotFoundException("Evento no encontrado con id: " + idEvento));
    }

    private Tanda getTandaOrThrow(Long idTanda) {
        return tandaRepository.findById(idTanda)
                .orElseThrow(() -> new ResourceNotFoundException("Tanda no encontrada con id: " + idTanda));
    }

    private void verificarPropietario(Evento evento, Long idOrganizador) {
        if (!evento.getIdOrganizador().equals(idOrganizador)) {
            throw new ForbiddenActionException("No tenés permiso para acceder a este evento");
        }
    }

    private void verificarTandaDelEvento(Tanda tanda, Long idEvento) {
        if (!tanda.getEvento().getId().equals(idEvento)) {
            throw new ForbiddenActionException("La tanda no pertenece al evento indicado");
        }
    }

    private void verificarEventoModificable(Evento evento) {
        if (evento.getEstado() == EstadoEvento.Cancelado) {
            throw new BusinessRuleException("No podés modificar las tandas de un evento cancelado.");
        }
        if (evento.estaCerrado()) {
            throw new BusinessRuleException("El evento ya finalizó: sus tandas no se pueden modificar.");
        }
    }

    /**
     * La ventana de venta de una tanda tiene que ser coherente con el evento:
     *  - "desde" anterior a "hasta" (si ambas están cargadas);
     *  - ni "desde" ni "hasta" pueden caer después del final del evento
     *    ({@link Evento#fin()}): se vende mientras dure, nunca después.
     */
    private void validarVentana(TandaRequestDTO dto, Evento evento) {
        LocalDateTime finEvento = evento.fin();
        LocalDateTime desde = dto.getFechaInicioVigencia();
        LocalDateTime hasta = dto.getFechaFinVigencia();

        if (desde != null && hasta != null && !desde.isBefore(hasta)) {
            throw new BusinessRuleException(
                    "El inicio de la venta de la tanda tiene que ser anterior al cierre.");
        }
        if (hasta != null && hasta.isAfter(finEvento)) {
            throw new BusinessRuleException(
                    "La venta de la tanda no puede cerrar después del final del evento (" +
                    Evento.HORAS_HASTA_FINALIZAR + " horas desde que empieza).");
        }
        if (desde != null && desde.isAfter(finEvento)) {
            throw new BusinessRuleException(
                    "La venta de la tanda no puede empezar después del final del evento.");
        }
    }

    private void mapDtoToTanda(TandaRequestDTO dto, Tanda tanda) {
        tanda.setNombre(dto.getNombre());
        boolean soloEmision = Boolean.TRUE.equals(dto.getSoloEmision());
        tanda.setSoloEmision(soloEmision);
        // Una tanda de cortesía no cobra nada: el precio que llegue se ignora.
        tanda.setPrecio(soloEmision ? 0.0 : dto.getPrecio());
        tanda.setCupoMaximo(dto.getCupoMaximo());
        tanda.setFechaInicioVigencia(dto.getFechaInicioVigencia());
        tanda.setFechaFinVigencia(dto.getFechaFinVigencia());
    }

    private Organizador getOrganizadorOrThrow(Long idOrganizador) {
        return organizadorRepository.findById(idOrganizador)
                .orElseThrow(() -> new ResourceNotFoundException("Organizador no encontrado"));
    }

    /**
     * Las entradas de la tanda se cubren con créditos. No puede haber más entradas que los
     * créditos disponibles para entradas (saldo menos el costo reservado de publicar).
     */
    private void verificarSaldoParaEntradas(Organizador organizador, int cantidadEntradas) {
        int disponible = creditoService.creditosDisponiblesParaEntradas(organizador);
        if (cantidadEntradas > disponible) {
            throw new BusinessRuleException(
                    "No tenés créditos suficientes para " + cantidadEntradas + " entradas. " +
                    "Disponibles para entradas: " + disponible + " (cada entrada consume 1 crédito; " +
                    "se reserva el costo de publicar el evento).");
        }
    }

    public TandaResponseDTO toResponseDTO(Tanda tanda) {
        return TandaResponseDTO.builder()
                .id(tanda.getId())
                .idEvento(tanda.getEvento().getId())
                .nombre(tanda.getNombre())
                .precio(tanda.getPrecio())
                .cupoMaximo(tanda.getCupoMaximo())
                .cupoDisponible(tanda.getCupoDisponible())
                .soloEmision(tanda.isSoloEmision())
                .fechaInicioVigencia(tanda.getFechaInicioVigencia())
                .fechaFinVigencia(tanda.getFechaFinVigencia())
                .build();
    }

    /** "1 crédito" / "3 créditos", para el detalle de la auditoría. */
    private static String creditos(int cantidad) {
        return cantidad + (cantidad == 1 ? " crédito" : " créditos");
    }
}
