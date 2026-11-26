package com.asistiapp.backend.services.admin;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.dtos.evento.EventoRequestDTO;
import com.asistiapp.backend.models.dtos.evento.EventoResponseDTO;
import com.asistiapp.backend.models.dtos.tanda.TandaRequestDTO;
import com.asistiapp.backend.models.dtos.tanda.TandaResponseDTO;
import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.entities.Tanda;
import com.asistiapp.backend.models.enums.EstadoEvento;
import com.asistiapp.backend.repositories.EntradaRepository;
import com.asistiapp.backend.models.enums.EstadoTransaccion;
import com.asistiapp.backend.repositories.EventoRepository;
import com.asistiapp.backend.repositories.TandaRepository;
import com.asistiapp.backend.repositories.TransaccionPagoRepository;
import com.asistiapp.backend.repositories.UsuarioRepository;
import com.asistiapp.backend.security.audit.Auditable;
import com.asistiapp.backend.security.audit.AuditoriaContexto;
import com.asistiapp.backend.security.audit.FotosAuditoria;
import com.asistiapp.backend.services.EventoService;
import com.asistiapp.backend.services.NotificacionService;
import com.asistiapp.backend.services.TandaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Gestión administrativa de eventos (CU-023, CU-024, CU-025).
 * A diferencia de EventoService (que valida propiedad y restringe estados
 * según el flujo del Organizador), acá el Admin puede editar/cancelar/eliminar
 * cualquier evento del sistema.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminEventoService {

    private final EventoRepository eventoRepository;
    private final EntradaRepository entradaRepository;
    private final TransaccionPagoRepository transaccionPagoRepository;
    private final TandaRepository tandaRepository;
    private final UsuarioRepository usuarioRepository;
    private final EventoService eventoService;
    private final TandaService tandaService;
    private final NotificacionService notificacionService;

    @Transactional(readOnly = true)
    public EventoResponseDTO obtenerEvento(Long idEvento) {
        return eventoService.toResponseDTO(getEventoOrThrow(idEvento));
    }

    @Transactional(readOnly = true)
    public List<EventoResponseDTO> listarTodos() {
        return eventoRepository.findAll().stream()
                .map(eventoService::toResponseDTO)
                .toList();
    }

    /**
     * El Admin edita cualquier evento del sistema. Se delega en EventoService /
     * TandaService pasando el organizador dueño del evento como actor, de modo
     * que aplican exactamente las mismas reglas de negocio que ve el
     * Organizador (ventana de venta de tandas, cupo vendido, etc.).
     */
    @Transactional
    @Auditable(accion = "EDITAR_EVENTO_ADMIN", entidad = "Evento")
    public EventoResponseDTO editarEvento(Long idEvento, EventoRequestDTO dto) {
        Evento evento = getEventoOrThrow(idEvento);
        Map<String, Object> antes = FotosAuditoria.evento(evento);
        EventoResponseDTO actualizado = eventoService.actualizarEvento(idEvento, dto, evento.getIdOrganizador());

        if (AuditoriaContexto.activo()) {
            Evento despues = getEventoOrThrow(idEvento);
            AuditoriaContexto.objetivo(despues.getId(), despues.getNombre());
            AuditoriaContexto.detalle(organizadorDe(despues));
            AuditoriaContexto.cambios(antes, FotosAuditoria.evento(despues));
        }
        return actualizado;
    }

    @Transactional
    @Auditable(accion = "CREAR_TANDA_ADMIN", entidad = "Tanda")
    public TandaResponseDTO crearTanda(Long idEvento, TandaRequestDTO dto) {
        Evento evento = getEventoOrThrow(idEvento);
        TandaResponseDTO creada = tandaService.crearTanda(idEvento, dto, evento.getIdOrganizador());

        fotoTanda(creada.getId()).ifPresent(tanda -> {
            auditarTanda(tanda, evento);
            FotosAuditoria.detallarTodo(FotosAuditoria.tanda(tanda));
        });
        return creada;
    }

    @Transactional
    @Auditable(accion = "EDITAR_TANDA_ADMIN", entidad = "Tanda")
    public TandaResponseDTO actualizarTanda(Long idEvento, Long idTanda, TandaRequestDTO dto) {
        Evento evento = getEventoOrThrow(idEvento);
        // Foto de los valores antes del cambio (la entidad la modifica el servicio en el lugar).
        Map<String, Object> antes = fotoTanda(idTanda).map(FotosAuditoria::tanda).orElse(Map.of());
        TandaResponseDTO actualizada = tandaService.actualizarTanda(idEvento, idTanda, dto, evento.getIdOrganizador());

        fotoTanda(idTanda).ifPresent(tanda -> {
            auditarTanda(tanda, evento);
            AuditoriaContexto.cambios(antes, FotosAuditoria.tanda(tanda));
        });
        return actualizada;
    }

    @Transactional
    @Auditable(accion = "ELIMINAR_TANDA_ADMIN", entidad = "Tanda")
    public void eliminarTanda(Long idEvento, Long idTanda) {
        Evento evento = getEventoOrThrow(idEvento);
        Tanda tanda = fotoTanda(idTanda).orElse(null);
        Map<String, Object> campos = tanda != null ? FotosAuditoria.tanda(tanda) : Map.of();
        String nombreTanda = tanda != null ? tanda.getNombre() : null;

        tandaService.eliminarTanda(idEvento, idTanda, evento.getIdOrganizador());

        AuditoriaContexto.objetivo(idTanda, FotosAuditoria.nombreTanda(nombreTanda, evento));
        AuditoriaContexto.detalle(organizadorDe(evento));
        FotosAuditoria.detallarTodo(campos);
    }

    @Transactional
    @Auditable(accion = "CANCELAR_EVENTO_ADMIN", entidad = "Evento")
    public EventoResponseDTO cancelarEvento(Long idEvento) {
        Evento evento = getEventoOrThrow(idEvento);

        if (evento.getEstado() == EstadoEvento.Cancelado) {
            throw new BusinessRuleException("El evento ya está cancelado");
        }

        AuditoriaContexto.objetivo(evento.getId(), evento.getNombre());
        AuditoriaContexto.detalle(organizadorDe(evento));
        AuditoriaContexto.cambio("Estado", evento.getEstado(), EstadoEvento.Cancelado);
        AuditoriaContexto.detalle("Se avisó a los compradores y se devolvieron los créditos de las entradas sin vender.");
        evento.setEstado(EstadoEvento.Cancelado);
        evento.setFechaCancelacion(LocalDateTime.now());
        Evento saved = eventoRepository.save(evento);
        eventoService.devolverCreditosDeEntradasSinVender(saved);
        eventoService.notificarCancelacionACompradores(saved);
        notificacionService.crear(saved.getIdOrganizador(),
                "Tu evento fue cancelado",
                "El Administrador canceló \"" + saved.getNombre() + "\". Se devolvieron los créditos de las entradas sin vender.",
                "Evento", saved.getId());
        log.info("Evento cancelado por Admin: id={}", idEvento);
        return eventoService.toResponseDTO(saved);
    }

    /**
     * Bloquea la eliminación si el evento ya tiene entradas vendidas o compradores en pleno pago
     * (órdenes `Pendiente` vigentes) — cancelarlo es la vía correcta en esos casos.
     */
    @Transactional
    @Auditable(accion = "ELIMINAR_EVENTO_ADMIN", entidad = "Evento")
    public void eliminarEvento(Long idEvento) {
        Evento evento = getEventoOrThrow(idEvento);

        if (entradaRepository.countByEventoId(idEvento) > 0) {
            throw new BusinessRuleException(
                    "No se puede eliminar un evento con entradas vendidas. Cancelalo en su lugar.");
        }

        if (transaccionPagoRepository.countOrdenesAbiertasDelEvento(
                idEvento, EstadoTransaccion.Pendiente, LocalDateTime.now()) > 0) {
            throw new BusinessRuleException(
                    "No se puede eliminar un evento con compras en curso (hay compradores pagando ahora mismo). "
                            + "Cancelalo en su lugar o esperá a que venzan las órdenes pendientes.");
        }

        // Las tandas consumieron créditos al crearse; un evento ya cancelado los devolvió al cancelarse.
        if (evento.getEstado() != EstadoEvento.Cancelado) {
            eventoService.devolverCreditosDeEntradasSinVender(evento);
        }
        AuditoriaContexto.objetivo(evento.getId(), evento.getNombre());
        AuditoriaContexto.detalle(organizadorDe(evento));
        AuditoriaContexto.detalle("Estado: " + AuditoriaContexto.texto(evento.getEstado())
                + " · Fecha: " + AuditoriaContexto.texto(evento.getFechaEvento())
                + " · Lugar: " + evento.getLugar());
        AuditoriaContexto.detalle("Se eliminó el evento definitivamente.");

        eventoRepository.delete(evento);
        log.info("Evento eliminado por Admin: id={}", idEvento);
    }

    private Evento getEventoOrThrow(Long idEvento) {
        return eventoRepository.findById(idEvento)
                .orElseThrow(() -> new ResourceNotFoundException("Evento no encontrado con id: " + idEvento));
    }

    // ---- Auditoría ----

    /** "Organizador: Nombre (#id)" — de quién es el evento sobre el que actuó el Admin. */
    private String organizadorDe(Evento evento) {
        if (!AuditoriaContexto.activo()) {
            return null;
        }
        String nombre = usuarioRepository.findById(evento.getIdOrganizador())
                .map(com.asistiapp.backend.models.entities.Usuario::getNombre)
                .orElse("cuenta eliminada");
        return "Organizador: " + nombre + " (#" + evento.getIdOrganizador() + ")";
    }

    /** La tanda para la auditoría; vacío si no hay un método auditado en curso (no consulta la base). */
    private java.util.Optional<Tanda> fotoTanda(Long idTanda) {
        return AuditoriaContexto.activo() && idTanda != null ? tandaRepository.findById(idTanda) : java.util.Optional.empty();
    }

    private void auditarTanda(Tanda tanda, Evento evento) {
        AuditoriaContexto.objetivo(tanda.getId(), FotosAuditoria.nombreTanda(tanda.getNombre(), evento));
        AuditoriaContexto.detalle(organizadorDe(evento));
    }
}
