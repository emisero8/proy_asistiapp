package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.dtos.publico.EventoPublicoDetalleDTO;
import com.asistiapp.backend.models.dtos.publico.EventoPublicoListItemDTO;
import com.asistiapp.backend.models.dtos.tanda.TandaResponseDTO;
import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.entities.Tanda;
import com.asistiapp.backend.models.enums.EstadoEvento;
import com.asistiapp.backend.repositories.EventoRepository;
import com.asistiapp.backend.repositories.OrganizadorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

/**
 * Catálogo público de eventos para el Comprador (CU-015, CU-016).
 * Sin autenticación — el Comprador nunca inicia sesión (ver docs/Trabajo_PP2...).
 * Solo expone eventos en estado Publicado, y solo los que todavía no pasaron
 * su fecha y hora (el catálogo no es un archivo histórico).
 */
@Service
@RequiredArgsConstructor
public class EventoPublicoService {

    private final EventoRepository eventoRepository;
    private final LimiteCompradorService limiteCompradorService;
    private final OrganizadorRepository organizadorRepository;

    @Transactional(readOnly = true)
    public List<EventoPublicoListItemDTO> listarPublicados() {
        return eventoRepository.findByEstado(EstadoEvento.Publicado).stream()
                .filter(e -> !e.yaFinalizo())
                .map(this::toListItemDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public EventoPublicoDetalleDTO obtenerPorUrlPublica(String urlPublica) {
        Evento evento = eventoRepository.findByUrlPublica(urlPublica)
                .orElseThrow(() -> new ResourceNotFoundException("Evento no encontrado"));

        // No exponer eventos en Borrador/Cancelado a través del catálogo público
        if (evento.getEstado() != EstadoEvento.Publicado) {
            throw new ResourceNotFoundException("Evento no encontrado");
        }

        return toDetalleDTO(evento);
    }

    private EventoPublicoListItemDTO toListItemDTO(Evento evento) {
        // Solo las tandas que se venden al público: las de cortesía (soloEmision, 8.10) no se muestran,
        // así que tampoco cuentan para el precio, la cantidad de tandas ni el cupo del listado.
        List<Tanda> tandas = evento.getTandas().stream()
                .filter(t -> !t.isSoloEmision())
                .toList();

        Double precioDesde = tandas.stream()
                .map(Tanda::getPrecio)
                .min(Comparator.naturalOrder())
                .orElse(null);

        int cupoDisponibleTotal = tandas.stream()
                .mapToInt(t -> t.getCupoDisponible() != null ? t.getCupoDisponible() : 0)
                .sum();
        int cupoTotal = tandas.stream()
                .mapToInt(t -> t.getCupoMaximo() != null ? t.getCupoMaximo() : 0)
                .sum();

        return EventoPublicoListItemDTO.builder()
                .id(evento.getId())
                .nombre(evento.getNombre())
                .fechaEvento(evento.getFechaEvento())
                .horaEvento(evento.getHoraEvento())
                .lugar(evento.getLugar())
                .imagenPortadaUrl(evento.getImagenPortadaUrl())
                .urlPublica(evento.getUrlPublica())
                .precioDesde(precioDesde)
                .cantidadTandas(tandas.size())
                .cupoDisponibleTotal(cupoDisponibleTotal)
                .cupoTotal(cupoTotal)
                .build();
    }

    private EventoPublicoDetalleDTO toDetalleDTO(Evento evento) {
        var organizador = organizadorRepository.findById(evento.getIdOrganizador()).orElse(null);
        BigDecimal porcentajeCargo = CargoServicioMp.porcentajeRecargoPara(organizador);

        // Las tandas de cortesía son internas del Organizador: el público no las ve.
        List<TandaResponseDTO> tandas = evento.getTandas().stream()
                .filter(t -> !t.isSoloEmision())
                .map(t -> TandaResponseDTO.builder()
                        .id(t.getId())
                        .idEvento(evento.getId())
                        .nombre(t.getNombre())
                        .precio(t.getPrecio())
                        .cupoMaximo(t.getCupoMaximo())
                        .cupoDisponible(t.getCupoDisponible())
                        .fechaInicioVigencia(t.getFechaInicioVigencia())
                        .fechaFinVigencia(t.getFechaFinVigencia())
                        .cargoServicio(CargoServicioMp.cargoUnitarioPara(organizador,
                                t.getPrecio() == null ? 0 : t.getPrecio()).doubleValue())
                        .build())
                .toList();

        return EventoPublicoDetalleDTO.builder()
                .id(evento.getId())
                .nombre(evento.getNombre())
                .descripcion(evento.getDescripcion())
                .fechaEvento(evento.getFechaEvento())
                .horaEvento(evento.getHoraEvento())
                .lugar(evento.getLugar())
                .latitud(evento.getLatitud())
                .longitud(evento.getLongitud())
                .imagenPortadaUrl(evento.getImagenPortadaUrl())
                .urlPublica(evento.getUrlPublica())
                .tandas(tandas)
                .maxEntradasPorCompra(limiteCompradorService.limiteParaOrganizador(evento.getIdOrganizador()))
                .contactoWhatsapp(organizador == null ? null : organizador.getContactoWhatsapp())
                .contactoEmail(organizador == null ? null : organizador.getContactoEmail())
                .porcentajeCargoServicio(porcentajeCargo == null ? null : porcentajeCargo.doubleValue())
                .build();
    }
}
