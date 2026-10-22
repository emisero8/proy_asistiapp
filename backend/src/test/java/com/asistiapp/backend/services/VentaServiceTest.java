package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.ForbiddenActionException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.dtos.entrada.CompraOnlineRequestDTO;
import com.asistiapp.backend.models.dtos.entrada.IniciarCompraResponseDTO;
import com.asistiapp.backend.models.dtos.entrada.VentaManualRequestDTO;
import com.asistiapp.backend.models.entities.*;
import com.asistiapp.backend.models.enums.EstadoEntrada;
import com.asistiapp.backend.models.enums.EstadoEvento;
import com.asistiapp.backend.models.enums.EstadoTransaccion;
import com.asistiapp.backend.repositories.EntradaRepository;
import com.asistiapp.backend.repositories.StaffVendedorRepository;
import com.asistiapp.backend.repositories.TandaRepository;
import com.asistiapp.backend.repositories.TransaccionPagoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests del motor de ventas — el componente más crítico del sistema.
 * Se mockean los repositorios: la garantía de anti-sobreventa bajo
 * concurrencia REAL se prueba aparte en VentaServiceConcurrencyTest,
 * contra una base de datos de verdad (H2), porque acá con mocks no hay
 * forma de simular contención real entre transacciones.
 */
@ExtendWith(MockitoExtension.class)
class VentaServiceTest {

    @Mock
    private TandaRepository tandaRepository;
    @Mock
    private EntradaRepository entradaRepository;
    @Mock
    private StaffVendedorRepository staffVendedorRepository;
    @Mock
    private TransaccionPagoRepository transaccionPagoRepository;
    @Mock
    private EmailService emailService;
    @Mock
    private com.asistiapp.backend.services.ConfiguracionService configuracionService;
    @Mock
    private MercadoPagoService mercadoPagoService;

    @InjectMocks
    private VentaService ventaService;

    private Evento evento;
    private Tanda tanda;

    @BeforeEach
    void setUp() {
        evento = new Evento();
        evento.setId(1L);
        evento.setNombre("Evento de prueba");
        evento.setEstado(EstadoEvento.Publicado);
        evento.setIdOrganizador(100L);
        evento.setFechaEvento(java.time.LocalDate.now().plusDays(30));
        evento.setHoraEvento(java.time.LocalTime.of(21, 0));

        tanda = new Tanda();
        tanda.setId(10L);
        tanda.setEvento(evento);
        tanda.setNombre("General");
        tanda.setPrecio(1000.0);
        tanda.setCupoMaximo(50);
        tanda.setCupoDisponible(5);

        lenient().when(configuracionService.obtenerEntero(eq("max_entradas_por_comprador"), anyInt()))
                .thenReturn(6);
    }

    // ─────────────────────────────────────────────
    // iniciarCompraOnline
    // ─────────────────────────────────────────────

    @Test
    void iniciarCompraOnline_tandaNoEncontrada_lanzaResourceNotFoundException() {
        CompraOnlineRequestDTO dto = compraDto(99L);
        when(tandaRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> ventaService.iniciarCompraOnline(dto))
                .isInstanceOf(ResourceNotFoundException.class);

        verifyNoInteractions(transaccionPagoRepository);
    }

    @Test
    void iniciarCompraOnline_eventoNoPublicado_lanzaBusinessRuleException() {
        evento.setEstado(EstadoEvento.Borrador);
        CompraOnlineRequestDTO dto = compraDto(tanda.getId());
        when(tandaRepository.findById(tanda.getId())).thenReturn(Optional.of(tanda));

        assertThatThrownBy(() -> ventaService.iniciarCompraOnline(dto))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("no está disponible");
    }

    @Test
    void iniciarCompraOnline_eventoYaPaso_lanzaBusinessRuleException() {
        // Encontrado probando el sistema: un evento Publicado cuya fecha/hora ya pasó se
        // podía seguir comprando si la tanda no tenía su propia fechaFinVigencia configurada.
        evento.setFechaEvento(java.time.LocalDate.now().minusDays(1));
        CompraOnlineRequestDTO dto = compraDto(tanda.getId());
        when(tandaRepository.findById(tanda.getId())).thenReturn(Optional.of(tanda));

        assertThatThrownBy(() -> ventaService.iniciarCompraOnline(dto))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("ya finalizó");
    }

    @Test
    void iniciarCompraOnline_sinCupo_lanzaBusinessRuleException() {
        tanda.setCupoDisponible(0);
        CompraOnlineRequestDTO dto = compraDto(tanda.getId());
        when(tandaRepository.findById(tanda.getId())).thenReturn(Optional.of(tanda));

        assertThatThrownBy(() -> ventaService.iniciarCompraOnline(dto))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("agotada");
    }

    @Test
    void iniciarCompraOnline_creaTransaccionPendienteYDevuelveInitPoint() {
        CompraOnlineRequestDTO dto = compraDto(tanda.getId());
        dto.setCantidad(3);
        when(tandaRepository.findById(tanda.getId())).thenReturn(Optional.of(tanda));
        when(mercadoPagoService.calcularVencimiento()).thenReturn(LocalDateTime.now().plusMinutes(30));
        when(transaccionPagoRepository.save(any(TransaccionPago.class))).thenAnswer(inv -> {
            TransaccionPago t = inv.getArgument(0);
            t.setId(123L);
            t.setExternalReference("ref-uuid-123"); // lo setea @PrePersist en la base real
            return t;
        });
        when(mercadoPagoService.crearPreferencia(any()))
                .thenReturn(new MercadoPagoService.PreferenciaCreada("pref-1", "https://mp.test/init"));

        IniciarCompraResponseDTO response = ventaService.iniciarCompraOnline(dto);

        assertThat(response.getOrdenId()).isEqualTo("ref-uuid-123");
        assertThat(response.getUrlPago()).isEqualTo("https://mp.test/init");
        // Una sola orden por el total de la compra: 3 entradas × $1000.
        verify(transaccionPagoRepository).save(argThat(t ->
                t.getEstado() == EstadoTransaccion.Pendiente
                        && t.getIdTanda().equals(tanda.getId())
                        && t.getCantidad() == 3
                        && t.getMontoTotal().equals(3000.0)));
        verify(mercadoPagoService).crearPreferencia(argThat(o ->
                o.cantidad() == 3
                        && o.precioUnitario().compareTo(BigDecimal.valueOf(1000.0)) == 0
                        && o.externalReference().equals("ref-uuid-123")
                        && o.tipo().equals(MercadoPagoService.TIPO_ENTRADAS)));
        // Comprar no descuenta cupo: eso lo hace el webhook al confirmar el pago.
        verify(tandaRepository, never()).decrementarCupo(anyLong());
    }

    @Test
    void iniciarCompraOnline_cantidadMayorAlCupo_lanzaBusinessRuleException() {
        tanda.setCupoDisponible(2);
        CompraOnlineRequestDTO dto = compraDto(tanda.getId());
        dto.setCantidad(3);
        when(tandaRepository.findById(tanda.getId())).thenReturn(Optional.of(tanda));

        assertThatThrownBy(() -> ventaService.iniciarCompraOnline(dto))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Solo quedan 2");

        verifyNoInteractions(transaccionPagoRepository, mercadoPagoService);
    }

    @Test
    void iniciarCompraOnline_superaElLimitePorCompradorConLaCantidad_lanzaBusinessRuleException() {
        CompraOnlineRequestDTO dto = compraDto(tanda.getId());
        dto.setCantidad(3);
        when(tandaRepository.findById(tanda.getId())).thenReturn(Optional.of(tanda));
        // ya tiene 4 entradas y el tope es 6: 4 + 3 = 7 no entra aunque 4 < 6
        when(entradaRepository.countByEventoIdAndEmailComprador(evento.getId(), "juan@example.com"))
                .thenReturn(4L);

        assertThatThrownBy(() -> ventaService.iniciarCompraOnline(dto))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("máximo de 6");

        verifyNoInteractions(transaccionPagoRepository, mercadoPagoService);
    }

    @Test
    void iniciarCompraOnline_tandaSinPrecio_lanzaBusinessRuleException() {
        tanda.setPrecio(0.0);
        CompraOnlineRequestDTO dto = compraDto(tanda.getId());
        when(tandaRepository.findById(tanda.getId())).thenReturn(Optional.of(tanda));

        assertThatThrownBy(() -> ventaService.iniciarCompraOnline(dto))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("precio válido");

        verifyNoInteractions(transaccionPagoRepository, mercadoPagoService);
    }

    // ─────────────────────────────────────────────
    // confirmarPagoEntradas
    // ─────────────────────────────────────────────

    private static final BigDecimal MONTO_ORDEN = BigDecimal.valueOf(1000.0);

    @Test
    void confirmarPagoEntradas_ordenNoEncontrada_devuelveNoEncontrada() {
        when(transaccionPagoRepository.findByExternalReferenceForUpdate("1")).thenReturn(Optional.empty());

        var resultado = ventaService.confirmarPagoEntradas("1", 999L, MONTO_ORDEN, "ARS");

        assertThat(resultado.resultado()).isEqualTo(ResultadoPago.NO_ENCONTRADA);
    }

    @Test
    void confirmarPagoEntradas_ordenYaAprobadaConElMismoPago_esIdempotente() {
        TransaccionPago transaccion = transaccionPago(EstadoTransaccion.Aprobada);
        transaccion.setMercadopagoPaymentId("999");
        when(transaccionPagoRepository.findByExternalReferenceForUpdate("1")).thenReturn(Optional.of(transaccion));

        var resultado = ventaService.confirmarPagoEntradas("1", 999L, MONTO_ORDEN, "ARS");

        assertThat(resultado.resultado()).isEqualTo(ResultadoPago.YA_PROCESADA);
        verify(tandaRepository, never()).findByIdWithLock(anyLong());
        verify(entradaRepository, never()).save(any());
    }

    @Test
    void confirmarPagoEntradas_ordenYaAprobadaConOtroPago_esDuplicado() {
        TransaccionPago transaccion = transaccionPago(EstadoTransaccion.Aprobada);
        transaccion.setMercadopagoPaymentId("111");
        when(transaccionPagoRepository.findByExternalReferenceForUpdate("1")).thenReturn(Optional.of(transaccion));

        var resultado = ventaService.confirmarPagoEntradas("1", 999L, MONTO_ORDEN, "ARS");

        assertThat(resultado.resultado()).isEqualTo(ResultadoPago.DUPLICADO);
        verify(entradaRepository, never()).save(any());
    }

    @Test
    void confirmarPagoEntradas_montoDistinto_noEntregaNada() {
        TransaccionPago transaccion = transaccionPago(EstadoTransaccion.Pendiente);
        when(transaccionPagoRepository.findByExternalReferenceForUpdate("1")).thenReturn(Optional.of(transaccion));

        var resultado = ventaService.confirmarPagoEntradas("1", 999L, BigDecimal.valueOf(10.0), "ARS");

        assertThat(resultado.resultado()).isEqualTo(ResultadoPago.MONTO_INVALIDO);
        assertThat(transaccion.getEstado()).isEqualTo(EstadoTransaccion.Pendiente);
        verify(tandaRepository, never()).findByIdWithLock(anyLong());
        verify(entradaRepository, never()).save(any());
    }

    @Test
    void confirmarPagoEntradas_monedaDistintaDePesos_noEntregaNada() {
        TransaccionPago transaccion = transaccionPago(EstadoTransaccion.Pendiente);
        when(transaccionPagoRepository.findByExternalReferenceForUpdate("1")).thenReturn(Optional.of(transaccion));

        var resultado = ventaService.confirmarPagoEntradas("1", 999L, MONTO_ORDEN, "USD");

        assertThat(resultado.resultado()).isEqualTo(ResultadoPago.MONTO_INVALIDO);
        verify(entradaRepository, never()).save(any());
    }

    @Test
    void confirmarPagoEntradas_eventoYaNoPublicado_pideReembolso() {
        evento.setEstado(EstadoEvento.Cancelado);
        TransaccionPago transaccion = transaccionPago(EstadoTransaccion.Pendiente);
        when(transaccionPagoRepository.findByExternalReferenceForUpdate("1")).thenReturn(Optional.of(transaccion));
        when(tandaRepository.findByIdWithLock(tanda.getId())).thenReturn(Optional.of(tanda));

        var resultado = ventaService.confirmarPagoEntradas("1", 999L, MONTO_ORDEN, "ARS");

        assertThat(resultado.resultado()).isEqualTo(ResultadoPago.SIN_DISPONIBILIDAD);
        assertThat(transaccion.getEstado()).isEqualTo(EstadoTransaccion.Pendiente);
        verify(entradaRepository, never()).save(any());
    }

    @Test
    void confirmarPagoEntradas_perdioLaCarreraPorElCupo_pideReembolsoYNoCreaEntradas() {
        TransaccionPago transaccion = transaccionPago(EstadoTransaccion.Pendiente);
        transaccion.setCantidad(3);
        transaccion.setMontoTotal(3000.0);
        when(transaccionPagoRepository.findByExternalReferenceForUpdate("1")).thenReturn(Optional.of(transaccion));
        when(tandaRepository.findByIdWithLock(tanda.getId())).thenReturn(Optional.of(tanda));
        when(tandaRepository.decrementarCupo(tanda.getId(), 3)).thenReturn(0); // no alcanza para las 3

        var resultado = ventaService.confirmarPagoEntradas("1", 999L, BigDecimal.valueOf(3000.0), "ARS");

        assertThat(resultado.resultado()).isEqualTo(ResultadoPago.SIN_DISPONIBILIDAD);
        assertThat(transaccion.getEstado()).isEqualTo(EstadoTransaccion.Pendiente);
        verify(entradaRepository, never()).save(any());
    }

    @Test
    void confirmarPagoEntradas_superaElLimitePorComprador_pideReembolso() {
        TransaccionPago transaccion = transaccionPago(EstadoTransaccion.Pendiente);
        transaccion.setCantidad(3);
        transaccion.setMontoTotal(3000.0);
        when(transaccionPagoRepository.findByExternalReferenceForUpdate("1")).thenReturn(Optional.of(transaccion));
        when(tandaRepository.findByIdWithLock(tanda.getId())).thenReturn(Optional.of(tanda));
        // otra orden del mismo email se confirmó mientras tanto: 5 + 3 > 6
        when(entradaRepository.countByEventoIdAndEmailComprador(evento.getId(), "juan@example.com")).thenReturn(5L);

        var resultado = ventaService.confirmarPagoEntradas("1", 999L, BigDecimal.valueOf(3000.0), "ARS");

        assertThat(resultado.resultado()).isEqualTo(ResultadoPago.SIN_DISPONIBILIDAD);
        verify(tandaRepository, never()).decrementarCupo(anyLong(), anyInt());
        verify(entradaRepository, never()).save(any());
    }

    @Test
    void confirmarPagoEntradas_exitoso_creaUnaEntradaPorUnidadYMarcaLaOrdenAprobada() {
        TransaccionPago transaccion = transaccionPago(EstadoTransaccion.Pendiente);
        transaccion.setCantidad(3);
        transaccion.setMontoTotal(3000.0);
        when(transaccionPagoRepository.findByExternalReferenceForUpdate("1")).thenReturn(Optional.of(transaccion));
        when(tandaRepository.findByIdWithLock(tanda.getId())).thenReturn(Optional.of(tanda));
        when(tandaRepository.decrementarCupo(tanda.getId(), 3)).thenReturn(1);
        when(entradaRepository.existsByCodigoQr(any())).thenReturn(false);
        when(entradaRepository.save(any(Entrada.class))).thenAnswer(inv -> inv.getArgument(0));

        var resultado = ventaService.confirmarPagoEntradas("1", 999L, BigDecimal.valueOf(3000.0), "ARS");

        assertThat(resultado.resultado()).isEqualTo(ResultadoPago.CONFIRMADA);
        assertThat(resultado.codigosQr()).hasSize(3).doesNotHaveDuplicates().allMatch(qr -> qr.startsWith("QR-"));
        assertThat(resultado.emailComprador()).isEqualTo("juan@example.com");
        assertThat(resultado.nombreEvento()).isEqualTo("Evento de prueba");
        assertThat(transaccion.getEstado()).isEqualTo(EstadoTransaccion.Aprobada);
        assertThat(transaccion.getMercadopagoPaymentId()).isEqualTo("999");
        verify(entradaRepository, times(3)).save(argThat(e ->
                e.getEstado() == EstadoEntrada.Pagada && e.getIdTransaccionPago().equals(transaccion.getId())));
        // El mail lo manda PagoWebhookService después del commit, no este método.
        verifyNoInteractions(emailService);
    }

    // ─────────────────────────────────────────────
    // marcarOrdenReembolsada
    // ─────────────────────────────────────────────

    @Test
    void marcarOrdenReembolsada_ordenPendiente_quedaReembolsadaYDevuelveDatosParaElMail() {
        TransaccionPago transaccion = transaccionPago(EstadoTransaccion.Pendiente);
        when(transaccionPagoRepository.findByExternalReferenceForUpdate("1")).thenReturn(Optional.of(transaccion));
        when(tandaRepository.findById(tanda.getId())).thenReturn(Optional.of(tanda));

        var resultado = ventaService.marcarOrdenReembolsada("1", 999L);

        assertThat(transaccion.getEstado()).isEqualTo(EstadoTransaccion.Reembolsada);
        assertThat(transaccion.getMercadopagoPaymentId()).isEqualTo("999");
        assertThat(resultado.reembolsada()).isTrue();
        assertThat(resultado.emailComprador()).isEqualTo("juan@example.com");
        assertThat(resultado.nombreComprador()).isEqualTo("Juan Comprador");
        assertThat(resultado.nombreEvento()).isEqualTo(evento.getNombre());
    }

    @Test
    void marcarOrdenReembolsada_ordenYaEntregada_noSeTocaYNoHaceFaltaAvisar() {
        TransaccionPago transaccion = transaccionPago(EstadoTransaccion.Aprobada);
        when(transaccionPagoRepository.findByExternalReferenceForUpdate("1")).thenReturn(Optional.of(transaccion));

        var resultado = ventaService.marcarOrdenReembolsada("1", 999L);

        assertThat(transaccion.getEstado()).isEqualTo(EstadoTransaccion.Aprobada);
        assertThat(resultado.reembolsada()).isFalse();
        verify(transaccionPagoRepository, never()).save(any());
    }

    // ─────────────────────────────────────────────
    // expirarSiSigueActivaPendiente — job de vencimiento (Fase 21.6)
    // ─────────────────────────────────────────────

    @Test
    void expirarSiSigueActivaPendiente_ordenPendiente_quedaExpirada() {
        TransaccionPago transaccion = transaccionPago(EstadoTransaccion.Pendiente);
        when(transaccionPagoRepository.findByExternalReferenceForUpdate("1")).thenReturn(Optional.of(transaccion));

        ventaService.expirarSiSigueActivaPendiente("1");

        assertThat(transaccion.getEstado()).isEqualTo(EstadoTransaccion.Expirada);
    }

    @Test
    void expirarSiSigueActivaPendiente_ordenYaAprobadaPorLaReconciliacion_noSeToca() {
        TransaccionPago transaccion = transaccionPago(EstadoTransaccion.Aprobada);
        when(transaccionPagoRepository.findByExternalReferenceForUpdate("1")).thenReturn(Optional.of(transaccion));

        ventaService.expirarSiSigueActivaPendiente("1");

        assertThat(transaccion.getEstado()).isEqualTo(EstadoTransaccion.Aprobada);
        verify(transaccionPagoRepository, never()).save(any());
    }

    // ─────────────────────────────────────────────
    // realizarVentaManual
    // ─────────────────────────────────────────────

    @Test
    void realizarVentaManual_staffNoEncontrado_lanzaResourceNotFoundException() {
        when(staffVendedorRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> ventaService.realizarVentaManual(ventaManualDto(), 1L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void realizarVentaManual_sinCupo_lanzaBusinessRuleException() {
        StaffVendedor staff = new StaffVendedor();
        staff.setId(1L);
        staff.setIdOrganizador(100L);
        when(staffVendedorRepository.findById(1L)).thenReturn(Optional.of(staff));
        when(tandaRepository.findByIdWithLock(tanda.getId())).thenReturn(Optional.of(tanda));
        when(tandaRepository.decrementarCupo(tanda.getId())).thenReturn(0);

        assertThatThrownBy(() -> ventaService.realizarVentaManual(ventaManualDto(), 1L))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("agotada");
    }

    @Test
    void realizarVentaManual_exitoso_creaEntradaConCanalManual() {
        StaffVendedor staff = new StaffVendedor();
        staff.setId(1L);
        staff.setIdOrganizador(100L);
        when(staffVendedorRepository.findById(1L)).thenReturn(Optional.of(staff));
        when(tandaRepository.findByIdWithLock(tanda.getId())).thenReturn(Optional.of(tanda));
        when(tandaRepository.decrementarCupo(tanda.getId())).thenReturn(1);
        when(entradaRepository.existsByCodigoQr(any())).thenReturn(false);
        when(entradaRepository.save(any(Entrada.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = ventaService.realizarVentaManual(ventaManualDto(), 1L);

        assertThat(response.getEstado()).isEqualTo(EstadoEntrada.Pagada);
        verify(entradaRepository).save(argThat(e ->
                e.getIdStaffVendedor().equals(1L) && e.getCodigoQr() != null));
        verifyNoInteractions(emailService); // la venta manual no envía email de confirmación
    }

    // ─────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────

    private CompraOnlineRequestDTO compraDto(Long idTanda) {
        CompraOnlineRequestDTO dto = new CompraOnlineRequestDTO();
        dto.setIdTanda(idTanda);
        dto.setNombreComprador("Juan Comprador");
        dto.setEmailComprador("juan@example.com");
        return dto;
    }

    private VentaManualRequestDTO ventaManualDto() {
        VentaManualRequestDTO dto = new VentaManualRequestDTO();
        dto.setIdTanda(tanda.getId());
        dto.setNombreComprador("Cliente Manual");
        dto.setEmailComprador("manual@example.com");
        return dto;
    }

    private TransaccionPago transaccionPago(EstadoTransaccion estado) {
        TransaccionPago transaccion = new TransaccionPago();
        transaccion.setId(1L);
        transaccion.setExternalReference("1");
        transaccion.setIdTanda(tanda.getId());
        transaccion.setCantidad(1);
        transaccion.setMontoTotal(tanda.getPrecio());
        transaccion.setNombreComprador("Juan Comprador");
        transaccion.setEmailComprador("juan@example.com");
        transaccion.setEstado(estado);
        return transaccion;
    }

    // ─────────────────────────────────────────────
    // obtenerEstadoOrden — pantalla de resultado del pago
    // ─────────────────────────────────────────────

    @Test
    void obtenerEstadoOrden_aprobada_incluyeLasEntradasGeneradas() {
        TransaccionPago transaccion = transaccionPago(EstadoTransaccion.Aprobada);
        when(transaccionPagoRepository.findByExternalReference("1")).thenReturn(Optional.of(transaccion));
        when(tandaRepository.findById(tanda.getId())).thenReturn(Optional.of(tanda));
        Entrada entrada = new Entrada();
        entrada.setId(55L);
        entrada.setTanda(tanda);
        entrada.setCodigoQr("QR-1");
        when(entradaRepository.findByIdTransaccionPago(1L)).thenReturn(List.of(entrada));

        var resultado = ventaService.obtenerEstadoOrden("1");

        assertThat(resultado.getEstado()).isEqualTo(EstadoTransaccion.Aprobada);
        assertThat(resultado.getNombreEvento()).isEqualTo(evento.getNombre());
        assertThat(resultado.getEntradas()).hasSize(1);
        assertThat(resultado.getEntradas().get(0).getCodigoQr()).isEqualTo("QR-1");
    }

    @Test
    void obtenerEstadoOrden_pendiente_noConsultaEntradas() {
        TransaccionPago transaccion = transaccionPago(EstadoTransaccion.Pendiente);
        when(transaccionPagoRepository.findByExternalReference("1")).thenReturn(Optional.of(transaccion));
        when(tandaRepository.findById(tanda.getId())).thenReturn(Optional.of(tanda));

        var resultado = ventaService.obtenerEstadoOrden("1");

        assertThat(resultado.getEstado()).isEqualTo(EstadoTransaccion.Pendiente);
        assertThat(resultado.getEntradas()).isEmpty();
        verify(entradaRepository, never()).findByIdTransaccionPago(any());
    }

    @Test
    void obtenerEstadoOrden_inexistente_lanzaResourceNotFoundException() {
        when(transaccionPagoRepository.findByExternalReference("no-existe")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> ventaService.obtenerEstadoOrden("no-existe"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─────────────────────────────────────────────
    // estadoActual — para decidir si hace falta reconciliar contra MP
    // ─────────────────────────────────────────────

    @Test
    void estadoActual_ordenExistente_devuelveSuEstado() {
        when(transaccionPagoRepository.findByExternalReference("1"))
                .thenReturn(Optional.of(transaccionPago(EstadoTransaccion.Pendiente)));

        assertThat(ventaService.estadoActual("1")).contains(EstadoTransaccion.Pendiente);
    }

    @Test
    void estadoActual_ordenInexistente_devuelveVacio() {
        when(transaccionPagoRepository.findByExternalReference("no-existe")).thenReturn(Optional.empty());

        assertThat(ventaService.estadoActual("no-existe")).isEmpty();
    }
}
