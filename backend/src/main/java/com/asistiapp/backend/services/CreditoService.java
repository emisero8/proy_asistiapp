package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.ForbiddenActionException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.dtos.credito.CreditosResumenResponseDTO;
import com.asistiapp.backend.models.dtos.credito.EstadoOrdenCreditoResponseDTO;
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

import java.math.BigDecimal;
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
    private final ConfiguracionService configuracionService;
    private final MercadoPagoService mercadoPagoService;

    /** Clave de configuración (Admin) y default del costo en créditos de publicar un evento. */
    public static final String CLAVE_CREDITOS_POR_PUBLICACION = "creditos_por_publicacion";
    public static final int CREDITOS_POR_PUBLICACION_DEFAULT = 1;

    /** Créditos que cuesta publicar un evento (configurable por el Admin). */
    public int obtenerCostoPublicacion() {
        return configuracionService.obtenerEntero(CLAVE_CREDITOS_POR_PUBLICACION, CREDITOS_POR_PUBLICACION_DEFAULT);
    }

    /**
     * Créditos que el Organizador puede usar para entradas de tandas. Se reserva el costo de
     * publicar: si las tandas agotaran el saldo, el evento no podría publicarse después.
     */
    public int creditosDisponiblesParaEntradas(Organizador organizador) {
        return Math.max(0, organizador.getSaldoCreditos() - obtenerCostoPublicacion());
    }

    /** Resumen para el Dashboard y el armado de tandas: saldo, costo de publicar y disponible para entradas. */
    @Transactional(readOnly = true)
    public CreditosResumenResponseDTO obtenerResumen(Long idOrganizador) {
        Organizador organizador = organizadorRepository.findById(idOrganizador)
                .orElseThrow(() -> new ResourceNotFoundException("Organizador no encontrado"));
        int costo = obtenerCostoPublicacion();
        return new CreditosResumenResponseDTO(
                organizador.getSaldoCreditos(),
                costo,
                creditosDisponiblesParaEntradas(organizador));
    }

    @Transactional
    public IniciarCompraCreditoResponseDTO iniciarCompraCredito(IniciarCompraCreditoRequestDTO dto, Long idOrganizador) {
        PaqueteCredito paquete = paqueteCreditoRepository.findById(dto.getIdPaquete())
                .orElseThrow(() -> new ResourceNotFoundException("Paquete de crédito no encontrado con id: " + dto.getIdPaquete()));

        if (paquete.getEstado() != EstadoPaquete.Activo) {
            throw new BusinessRuleException("El paquete de créditos seleccionado no está disponible");
        }

        Organizador organizador = organizadorRepository.findById(idOrganizador)
                .orElseThrow(() -> new ResourceNotFoundException("Organizador no encontrado"));

        TransaccionCredito transaccion = new TransaccionCredito();
        transaccion.setIdOrganizador(idOrganizador);
        transaccion.setIdPaquete(paquete.getId());
        transaccion.setMonto(paquete.getPrecio());
        transaccion.setEstado(EstadoTransaccion.Pendiente);
        transaccion.setFechaVencimiento(mercadoPagoService.calcularVencimiento());

        TransaccionCredito saved = transaccionCreditoRepository.save(transaccion);

        // Si MercadoPago falla, la excepción revierte la transacción: no queda una orden huérfana.
        MercadoPagoService.PreferenciaCreada preferencia = mercadoPagoService.crearPreferencia(
                new MercadoPagoService.OrdenACobrar(
                        "paquete-" + paquete.getId(),
                        paquete.getCantidadCreditos() + " créditos AsistíAPP — Pack " + paquete.getNombre(),
                        "Recarga de créditos para publicar eventos",
                        1,
                        BigDecimal.valueOf(paquete.getPrecio()),
                        saved.getExternalReference(),
                        MercadoPagoService.TIPO_CREDITOS,
                        organizador.getEmail(),
                        saved.getFechaVencimiento()));

        log.info("Compra de créditos iniciada: transaccionId={}, ref={}, organizador={}, paquete={}",
                saved.getId(), saved.getExternalReference(), idOrganizador, paquete.getNombre());

        return IniciarCompraCreditoResponseDTO.builder()
                .ordenId(saved.getExternalReference())
                .urlPago(preferencia.initPoint())
                .mensaje("Redirigite a MercadoPago para completar tu compra de créditos")
                .build();
    }

    @Transactional(readOnly = true)
    public boolean existeOrdenCredito(String externalReference) {
        return transaccionCreditoRepository.existsByExternalReference(externalReference);
    }

    /** Estado de una orden de créditos para la pantalla de resultado del pago. */
    @Transactional(readOnly = true)
    public EstadoOrdenCreditoResponseDTO obtenerEstadoOrden(String externalReference, Long idOrganizador) {
        TransaccionCredito transaccion = transaccionCreditoRepository.findByExternalReference(externalReference)
                .orElseThrow(() -> new ResourceNotFoundException("Orden no encontrada: " + externalReference));
        if (!transaccion.getIdOrganizador().equals(idOrganizador)) {
            throw new ForbiddenActionException("No tenés permiso para ver esta orden");
        }

        Integer cantidadCreditos = paqueteCreditoRepository.findById(transaccion.getIdPaquete())
                .map(PaqueteCredito::getCantidadCreditos)
                .orElse(null);

        return EstadoOrdenCreditoResponseDTO.builder()
                .estado(transaccion.getEstado())
                .cantidadCreditos(cantidadCreditos)
                .monto(transaccion.getMonto())
                .build();
    }

    /**
     * Acredita los créditos de una orden cuyo pago MercadoPago ya informó como aprobado
     * (estado, monto y moneda vienen de la API de MP, no de la notificación).
     *
     * Idempotente: la fila de la orden se bloquea, así que notificaciones repetidas o
     * simultáneas del mismo pago se serializan y las posteriores devuelven YA_PROCESADA —
     * los créditos se acreditan una sola vez.
     */
    @Transactional
    public ResultadoPago confirmarPagoCredito(String externalReference, Long paymentId,
                                              BigDecimal montoPagado, String moneda) {
        TransaccionCredito transaccion = transaccionCreditoRepository
                .findByExternalReferenceForUpdate(externalReference).orElse(null);
        if (transaccion == null) {
            return ResultadoPago.NO_ENCONTRADA;
        }

        String idPago = paymentId.toString();
        if (transaccion.getEstado() == EstadoTransaccion.Aprobada
                || transaccion.getEstado() == EstadoTransaccion.Reembolsada) {
            return idPago.equals(transaccion.getMercadopagoPaymentId())
                    ? ResultadoPago.YA_PROCESADA : ResultadoPago.DUPLICADO;
        }

        if (!"ARS".equals(moneda) || montoPagado == null
                || montoPagado.compareTo(BigDecimal.valueOf(transaccion.getMonto())) != 0) {
            log.error("Pago MP {} no coincide con la orden de créditos {}: pagado {} {}, esperado {} ARS",
                    paymentId, externalReference, montoPagado, moneda, transaccion.getMonto());
            return ResultadoPago.MONTO_INVALIDO;
        }

        PaqueteCredito paquete = paqueteCreditoRepository.findById(transaccion.getIdPaquete()).orElse(null);
        Organizador organizador = organizadorRepository.findById(transaccion.getIdOrganizador()).orElse(null);
        if (paquete == null || organizador == null) {
            log.warn("Orden de créditos {} pagada pero sin paquete u organizador: no acreditable", externalReference);
            return ResultadoPago.SIN_DISPONIBILIDAD;
        }

        transaccion.setEstado(EstadoTransaccion.Aprobada);
        transaccion.setMercadopagoPaymentId(idPago);
        transaccionCreditoRepository.save(transaccion);

        MovimientoCredito movimiento = creditoLedgerService.registrarRecarga(
                organizador, paquete.getCantidadCreditos(), transaccion.getId());

        log.info("Créditos acreditados: organizador={}, cantidad={}, saldoResultante={}, pago MP={}",
                organizador.getId(), paquete.getCantidadCreditos(), movimiento.getSaldoResultante(), paymentId);

        return ResultadoPago.CONFIRMADA;
    }

    /** Marca una orden de créditos como Reembolsada una vez devuelto el dinero (no toca una ya Aprobada). */
    @Transactional
    public void marcarOrdenReembolsada(String externalReference, Long paymentId) {
        transaccionCreditoRepository.findByExternalReferenceForUpdate(externalReference).ifPresent(transaccion -> {
            if (transaccion.getEstado() == EstadoTransaccion.Aprobada
                    || transaccion.getEstado() == EstadoTransaccion.Reembolsada) {
                return;
            }
            transaccion.setEstado(EstadoTransaccion.Reembolsada);
            transaccion.setMercadopagoPaymentId(paymentId.toString());
            transaccionCreditoRepository.save(transaccion);
            log.info("Orden de créditos {} marcada como Reembolsada (pago MP {})", externalReference, paymentId);
        });
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
