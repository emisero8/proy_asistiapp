package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.BusinessRuleException;
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

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
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

        tanda = new Tanda();
        tanda.setId(10L);
        tanda.setEvento(evento);
        tanda.setNombre("General");
        tanda.setPrecio(1000.0);
        tanda.setCupoMaximo(50);
        tanda.setCupoDisponible(5);
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
    void iniciarCompraOnline_sinCupo_lanzaBusinessRuleException() {
        tanda.setCupoDisponible(0);
        CompraOnlineRequestDTO dto = compraDto(tanda.getId());
        when(tandaRepository.findById(tanda.getId())).thenReturn(Optional.of(tanda));

        assertThatThrownBy(() -> ventaService.iniciarCompraOnline(dto))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("agotada");
    }

    @Test
    void iniciarCompraOnline_creaTransaccionPendienteYDevuelveOrdenId() {
        CompraOnlineRequestDTO dto = compraDto(tanda.getId());
        when(tandaRepository.findById(tanda.getId())).thenReturn(Optional.of(tanda));
        when(transaccionPagoRepository.save(any(TransaccionPago.class))).thenAnswer(inv -> {
            TransaccionPago t = inv.getArgument(0);
            t.setId(123L);
            return t;
        });

        IniciarCompraResponseDTO response = ventaService.iniciarCompraOnline(dto);

        assertThat(response.getOrdenId()).isEqualTo("123");
        verify(transaccionPagoRepository).save(argThat(t ->
                t.getEstado() == EstadoTransaccion.Pendiente
                        && t.getIdTanda().equals(tanda.getId())
                        && t.getMontoTotal().equals(tanda.getPrecio())));
    }

    // ─────────────────────────────────────────────
    // confirmarPagoWebhook
    // ─────────────────────────────────────────────

    @Test
    void confirmarPagoWebhook_ordenNoEncontrada_lanzaBusinessRuleException() {
        when(transaccionPagoRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> ventaService.confirmarPagoWebhook("1", 999L))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("no encontrada");
    }

    @Test
    void confirmarPagoWebhook_ordenYaProcesada_lanzaBusinessRuleException() {
        TransaccionPago transaccion = transaccionPago(EstadoTransaccion.Aprobada);
        when(transaccionPagoRepository.findById(1L)).thenReturn(Optional.of(transaccion));

        assertThatThrownBy(() -> ventaService.confirmarPagoWebhook("1", 999L))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("ya fue procesada");

        verify(tandaRepository, never()).findByIdWithLock(anyLong());
    }

    @Test
    void confirmarPagoWebhook_perdioLaCarreraPorElCupo_lanzaBusinessRuleException() {
        TransaccionPago transaccion = transaccionPago(EstadoTransaccion.Pendiente);
        when(transaccionPagoRepository.findById(1L)).thenReturn(Optional.of(transaccion));
        when(tandaRepository.findByIdWithLock(tanda.getId())).thenReturn(Optional.of(tanda));
        when(tandaRepository.decrementarCupo(tanda.getId())).thenReturn(0); // otra tx se quedó con el último cupo

        assertThatThrownBy(() -> ventaService.confirmarPagoWebhook("1", 999L))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("agotó");

        verify(entradaRepository, never()).save(any());
    }

    @Test
    void confirmarPagoWebhook_exitoso_creaEntradaYMarcaTransaccionAprobada() {
        TransaccionPago transaccion = transaccionPago(EstadoTransaccion.Pendiente);
        when(transaccionPagoRepository.findById(1L)).thenReturn(Optional.of(transaccion));
        when(tandaRepository.findByIdWithLock(tanda.getId())).thenReturn(Optional.of(tanda));
        when(tandaRepository.decrementarCupo(tanda.getId())).thenReturn(1);
        when(entradaRepository.existsByCodigoQr(any())).thenReturn(false);
        when(entradaRepository.save(any(Entrada.class))).thenAnswer(inv -> {
            Entrada e = inv.getArgument(0);
            e.setId(555L);
            return e;
        });

        var response = ventaService.confirmarPagoWebhook("1", 999L);

        assertThat(response.getId()).isEqualTo(555L);
        assertThat(response.getCodigoQr()).startsWith("QR-");
        assertThat(transaccion.getEstado()).isEqualTo(EstadoTransaccion.Aprobada);
        assertThat(transaccion.getMercadopagoPaymentId()).isEqualTo("999");
        verify(emailService).enviarConfirmacionCompra(
                eq(transaccion.getEmailComprador()), eq(transaccion.getNombreComprador()), any(), any(), any());
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
        transaccion.setIdTanda(tanda.getId());
        transaccion.setMontoTotal(tanda.getPrecio());
        transaccion.setNombreComprador("Juan Comprador");
        transaccion.setEmailComprador("juan@example.com");
        transaccion.setEstado(estado);
        return transaccion;
    }
}
