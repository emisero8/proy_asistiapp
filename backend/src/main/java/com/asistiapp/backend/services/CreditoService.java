package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.dtos.credito.IniciarCompraCreditoRequestDTO;
import com.asistiapp.backend.models.dtos.credito.IniciarCompraCreditoResponseDTO;
import com.asistiapp.backend.models.dtos.credito.MovimientoCreditoResponseDTO;
import com.asistiapp.backend.models.dtos.credito.PaqueteCreditoDisponibleDTO;
import com.asistiapp.backend.models.entities.MovimientoCredito;
import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.models.entities.PaqueteCredito;
import com.asistiapp.backend.models.entities.TransaccionCredito;
import com.asistiapp.backend.models.enums.EstadoPaquete;
import com.asistiapp.backend.models.enums.EstadoTransaccion;
import com.asistiapp.backend.repositories.OrganizadorRepository;
import com.asistiapp.backend.repositories.PaqueteCreditoRepository;
import com.asistiapp.backend.repositories.MovimientoCreditoRepository;
import com.asistiapp.backend.repositories.TransaccionCreditoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Compra de créditos por parte del Organizador (CU-013, CU-014).
 *
 * A diferencia de VentaService, la "orden pendiente" no vive en memoria:
 * es directamente la TransaccionCredito en estado Pendiente, así que
 * sobrevive a un reinicio del backend y es consultable/auditable.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CreditoService {

    private final PaqueteCreditoRepository paqueteCreditoRepository;
    private final OrganizadorRepository organizadorRepository;
    private final TransaccionCreditoRepository transaccionCreditoRepository;
    private final MovimientoCreditoRepository movimientoCreditoRepository;
    private final CreditoLedgerService creditoLedgerService;

    @Transactional
    public IniciarCompraCreditoResponseDTO iniciarCompraCredito(IniciarCompraCreditoRequestDTO dto, Long idOrganizador) {
        PaqueteCredito paquete = paqueteCreditoRepository.findById(dto.getIdPaquete())
                .orElseThrow(() -> new ResourceNotFoundException("Paquete de crédito no encontrado con id: " + dto.getIdPaquete()));

        if (paquete.getEstado() != EstadoPaquete.Activo) {
            throw new BusinessRuleException("El paquete de créditos seleccionado no está disponible");
        }

        organizadorRepository.findById(idOrganizador)
                .orElseThrow(() -> new ResourceNotFoundException("Organizador no encontrado"));

        TransaccionCredito transaccion = new TransaccionCredito();
        transaccion.setIdOrganizador(idOrganizador);
        transaccion.setIdPaquete(paquete.getId());
        transaccion.setMonto(paquete.getPrecio());
        transaccion.setEstado(EstadoTransaccion.Pendiente);

        TransaccionCredito saved = transaccionCreditoRepository.save(transaccion);
        log.info("Compra de créditos iniciada: transaccionId={}, organizador={}, paquete={}",
                saved.getId(), idOrganizador, paquete.getNombre());

        return IniciarCompraCreditoResponseDTO.builder()
                .ordenId(saved.getId())
                .urlPago("https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=" + saved.getId())
                .mensaje("Redirigite a MercadoPago para completar tu compra de créditos")
                .build();
    }

    /**
     * Simula el webhook IPN de MercadoPago confirmando el pago de créditos —
     * mismo patrón que VentaService.confirmarPagoWebhook().
     *
     * DEUDA TÉCNICA: en producción real, antes de confiar en este body hay
     * que validar la firma del header X-Signature contra la API de
     * MercadoPago. Hoy cualquiera que conozca el idTransaccion puede
     * "confirmar" un pago que nunca ocurrió — aceptable mientras el flujo
     * de pago siga simulado, bloqueante si se conecta el SDK real.
     */
    @Transactional
    public MovimientoCreditoResponseDTO confirmarPagoWebhook(Long idTransaccion, Long paymentId) {
        TransaccionCredito transaccion = transaccionCreditoRepository.findById(idTransaccion)
                .orElseThrow(() -> new ResourceNotFoundException("Transacción de crédito no encontrada: " + idTransaccion));

        if (transaccion.getEstado() != EstadoTransaccion.Pendiente) {
            throw new BusinessRuleException("Esta transacción ya fue procesada");
        }

        PaqueteCredito paquete = paqueteCreditoRepository.findById(transaccion.getIdPaquete())
                .orElseThrow(() -> new ResourceNotFoundException("Paquete de crédito no encontrado"));

        Organizador organizador = organizadorRepository.findById(transaccion.getIdOrganizador())
                .orElseThrow(() -> new ResourceNotFoundException("Organizador no encontrado"));

        transaccion.setEstado(EstadoTransaccion.Aprobada);
        transaccion.setMercadopagoPaymentId(paymentId.toString());
        transaccionCreditoRepository.save(transaccion);

        MovimientoCredito movimiento = creditoLedgerService.registrarRecarga(
                organizador, paquete.getCantidadCreditos(), transaccion.getId());

        log.info("Créditos acreditados: organizador={}, cantidad={}, saldoResultante={}",
                organizador.getId(), paquete.getCantidadCreditos(), movimiento.getSaldoResultante());

        return toResponseDTO(movimiento);
    }

    /** Catálogo de paquetes que el Organizador puede comprar — solo los que el Admin dejó Activos. */
    @Transactional(readOnly = true)
    public List<PaqueteCreditoDisponibleDTO> listarPaquetesDisponibles() {
        return paqueteCreditoRepository.findByEstado(EstadoPaquete.Activo)
                .stream()
                .map(p -> PaqueteCreditoDisponibleDTO.builder()
                        .id(p.getId())
                        .nombre(p.getNombre())
                        .cantidadCreditos(p.getCantidadCreditos())
                        .precio(p.getPrecio())
                        .build())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MovimientoCreditoResponseDTO> listarHistorial(Long idOrganizador) {
        return movimientoCreditoRepository.findByIdOrganizadorOrderByFechaMovimientoDesc(idOrganizador)
                .stream()
                .map(this::toResponseDTO)
                .toList();
    }

    private MovimientoCreditoResponseDTO toResponseDTO(MovimientoCredito movimiento) {
        return MovimientoCreditoResponseDTO.builder()
                .id(movimiento.getId())
                .tipoMovimiento(movimiento.getTipoMovimiento())
                .monto(movimiento.getMonto())
                .saldoResultante(movimiento.getSaldoResultante())
                .fechaMovimiento(movimiento.getFechaMovimiento())
                .idTransaccionCredito(movimiento.getIdTransaccionCredito())
                .idEvento(movimiento.getIdEvento())
                .build();
    }
}
