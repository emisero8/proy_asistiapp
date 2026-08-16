package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.ForbiddenActionException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.dtos.entrada.*;
import com.asistiapp.backend.models.entities.Entrada;
import com.asistiapp.backend.models.entities.StaffVendedor;
import com.asistiapp.backend.models.entities.Tanda;
import com.asistiapp.backend.models.entities.TransaccionPago;
import com.asistiapp.backend.models.enums.CanalVenta;
import com.asistiapp.backend.models.enums.EstadoEntrada;
import com.asistiapp.backend.models.enums.EstadoEvento;
import com.asistiapp.backend.models.enums.EstadoTransaccion;
import com.asistiapp.backend.repositories.EntradaRepository;
import com.asistiapp.backend.repositories.StaffVendedorRepository;
import com.asistiapp.backend.repositories.TandaRepository;
import com.asistiapp.backend.repositories.TransaccionPagoRepository;
import com.asistiapp.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Motor de ventas de entradas — el componente más crítico del sistema.
 *
 * Maneja dos flujos de venta (CU-017 y CU-019) y previene la sobreventa
 * mediante Pessimistic Locking a nivel de base de datos.
 *
 * ═══════════════════════════════════════════════════
 * FLUJO ONLINE (CU-017) — Simulación MercadoPago:
 * ═══════════════════════════════════════════════════
 *   1. POST /tickets/comprar-online   → Crea una TransaccionPago en estado
 *      Pendiente (la "orden") y devuelve una URL de pago simulada.
 *   2. POST /tickets/webhook/pago     → Simula el IPN de MercadoPago.
 *      Confirma el pago, genera QR, crea Entrada en BD y envía email.
 *
 * ═══════════════════════════════════════════════════
 * FLUJO MANUAL (CU-019) — Staff Vendedor:
 * ═══════════════════════════════════════════════════
 *   POST /tickets/venta-manual        → Genera QR y crea Entrada directamente.
 *
 * ═══════════════════════════════════════════════════
 * ANTI-SOBREVENTA — Pessimistic Locking:
 * ═══════════════════════════════════════════════════
 *   Se usa TandaRepository.findByIdWithLock() que aplica
 *   SELECT ... FOR UPDATE en PostgreSQL, bloqueando la fila
 *   durante toda la transacción para que ninguna otra compra
 *   concurrente pueda leer un cupo_disponible desactualizado.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VentaService {

    private final TandaRepository tandaRepository;
    private final EntradaRepository entradaRepository;
    private final StaffVendedorRepository staffVendedorRepository;
    private final TransaccionPagoRepository transaccionPagoRepository;
    private final EmailService emailService;
    private final QrImageService qrImageService;
    private final SecurityUtils securityUtils;

    private static final int TAMANO_QR_DEFAULT_PX = 300;

    // ─────────────────────────────────────────────
    // FLUJO ONLINE — Paso 1: Iniciar compra
    // ─────────────────────────────────────────────

    /**
     * Inicia el proceso de compra online.
     * Valida que la tanda tenga cupo y crea una TransaccionPago Pendiente —
     * es la "orden" en sí, persistida (no en memoria), así que sobrevive a
     * un reinicio del backend y queda auditable.
     * NO descuenta cupo todavía — eso ocurre al confirmar el pago.
     *
     * @param dto datos del comprador y la tanda
     * @return orden con URL de pago simulada para redirigir al comprador
     */
    @Transactional
    public IniciarCompraResponseDTO iniciarCompraOnline(CompraOnlineRequestDTO dto) {
        Tanda tanda = tandaRepository.findById(dto.getIdTanda())
                .orElseThrow(() -> new ResourceNotFoundException("Tanda no encontrada con id: " + dto.getIdTanda()));

        validarTandaDisponible(tanda);

        TransaccionPago transaccion = new TransaccionPago();
        transaccion.setIdTanda(tanda.getId());
        transaccion.setMontoTotal(tanda.getPrecio());
        transaccion.setNombreComprador(dto.getNombreComprador());
        transaccion.setEmailComprador(dto.getEmailComprador());
        transaccion.setEstado(EstadoTransaccion.Pendiente);

        TransaccionPago saved = transaccionPagoRepository.save(transaccion);

        log.info("Compra iniciada: transaccionId={}, tanda={}, comprador={}",
                saved.getId(), dto.getIdTanda(), dto.getEmailComprador());

        return IniciarCompraResponseDTO.builder()
                .ordenId(saved.getId().toString())
                .urlPago("https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=" + saved.getId())
                .mensaje("Redirigite a MercadoPago para completar tu compra. Tu orden: " + saved.getId())
                .build();
    }

    // ─────────────────────────────────────────────
    // FLUJO ONLINE — Paso 2: Webhook / IPN simulado
    // ─────────────────────────────────────────────

    /**
     * Simula el webhook IPN de MercadoPago confirmando el pago.
     *
     * En producción real:
     *  - MercadoPago envía un POST a este endpoint con el payment_id.
     *  - Se verifica la autenticidad del webhook con la firma del header X-Signature.
     *  - Se consulta a la API de MP para confirmar el estado del pago.
     *
     * En esta simulación:
     *  - El cliente manda el ordenId (id de la TransaccionPago) para simular la confirmación.
     *  - Se descuenta el cupo con Pessimistic Lock.
     *  - Se genera el QR y se crea la Entrada en BD.
     *  - Se envía el email de forma asíncrona.
     *
     * @param ordenId  ID de la TransaccionPago generada en iniciarCompraOnline()
     * @param paymentId ID simulado de la transacción de MercadoPago
     * @return entrada generada con su código QR
     */
    @Transactional
    public EntradaResponseDTO confirmarPagoWebhook(String ordenId, Long paymentId) {
        TransaccionPago transaccion = transaccionPagoRepository.findById(Long.valueOf(ordenId))
                .orElseThrow(() -> new BusinessRuleException("Orden de pago no encontrada: " + ordenId));

        if (transaccion.getEstado() != EstadoTransaccion.Pendiente) {
            throw new BusinessRuleException("Esta orden ya fue procesada: " + ordenId);
        }

        // Obtener la tanda con BLOQUEO PESIMISTA — previene sobreventa concurrente
        Tanda tanda = tandaRepository.findByIdWithLock(transaccion.getIdTanda())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Tanda no encontrada: " + transaccion.getIdTanda()));

        validarTandaDisponible(tanda);

        // Decrementar cupo de forma atómica
        int filasActualizadas = tandaRepository.decrementarCupo(tanda.getId());
        if (filasActualizadas == 0) {
            // Race condition: justo antes de esta tx otra agotó el último cupo
            throw new BusinessRuleException("Lo sentimos, la tanda se agotó mientras procesabas el pago");
        }

        // Marcar la transacción de pago como aprobada
        transaccion.setEstado(EstadoTransaccion.Aprobada);
        transaccion.setMercadopagoPaymentId(paymentId.toString());
        transaccionPagoRepository.save(transaccion);

        // Generar la entrada
        String codigoQr = generarCodigoQrUnico();
        Entrada entrada = new Entrada();
        entrada.setTanda(tanda);
        entrada.setCodigoQr(codigoQr);
        entrada.setNombreComprador(transaccion.getNombreComprador());
        entrada.setEmailComprador(transaccion.getEmailComprador());
        entrada.setEstado(EstadoEntrada.Pagada);
        entrada.setCanalVenta(CanalVenta.Online);
        entrada.setIdTransaccionPago(transaccion.getId());

        Entrada saved = entradaRepository.save(entrada);

        log.info("Pago confirmado y entrada generada: id={}, qr={}, evento={}",
                saved.getId(), codigoQr, tanda.getEvento().getNombre());

        // Enviar email de forma asíncrona (no bloquea la respuesta)
        emailService.enviarConfirmacionCompra(
                saved.getEmailComprador(),
                saved.getNombreComprador(),
                tanda.getEvento().getNombre(),
                tanda.getNombre(),
                codigoQr
        );

        return toResponseDTO(saved);
    }

    // ─────────────────────────────────────────────
    // VENTA MANUAL (CU-019) — Staff Vendedor
    // ─────────────────────────────────────────────

    /**
     * Registra una venta manual realizada por el Staff Vendedor (CU-019).
     * Bypasea MercadoPago: genera QR y marca como Pagada de forma inmediata.
     * Usa Pessimistic Lock para garantizar anti-sobreventa igual que el flujo online.
     *
     * @param dto        datos del comprador y la tanda
     * @param idStaffVendedor ID del Staff Vendedor autenticado
     * @return entrada generada con su código QR
     */
    @Transactional
    public EntradaResponseDTO realizarVentaManual(VentaManualRequestDTO dto, Long idStaffVendedor) {
        // Verificar que el staff vendedor existe
        StaffVendedor staffVendedor = staffVendedorRepository.findById(idStaffVendedor)
                .orElseThrow(() -> new ResourceNotFoundException("Staff Vendedor no encontrado"));

        // Obtener la tanda con BLOQUEO PESIMISTA
        Tanda tanda = tandaRepository.findByIdWithLock(dto.getIdTanda())
                .orElseThrow(() -> new ResourceNotFoundException("Tanda no encontrada con id: " + dto.getIdTanda()));

        // El vendedor solo puede vender entradas de eventos de SU organizador —
        // sin esto, cualquier Staff_Vendedor podía vender para el evento de otro
        // organizador con solo adivinar/conocer un idTanda ajeno.
        if (!tanda.getEvento().getIdOrganizador().equals(staffVendedor.getIdOrganizador())) {
            throw new ForbiddenActionException("Esta tanda no pertenece a un evento de tu organizador");
        }

        validarTandaDisponible(tanda);

        // Decrementar cupo de forma atómica
        int filasActualizadas = tandaRepository.decrementarCupo(tanda.getId());
        if (filasActualizadas == 0) {
            throw new BusinessRuleException("Tanda agotada — no hay cupo disponible");
        }

        // Generar la entrada manualmente
        String codigoQr = generarCodigoQrUnico();
        Entrada entrada = new Entrada();
        entrada.setTanda(tanda);
        entrada.setCodigoQr(codigoQr);
        entrada.setNombreComprador(dto.getNombreComprador());
        entrada.setEmailComprador(dto.getEmailComprador());
        entrada.setEstado(EstadoEntrada.Pagada);
        entrada.setCanalVenta(CanalVenta.Manual);
        entrada.setIdStaffVendedor(idStaffVendedor);

        Entrada saved = entradaRepository.save(entrada);

        log.info("Venta manual registrada: id={}, qr={}, staff={}, evento={}",
                saved.getId(), codigoQr, idStaffVendedor, tanda.getEvento().getNombre());

        return toResponseDTO(saved);
    }

    // ─────────────────────────────────────────────
    // Consultas
    // ─────────────────────────────────────────────

    /** Lista todas las entradas de un evento (para reporte del Organizador). */
    @Transactional(readOnly = true)
    public List<EntradaResponseDTO> listarEntradasPorEvento(Long idEvento) {
        return entradaRepository.findByEventoId(idEvento)
                .stream()
                .map(this::toResponseDTO)
                .toList();
    }

    /**
     * Genera la imagen PNG del QR de una entrada (Fase 16).
     *
     * Acceso permitido a dos perfiles, sin exigir que el comprador tenga JWT
     * (nunca lo tiene, CU-015/016/017):
     *  - Quien conoce el codigoQr exacto de la entrada (lo recibió por email) —
     *    lo manda como query param y se compara contra el de BD.
     *  - El Organizador dueño del evento al que pertenece la entrada, autenticado por JWT.
     *
     * @param idEntrada       ID de la entrada
     * @param codigoQrParam   codigo_qr recibido por query param (puede ser null si el
     *                        request viene con JWT de Organizador en su lugar)
     */
    @Transactional(readOnly = true)
    public byte[] obtenerImagenQr(Long idEntrada, String codigoQrParam) {
        Entrada entrada = entradaRepository.findById(idEntrada)
                .orElseThrow(() -> new ResourceNotFoundException("Entrada no encontrada con id: " + idEntrada));

        boolean tieneCodigoQrCorrecto = codigoQrParam != null && codigoQrParam.equals(entrada.getCodigoQr());
        boolean esOrganizadorDueno = esOrganizadorDuenoDelEvento(entrada);

        if (!tieneCodigoQrCorrecto && !esOrganizadorDueno) {
            throw new ForbiddenActionException("No tenés permiso para ver el QR de esta entrada");
        }

        return qrImageService.generarPng(entrada.getCodigoQr(), TAMANO_QR_DEFAULT_PX);
    }

    private boolean esOrganizadorDuenoDelEvento(Entrada entrada) {
        try {
            Long idOrganizadorAutenticado = securityUtils.getOrganizadorAutenticado().getId();
            return idOrganizadorAutenticado.equals(entrada.getTanda().getEvento().getIdOrganizador());
        } catch (Exception e) {
            // No autenticado, autenticado con otro rol, o el organizador no existe:
            // ninguno de esos casos habilita el acceso por esta vía.
            return false;
        }
    }

    // ─────────────────────────────────────────────
    // Helpers privados
    // ─────────────────────────────────────────────

    /**
     * Valida que la tanda esté disponible para la venta:
     *  - El evento debe estar Publicado.
     *  - El cupo_disponible debe ser > 0.
     */
    private void validarTandaDisponible(Tanda tanda) {
        if (tanda.getEvento().getEstado() != EstadoEvento.Publicado) {
            throw new BusinessRuleException(
                    "El evento no está disponible para la venta. " +
                    "Estado: " + tanda.getEvento().getEstado());
        }
        if (tanda.getCupoDisponible() <= 0) {
            throw new BusinessRuleException(
                    "Lo sentimos, la tanda \"" + tanda.getNombre() + "\" está agotada");
        }
    }

    /**
     * Genera un código QR único usando UUID + timestamp para garantizar unicidad.
     * En producción se podría usar un QR real con librería como ZXing.
     */
    private String generarCodigoQrUnico() {
        String codigoQr;
        do {
            codigoQr = "QR-" + UUID.randomUUID().toString().replace("-", "").toUpperCase();
        } while (entradaRepository.existsByCodigoQr(codigoQr));
        return codigoQr;
    }

    private EntradaResponseDTO toResponseDTO(Entrada entrada) {
        Tanda tanda = entrada.getTanda();
        return EntradaResponseDTO.builder()
                .id(entrada.getId())
                .idTanda(tanda.getId())
                .idEvento(tanda.getEvento().getId())
                .nombreEvento(tanda.getEvento().getNombre())
                .nombreTanda(tanda.getNombre())
                .precioTanda(tanda.getPrecio())
                .codigoQr(entrada.getCodigoQr())
                .nombreComprador(entrada.getNombreComprador())
                .emailComprador(entrada.getEmailComprador())
                .estado(entrada.getEstado())
                .canalVenta(entrada.getCanalVenta())
                .fechaCompra(entrada.getFechaCompra())
                .fechaUso(entrada.getFechaUso())
                .build();
    }
}
