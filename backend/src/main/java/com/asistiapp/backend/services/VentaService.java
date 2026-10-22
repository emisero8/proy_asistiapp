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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Motor de ventas de entradas — el componente más crítico del sistema.
 *
 * Maneja dos flujos de venta (CU-017 y CU-019) y previene la sobreventa
 * mediante Pessimistic Locking a nivel de base de datos.
 *
 * ═══════════════════════════════════════════════════
 * FLUJO ONLINE (CU-017) — MercadoPago Checkout Pro:
 * ═══════════════════════════════════════════════════
 *   1. POST /tickets/comprar-online   → Crea una TransaccionPago Pendiente (la
 *      "orden", con su cantidad) y una Preferencia de MP; devuelve el init_point.
 *   2. POST /payments/mercadopago/webhook → MP avisa del pago; PagoWebhookService lo
 *      verifica contra la API de MP y llama a confirmarPagoEntradas(): descuenta el
 *      cupo, genera un QR y una Entrada por unidad (el mail sale después del commit).
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
    private final ConfiguracionService configuracionService;
    private final MercadoPagoService mercadoPagoService;

    private static final int TAMANO_QR_DEFAULT_PX = 300;

    /** Tope de entradas que una misma persona (email) puede comprar para un mismo evento. */
    static final String CLAVE_MAX_ENTRADAS_POR_COMPRADOR = "max_entradas_por_comprador";
    static final int MAX_ENTRADAS_POR_COMPRADOR_DEFAULT = 6;

    // ─────────────────────────────────────────────
    // FLUJO ONLINE — Paso 1: Iniciar compra
    // ─────────────────────────────────────────────

    /**
     * Inicia el proceso de compra online.
     * Valida que la tanda tenga cupo para TODA la cantidad pedida, crea una
     * TransaccionPago Pendiente (la "orden", persistida y auditable) y una
     * Preferencia de Checkout Pro en MercadoPago por el total.
     * NO descuenta cupo todavía — eso ocurre cuando el webhook confirma el pago.
     *
     * @param dto datos del comprador, la tanda y la cantidad de entradas
     * @return orden con el init_point de MercadoPago al que hay que redirigir al comprador
     */
    @Transactional
    public IniciarCompraResponseDTO iniciarCompraOnline(CompraOnlineRequestDTO dto) {
        Tanda tanda = tandaRepository.findById(dto.getIdTanda())
                .orElseThrow(() -> new ResourceNotFoundException("Tanda no encontrada con id: " + dto.getIdTanda()));

        int cantidad = dto.getCantidad();
        validarTandaDisponible(tanda, cantidad);
        validarLimitePorComprador(tanda, dto.getEmailComprador(), cantidad);

        if (tanda.getPrecio() == null || tanda.getPrecio() <= 0) {
            // MercadoPago no cobra ítems de $0; las tandas gratuitas necesitan otro circuito.
            throw new BusinessRuleException("Esta tanda no tiene un precio válido para pagar online");
        }

        TransaccionPago transaccion = new TransaccionPago();
        transaccion.setIdTanda(tanda.getId());
        transaccion.setCantidad(cantidad);
        transaccion.setMontoTotal(tanda.getPrecio() * cantidad);
        transaccion.setNombreComprador(dto.getNombreComprador());
        transaccion.setEmailComprador(dto.getEmailComprador());
        transaccion.setEstado(EstadoTransaccion.Pendiente);
        transaccion.setFechaVencimiento(mercadoPagoService.calcularVencimiento());

        TransaccionPago saved = transaccionPagoRepository.save(transaccion);

        // Si MercadoPago falla, la excepción revierte la transacción: no queda una orden huérfana.
        MercadoPagoService.PreferenciaCreada preferencia = mercadoPagoService.crearPreferencia(
                new MercadoPagoService.OrdenACobrar(
                        "tanda-" + tanda.getId(),
                        tanda.getEvento().getNombre() + " — " + tanda.getNombre(),
                        "Entrada(s) para " + tanda.getEvento().getNombre(),
                        cantidad,
                        BigDecimal.valueOf(tanda.getPrecio()),
                        saved.getExternalReference(),
                        MercadoPagoService.TIPO_ENTRADAS,
                        dto.getEmailComprador(),
                        saved.getFechaVencimiento()));

        log.info("Compra iniciada: transaccionId={}, ref={}, tanda={}, cantidad={}, comprador={}",
                saved.getId(), saved.getExternalReference(), dto.getIdTanda(), cantidad, dto.getEmailComprador());

        return IniciarCompraResponseDTO.builder()
                .ordenId(saved.getExternalReference())
                .urlPago(preferencia.initPoint())
                .mensaje("Redirigite a MercadoPago para completar tu compra.")
                .build();
    }

    // ─────────────────────────────────────────────
    // FLUJO ONLINE — Paso 2: confirmación del pago (webhook de MercadoPago)
    // ─────────────────────────────────────────────

    /** Resultado de confirmar una orden de entradas, con lo necesario para mandar el mail. */
    public record ConfirmacionEntradas(
            ResultadoPago resultado,
            List<String> codigosQr,
            String nombreComprador,
            String emailComprador,
            String nombreEvento,
            String nombreTanda) {

        static ConfirmacionEntradas sinEntradas(ResultadoPago resultado) {
            return new ConfirmacionEntradas(resultado, List.of(), null, null, null, null);
        }
    }

    @Transactional(readOnly = true)
    public boolean existeOrdenEntradas(String externalReference) {
        return transaccionPagoRepository.existsByExternalReference(externalReference);
    }

    /** Estado actual de una orden de entradas, para decidir si hace falta reconciliarla contra MP. */
    @Transactional(readOnly = true)
    public Optional<EstadoTransaccion> estadoActual(String externalReference) {
        return transaccionPagoRepository.findByExternalReference(externalReference).map(TransaccionPago::getEstado);
    }

    /**
     * Estado de una orden para la pantalla de resultado del pago. Si ya está Aprobada,
     * incluye las entradas generadas (con su QR) para que el comprador las vea sin
     * depender de que le llegue el mail.
     */
    @Transactional(readOnly = true)
    public EstadoOrdenEntradasResponseDTO obtenerEstadoOrden(String externalReference) {
        TransaccionPago transaccion = transaccionPagoRepository.findByExternalReference(externalReference)
                .orElseThrow(() -> new ResourceNotFoundException("Orden no encontrada: " + externalReference));
        Tanda tanda = tandaRepository.findById(transaccion.getIdTanda())
                .orElseThrow(() -> new ResourceNotFoundException("Tanda no encontrada"));

        List<EntradaResponseDTO> entradas = transaccion.getEstado() == EstadoTransaccion.Aprobada
                ? entradaRepository.findByIdTransaccionPago(transaccion.getId()).stream().map(this::toResponseDTO).toList()
                : List.of();

        return EstadoOrdenEntradasResponseDTO.builder()
                .estado(transaccion.getEstado())
                .cantidad(transaccion.getCantidad())
                .nombreEvento(tanda.getEvento().getNombre())
                .nombreTanda(tanda.getNombre())
                .entradas(entradas)
                .build();
    }

    /**
     * Confirma una orden de entradas cuyo pago MercadoPago ya informó como aprobado
     * (el estado, monto y moneda vienen de la API de MP, no de la notificación).
     *
     * Es idempotente: la fila de la orden se bloquea, así que notificaciones repetidas o
     * simultáneas del mismo pago se serializan y las posteriores devuelven YA_PROCESADA.
     * En un solo paso atómico descuenta el cupo de TODA la cantidad (con lock pesimista
     * sobre la tanda, anti-sobreventa) y genera una Entrada con su QR por cada unidad.
     *
     * Si el pago ya no se puede honrar (tanda agotada entre el inicio de la compra y el
     * pago, evento dado de baja, tope por comprador) no tira excepción: devuelve
     * SIN_DISPONIBILIDAD para que el llamador reembolse. No se deja la orden a medias.
     */
    @Transactional
    public ConfirmacionEntradas confirmarPagoEntradas(String externalReference, Long paymentId,
                                                      BigDecimal montoPagado, String moneda) {
        TransaccionPago transaccion = transaccionPagoRepository
                .findByExternalReferenceForUpdate(externalReference).orElse(null);
        if (transaccion == null) {
            return ConfirmacionEntradas.sinEntradas(ResultadoPago.NO_ENCONTRADA);
        }

        String idPago = paymentId.toString();

        // Idempotencia: una orden ya resuelta no se vuelve a procesar. Si el pago es otro,
        // el comprador pagó dos veces la misma orden: el segundo se devuelve.
        if (transaccion.getEstado() == EstadoTransaccion.Aprobada
                || transaccion.getEstado() == EstadoTransaccion.Reembolsada) {
            boolean mismoPago = idPago.equals(transaccion.getMercadopagoPaymentId());
            return ConfirmacionEntradas.sinEntradas(mismoPago ? ResultadoPago.YA_PROCESADA : ResultadoPago.DUPLICADO);
        }

        // El monto cobrado tiene que ser exactamente el de la orden, en pesos.
        if (!"ARS".equals(moneda) || montoPagado == null
                || montoPagado.compareTo(BigDecimal.valueOf(transaccion.getMontoTotal())) != 0) {
            log.error("Pago MP {} no coincide con la orden {}: pagado {} {}, esperado {} ARS",
                    paymentId, externalReference, montoPagado, moneda, transaccion.getMontoTotal());
            return ConfirmacionEntradas.sinEntradas(ResultadoPago.MONTO_INVALIDO);
        }

        int cantidad = transaccion.getCantidad();

        // BLOQUEO PESIMISTA de la tanda — previene sobreventa concurrente
        Tanda tanda = tandaRepository.findByIdWithLock(transaccion.getIdTanda()).orElse(null);
        if (tanda == null
                || tanda.getEvento().getEstado() != EstadoEvento.Publicado
                || excedeLimitePorComprador(tanda, transaccion.getEmailComprador(), cantidad)
                || tandaRepository.decrementarCupo(tanda.getId(), cantidad) == 0) {
            log.warn("Orden {} pagada pero no entregable (tanda agotada, evento dado de baja o tope por comprador)", externalReference);
            return ConfirmacionEntradas.sinEntradas(ResultadoPago.SIN_DISPONIBILIDAD);
        }

        transaccion.setEstado(EstadoTransaccion.Aprobada);
        transaccion.setMercadopagoPaymentId(idPago);
        transaccionPagoRepository.save(transaccion);

        List<String> codigosQr = new ArrayList<>();
        for (int i = 0; i < cantidad; i++) {
            String codigoQr = generarCodigoQrUnico();
            Entrada entrada = new Entrada();
            entrada.setTanda(tanda);
            entrada.setCodigoQr(codigoQr);
            entrada.setNombreComprador(transaccion.getNombreComprador());
            entrada.setEmailComprador(transaccion.getEmailComprador());
            entrada.setEstado(EstadoEntrada.Pagada);
            entrada.setCanalVenta(CanalVenta.Online);
            entrada.setIdTransaccionPago(transaccion.getId());
            entradaRepository.save(entrada);
            codigosQr.add(codigoQr);
        }

        log.info("Pago confirmado: orden={}, pago MP={}, {} entrada(s), evento={}",
                externalReference, paymentId, cantidad, tanda.getEvento().getNombre());

        // El mail lo manda el llamador después del commit, un solo mail con todos los QR.
        return new ConfirmacionEntradas(ResultadoPago.CONFIRMADA, codigosQr,
                transaccion.getNombreComprador(), transaccion.getEmailComprador(),
                tanda.getEvento().getNombre(), tanda.getNombre());
    }

    /** Datos para el mail de reembolso — solo tiene sentido leerlos si reembolsada() es true. */
    public record ReembolsoEntradas(boolean reembolsada, String emailComprador, String nombreComprador, String nombreEvento) {
        static final ReembolsoEntradas NO_HIZO_FALTA = new ReembolsoEntradas(false, null, null, null);
    }

    /**
     * Marca una orden como Reembolsada una vez devuelto el dinero. No toca una orden ya
     * Aprobada (esa se entregó): un reembolso manual desde el panel de MP no la revierte.
     *
     * @return si de verdad se reembolsó ahora (no si ya lo estaba), junto con los datos
     *         del comprador para que el llamador le avise por mail.
     */
    @Transactional
    public ReembolsoEntradas marcarOrdenReembolsada(String externalReference, Long paymentId) {
        TransaccionPago transaccion = transaccionPagoRepository.findByExternalReferenceForUpdate(externalReference).orElse(null);
        if (transaccion == null
                || transaccion.getEstado() == EstadoTransaccion.Aprobada
                || transaccion.getEstado() == EstadoTransaccion.Reembolsada) {
            return ReembolsoEntradas.NO_HIZO_FALTA;
        }
        transaccion.setEstado(EstadoTransaccion.Reembolsada);
        transaccion.setMercadopagoPaymentId(paymentId.toString());
        transaccionPagoRepository.save(transaccion);
        log.info("Orden {} marcada como Reembolsada (pago MP {})", externalReference, paymentId);

        String nombreEvento = tandaRepository.findById(transaccion.getIdTanda())
                .map(t -> t.getEvento().getNombre())
                .orElse("el evento");
        return new ReembolsoEntradas(true, transaccion.getEmailComprador(), transaccion.getNombreComprador(), nombreEvento);
    }

    /**
     * Vence una orden de entradas abandonada (el comprador nunca pagó o cerró la pestaña
     * de MercadoPago). Llamar siempre DESPUÉS de reconciliar: si mientras tanto se aprobó
     * el pago, la orden ya no está `Pendiente` y esto no hace nada — no se puede expirar
     * una orden que se acaba de confirmar.
     */
    @Transactional
    public void expirarSiSigueActivaPendiente(String externalReference) {
        transaccionPagoRepository.findByExternalReferenceForUpdate(externalReference).ifPresent(transaccion -> {
            if (transaccion.getEstado() != EstadoTransaccion.Pendiente) {
                return;
            }
            transaccion.setEstado(EstadoTransaccion.Expirada);
            transaccionPagoRepository.save(transaccion);
            log.info("Orden {} marcada como Expirada (venció sin pagarse)", externalReference);
        });
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

        // El vendedor solo puede vender entradas del evento que tiene asignado.
        if (staffVendedor.getIdEvento() != null
                && !tanda.getEvento().getId().equals(staffVendedor.getIdEvento())) {
            throw new ForbiddenActionException("Solo podés vender entradas para el evento que tenés asignado");
        }

        validarTandaDisponible(tanda, 1);
        validarLimitePorComprador(tanda, dto.getEmailComprador(), 1);

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
     *  - El momento actual debe caer dentro de la ventana de venta de la tanda
     *    (fecha_inicio/fin_vigencia), si es que tiene una configurada.
     *  - El cupo_disponible debe alcanzar para la cantidad pedida.
     */
    private void validarTandaDisponible(Tanda tanda, int cantidad) {
        if (tanda.getEvento().getEstado() != EstadoEvento.Publicado) {
            throw new BusinessRuleException(
                    "El evento no está disponible para la venta. " +
                    "Estado: " + tanda.getEvento().getEstado());
        }
        LocalDateTime ahora = LocalDateTime.now();
        LocalDateTime inicioEvento = LocalDateTime.of(tanda.getEvento().getFechaEvento(), tanda.getEvento().getHoraEvento());
        if (ahora.isAfter(inicioEvento)) {
            // Independiente de la vigencia propia de la tanda (que es opcional): un evento que
            // ya pasó no se puede seguir comprando, tenga o no la tanda su propia fecha de cierre.
            throw new BusinessRuleException("El evento \"" + tanda.getEvento().getNombre() + "\" ya finalizó.");
        }
        if (tanda.getFechaInicioVigencia() != null && ahora.isBefore(tanda.getFechaInicioVigencia())) {
            throw new BusinessRuleException(
                    "La venta de la tanda \"" + tanda.getNombre() + "\" todavía no está abierta.");
        }
        if (tanda.getFechaFinVigencia() != null && ahora.isAfter(tanda.getFechaFinVigencia())) {
            throw new BusinessRuleException(
                    "La venta de la tanda \"" + tanda.getNombre() + "\" ya cerró.");
        }
        if (tanda.getCupoDisponible() <= 0) {
            throw new BusinessRuleException(
                    "Lo sentimos, la tanda \"" + tanda.getNombre() + "\" está agotada");
        }
        if (tanda.getCupoDisponible() < cantidad) {
            throw new BusinessRuleException(
                    "Solo quedan " + tanda.getCupoDisponible() + " entradas en la tanda \"" + tanda.getNombre() + "\"");
        }
    }

    /**
     * Impide que una misma persona (identificada por email) supere el tope de
     * entradas configurado para un evento. El límite lo fija el Admin
     * (clave "max_entradas_por_comprador"), con un default razonable.
     */
    private void validarLimitePorComprador(Tanda tanda, String email, int cantidad) {
        if (excedeLimitePorComprador(tanda, email, cantidad)) {
            throw new BusinessRuleException(
                    "Alcanzaste el máximo de " + limitePorComprador() + " entradas por persona para este evento.");
        }
    }

    private boolean excedeLimitePorComprador(Tanda tanda, String email, int cantidad) {
        long yaCompradas = entradaRepository.countByEventoIdAndEmailComprador(
                tanda.getEvento().getId(), email);
        return yaCompradas + cantidad > limitePorComprador();
    }

    private int limitePorComprador() {
        return configuracionService.obtenerEntero(
                CLAVE_MAX_ENTRADAS_POR_COMPRADOR, MAX_ENTRADAS_POR_COMPRADOR_DEFAULT);
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

    /**
     * Consulta pública de una entrada por su codigoQr.
     * El código actúa como token de acceso — solo quien lo recibió por email puede usarlo.
     * @Transactional necesario: toResponseDTO accede a getTanda() que es lazy.
     */
    @Transactional(readOnly = true)
    public EntradaResponseDTO obtenerEntradaPorCodigoQr(String codigoQr) {
        Entrada entrada = entradaRepository.findByCodigoQr(codigoQr)
                .orElseThrow(() -> new ResourceNotFoundException("Entrada no encontrada"));
        return toResponseDTO(entrada);
    }
}
