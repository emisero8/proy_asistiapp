package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.ForbiddenActionException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.dtos.entrada.EntradaResponseDTO;
import com.asistiapp.backend.models.entities.Entrada;
import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.models.entities.TransaccionPago;
import com.asistiapp.backend.models.enums.EstadoEntrada;
import com.asistiapp.backend.models.enums.EstadoEvento;
import com.asistiapp.backend.repositories.EntradaRepository;
import com.asistiapp.backend.repositories.EventoRepository;
import com.asistiapp.backend.repositories.OrganizadorRepository;
import com.asistiapp.backend.repositories.TransaccionPagoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Los pasos con base de datos de anular y reembolsar entradas (8.6). Cada método es su propia transacción:
 * la llamada a Mercado Pago en el medio la hace {@link ReembolsoEntradaService}, afuera de ellas, para no
 * dejar una transacción abierta mientras se espera a un tercero.
 *
 * Anular saca la entrada de circulación (deja de valer en el escáner y de contar como vendida) y le devuelve
 * al Organizador el crédito que consumía. El lugar en la tanda NO se libera: el crédito vuelve al Organizador
 * y no se cobraría de nuevo si ese lugar se vendiera otra vez.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AnulacionEntradaService {

    private final EntradaRepository entradaRepository;
    private final EventoRepository eventoRepository;
    private final TransaccionPagoRepository transaccionPagoRepository;
    private final OrganizadorRepository organizadorRepository;
    private final CreditoLedgerService creditoLedgerService;
    private final VentaService ventaService;

    /** Lo que hace falta para mandar el mail y devolver el dinero, ya cargado: afuera de la transacción no hay sesión. */
    public record DatosEntrada(Long idEntrada, Long idEvento, Long idOrganizador, String nombreComprador,
                               String emailComprador, String nombreEvento, double precio) {}

    /** Una entrada que se puede reembolsar ahora: el pago de Mercado Pago, el monto y el turno ya reservado. */
    public record PlanReembolso(DatosEntrada entrada, Long paymentId, BigDecimal monto) {}

    public record EntradaAnulada(EntradaResponseDTO entrada, DatosEntrada datos) {}

    @Transactional
    public EntradaAnulada anular(Long idEntrada, Long idOrganizador, String motivo) {
        Entrada entrada = cargarDelOrganizador(idEntrada, idOrganizador);
        if (entrada.getEstado() == EstadoEntrada.Anulada) {
            throw new BusinessRuleException("Esta entrada ya está anulada");
        }
        if (entrada.getEstado() == EstadoEntrada.Usada) {
            throw new BusinessRuleException("Esta entrada ya se usó en la puerta: no se puede anular");
        }

        entrada.setEstado(EstadoEntrada.Anulada);
        entrada.setFechaAnulacion(LocalDateTime.now());
        entrada.setMotivoAnulacion(motivo == null || motivo.isBlank() ? null : motivo.trim());
        devolverCreditoSiCorresponde(entrada, idOrganizador);
        entradaRepository.save(entrada);

        log.info("Entrada {} anulada por el organizador {}", idEntrada, idOrganizador);
        return new EntradaAnulada(ventaService.toResponseDTOParaOrganizador(entrada), datos(entrada));
    }

    /**
     * Valida que la entrada se pueda reembolsar y toma el turno para hacerlo (nadie más puede reembolsarla
     * hasta que se complete o se libere). Se reembolsa una entrada anulada, o cualquiera de un evento cancelado.
     */
    @Transactional
    public PlanReembolso prepararReembolso(Long idEntrada, Long idOrganizador) {
        Entrada entrada = cargarDelOrganizador(idEntrada, idOrganizador);
        Evento evento = entrada.getTanda().getEvento();

        if (entrada.getIdTransaccionPago() == null || entrada.getTanda().getPrecio() == null || entrada.getTanda().getPrecio() <= 0) {
            throw new BusinessRuleException("Esta entrada no se pagó por Mercado Pago: no hay nada que reembolsar desde acá");
        }
        if (entrada.getReembolsadaEn() != null) {
            throw new BusinessRuleException("Esta entrada ya fue reembolsada");
        }
        if (entrada.getEstado() != EstadoEntrada.Anulada && evento.getEstado() != EstadoEvento.Cancelado) {
            throw new BusinessRuleException("Primero anulá la entrada para poder reembolsarla");
        }

        TransaccionPago orden = transaccionPagoRepository.findById(entrada.getIdTransaccionPago()).orElse(null);
        if (orden == null || orden.getMercadopagoPaymentId() == null) {
            throw new BusinessRuleException("No encontramos el pago de Mercado Pago de esta entrada");
        }
        Long paymentId;
        try {
            paymentId = Long.valueOf(orden.getMercadopagoPaymentId());
        } catch (NumberFormatException e) {
            throw new BusinessRuleException("No encontramos el pago de Mercado Pago de esta entrada");
        }

        if (entradaRepository.reservarReembolso(idEntrada) == 0) {
            throw new BusinessRuleException("El reembolso de esta entrada ya está en curso o ya se hizo");
        }
        // Se devuelve lo que el comprador pagó por esta entrada: el precio y, si el Organizador le trasladó la
        // comisión de Mercado Pago, el cargo por entrada que quedó fijado en la orden.
        BigDecimal monto = BigDecimal.valueOf(entrada.getTanda().getPrecio());
        if (orden.getCargoServicioUnitario() != null && orden.getCargoServicioUnitario() > 0) {
            monto = monto.add(BigDecimal.valueOf(orden.getCargoServicioUnitario()));
        }
        DatosEntrada base = datos(entrada);
        DatosEntrada conMonto = new DatosEntrada(base.idEntrada(), base.idEvento(), base.idOrganizador(), base.nombreComprador(),
                base.emailComprador(), base.nombreEvento(), monto.doubleValue());
        return new PlanReembolso(conMonto, paymentId, monto);
    }

    /** Mercado Pago no devolvió el dinero: se suelta el turno para poder reintentar. */
    @Transactional
    public void liberarReembolso(Long idEntrada) {
        entradaRepository.liberarReembolso(idEntrada);
    }

    /**
     * El dinero ya se devolvió: se deja constancia. Una entrada reembolsada queda anulada (si no lo estaba, por
     * ejemplo al cancelarse el evento) y su crédito vuelve al Organizador, salvo que ya se hubiera usado.
     */
    @Transactional
    public EntradaResponseDTO completarReembolso(Long idEntrada, Long idOrganizador) {
        Entrada entrada = entradaRepository.findById(idEntrada)
                .orElseThrow(() -> new ResourceNotFoundException("Entrada no encontrada con id: " + idEntrada));
        entrada.setReembolsadaEn(LocalDateTime.now());
        entrada.setReembolsoEnCurso(false);
        if (entrada.getEstado() == EstadoEntrada.Pagada) {
            entrada.setEstado(EstadoEntrada.Anulada);
            entrada.setFechaAnulacion(LocalDateTime.now());
            entrada.setMotivoAnulacion("Reembolsada");
        }
        if (entrada.getEstado() == EstadoEntrada.Anulada) {
            devolverCreditoSiCorresponde(entrada, idOrganizador);
        }
        entradaRepository.save(entrada);
        log.info("Entrada {} reembolsada", idEntrada);
        return ventaService.toResponseDTOParaOrganizador(entrada);
    }

    /** Las compras online de un evento a las que todavía hay que devolverles el dinero. Solo el dueño del evento. */
    @Transactional(readOnly = true)
    public List<EntradaResponseDTO> pendientesDeReembolso(Long idEvento, Long idOrganizador) {
        verificarEventoDelOrganizador(idEvento, idOrganizador);
        return entradaRepository.findPendientesDeReembolso(idEvento).stream()
                .map(ventaService::toResponseDTOParaOrganizador)
                .toList();
    }

    /** Los ids para reembolsar en bloque. Solo un evento cancelado: es lo que le da derecho a todos a su dinero. */
    @Transactional(readOnly = true)
    public List<Long> idsParaReembolsoMasivo(Long idEvento, Long idOrganizador) {
        Evento evento = verificarEventoDelOrganizador(idEvento, idOrganizador);
        if (evento.getEstado() != EstadoEvento.Cancelado) {
            throw new BusinessRuleException("Solo se pueden reembolsar todas las compras de un evento cancelado");
        }
        return entradaRepository.findPendientesDeReembolso(idEvento).stream().map(Entrada::getId).toList();
    }

    // ─────────────────────────────────────────────

    private void devolverCreditoSiCorresponde(Entrada entrada, Long idOrganizador) {
        if (entrada.isCreditoDevuelto()) {
            return;
        }
        // En un evento que ya se hizo, la entrada se puede anular y reembolsar, pero el crédito ya se usó.
        if (entrada.getTanda().getEvento().estaCerrado()) {
            return;
        }
        Organizador organizador = organizadorRepository.findById(idOrganizador)
                .orElseThrow(() -> new ResourceNotFoundException("Organizador no encontrado"));
        creditoLedgerService.registrarDevolucionTanda(organizador, 1, entrada.getTanda().getEvento().getId());
        entrada.setCreditoDevuelto(true);
    }

    private Entrada cargarDelOrganizador(Long idEntrada, Long idOrganizador) {
        Entrada entrada = entradaRepository.findById(idEntrada)
                .orElseThrow(() -> new ResourceNotFoundException("Entrada no encontrada con id: " + idEntrada));
        if (!entrada.getTanda().getEvento().getIdOrganizador().equals(idOrganizador)) {
            throw new ForbiddenActionException("Esta entrada no es de un evento tuyo");
        }
        return entrada;
    }

    private Evento verificarEventoDelOrganizador(Long idEvento, Long idOrganizador) {
        Evento evento = eventoRepository.findById(idEvento)
                .orElseThrow(() -> new ResourceNotFoundException("Evento no encontrado con id: " + idEvento));
        if (!evento.getIdOrganizador().equals(idOrganizador)) {
            throw new ForbiddenActionException("Este evento no es tuyo");
        }
        return evento;
    }

    private DatosEntrada datos(Entrada entrada) {
        Evento evento = entrada.getTanda().getEvento();
        return new DatosEntrada(entrada.getId(), evento.getId(), evento.getIdOrganizador(), entrada.getNombreComprador(),
                entrada.getEmailComprador(), evento.getNombre(), entrada.getTanda().getPrecio() == null ? 0 : entrada.getTanda().getPrecio());
    }
}
