package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.ForbiddenActionException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.entities.MovimientoCredito;
import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.models.entities.PaqueteCredito;
import com.asistiapp.backend.models.entities.TransaccionCredito;
import com.asistiapp.backend.models.enums.EstadoTransaccion;
import com.asistiapp.backend.repositories.OrganizadorRepository;
import com.asistiapp.backend.repositories.PaqueteCreditoRepository;
import com.asistiapp.backend.repositories.TransaccionCreditoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Confirmación de pagos de créditos (webhook de MercadoPago): acreditar una sola vez, y solo si el pago coincide. */
@ExtendWith(MockitoExtension.class)
class CreditoServiceTest {

    private static final BigDecimal MONTO = BigDecimal.valueOf(5000.0);

    @Mock
    private PaqueteCreditoRepository paqueteCreditoRepository;
    @Mock
    private OrganizadorRepository organizadorRepository;
    @Mock
    private TransaccionCreditoRepository transaccionCreditoRepository;
    @Mock
    private CreditoLedgerService creditoLedgerService;
    @Mock
    private NotificacionService notificacionService;

    @InjectMocks
    private CreditoService creditoService;

    private TransaccionCredito transaccion;
    private PaqueteCredito paquete;
    private Organizador organizador;

    @BeforeEach
    void setUp() {
        transaccion = new TransaccionCredito();
        transaccion.setId(7L);
        transaccion.setIdOrganizador(100L);
        transaccion.setIdPaquete(3L);
        transaccion.setMonto(5000.0);
        transaccion.setEstado(EstadoTransaccion.Pendiente);

        paquete = new PaqueteCredito();
        paquete.setId(3L);
        paquete.setCantidadCreditos(10);

        organizador = new Organizador();
        organizador.setId(100L);
    }

    private void ordenEncontrada() {
        when(transaccionCreditoRepository.findByExternalReferenceForUpdate("ref")).thenReturn(Optional.of(transaccion));
    }

    // ─────────────────────────────────────────────
    // obtenerEstadoOrden — pantalla de resultado del pago
    // ─────────────────────────────────────────────

    @Test
    void obtenerEstadoOrden_ordenPropia_devuelveEstadoYCantidadDeCreditos() {
        transaccion.setEstado(EstadoTransaccion.Aprobada);
        when(transaccionCreditoRepository.findByExternalReference("ref")).thenReturn(Optional.of(transaccion));
        when(paqueteCreditoRepository.findById(3L)).thenReturn(Optional.of(paquete));

        var resultado = creditoService.obtenerEstadoOrden("ref", 100L);

        assertThat(resultado.getEstado()).isEqualTo(EstadoTransaccion.Aprobada);
        assertThat(resultado.getCantidadCreditos()).isEqualTo(10);
        assertThat(resultado.getMonto()).isEqualTo(5000.0);
    }

    @Test
    void obtenerEstadoOrden_deOtroOrganizador_lanzaForbiddenActionException() {
        when(transaccionCreditoRepository.findByExternalReference("ref")).thenReturn(Optional.of(transaccion));

        assertThatThrownBy(() -> creditoService.obtenerEstadoOrden("ref", 999L))
                .isInstanceOf(ForbiddenActionException.class);
    }

    @Test
    void obtenerEstadoOrden_inexistente_lanzaResourceNotFoundException() {
        when(transaccionCreditoRepository.findByExternalReference("ref-x")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> creditoService.obtenerEstadoOrden("ref-x", 100L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─────────────────────────────────────────────
    // estadoActual — para decidir si hace falta reconciliar contra MP
    // ─────────────────────────────────────────────

    @Test
    void estadoActual_ordenExistente_devuelveSuEstado() {
        transaccion.setEstado(EstadoTransaccion.Pendiente);
        when(transaccionCreditoRepository.findByExternalReference("ref")).thenReturn(Optional.of(transaccion));

        assertThat(creditoService.estadoActual("ref")).contains(EstadoTransaccion.Pendiente);
    }

    @Test
    void estadoActual_ordenInexistente_devuelveVacio() {
        when(transaccionCreditoRepository.findByExternalReference("ref-x")).thenReturn(Optional.empty());

        assertThat(creditoService.estadoActual("ref-x")).isEmpty();
    }

    @Test
    void ordenNoEncontrada_devuelveNoEncontrada() {
        when(transaccionCreditoRepository.findByExternalReferenceForUpdate("ref")).thenReturn(Optional.empty());

        assertThat(creditoService.confirmarPagoCredito("ref", 999L, MONTO, "ARS")).isEqualTo(ResultadoPago.NO_ENCONTRADA);
    }

    @Test
    void pagoValido_acreditaLosCreditosYMarcaLaOrdenAprobada() {
        ordenEncontrada();
        when(paqueteCreditoRepository.findById(3L)).thenReturn(Optional.of(paquete));
        when(organizadorRepository.findById(100L)).thenReturn(Optional.of(organizador));
        MovimientoCredito movimiento = new MovimientoCredito();
        movimiento.setSaldoResultante(11);
        when(creditoLedgerService.registrarRecarga(organizador, 10, 7L)).thenReturn(movimiento);

        ResultadoPago resultado = creditoService.confirmarPagoCredito("ref", 999L, MONTO, "ARS");

        assertThat(resultado).isEqualTo(ResultadoPago.CONFIRMADA);
        assertThat(transaccion.getEstado()).isEqualTo(EstadoTransaccion.Aprobada);
        assertThat(transaccion.getMercadopagoPaymentId()).isEqualTo("999");
        verify(creditoLedgerService).registrarRecarga(organizador, 10, 7L);
    }

    @Test
    void notificacionRepetidaDelMismoPago_noAcreditaDeNuevo() {
        transaccion.setEstado(EstadoTransaccion.Aprobada);
        transaccion.setMercadopagoPaymentId("999");
        ordenEncontrada();

        ResultadoPago resultado = creditoService.confirmarPagoCredito("ref", 999L, MONTO, "ARS");

        assertThat(resultado).isEqualTo(ResultadoPago.YA_PROCESADA);
        verify(creditoLedgerService, never()).registrarRecarga(any(), anyInt(), anyLong());
    }

    @Test
    void otroPagoParaUnaOrdenYaAprobada_esDuplicadoYNoAcredita() {
        transaccion.setEstado(EstadoTransaccion.Aprobada);
        transaccion.setMercadopagoPaymentId("111");
        ordenEncontrada();

        ResultadoPago resultado = creditoService.confirmarPagoCredito("ref", 999L, MONTO, "ARS");

        assertThat(resultado).isEqualTo(ResultadoPago.DUPLICADO);
        verify(creditoLedgerService, never()).registrarRecarga(any(), anyInt(), anyLong());
    }

    @Test
    void montoOMonedaQueNoCoinciden_noAcreditaNada() {
        ordenEncontrada();

        assertThat(creditoService.confirmarPagoCredito("ref", 999L, BigDecimal.valueOf(1.0), "ARS"))
                .isEqualTo(ResultadoPago.MONTO_INVALIDO);
        assertThat(creditoService.confirmarPagoCredito("ref", 999L, MONTO, "USD"))
                .isEqualTo(ResultadoPago.MONTO_INVALIDO);

        assertThat(transaccion.getEstado()).isEqualTo(EstadoTransaccion.Pendiente);
        verify(creditoLedgerService, never()).registrarRecarga(any(), anyInt(), anyLong());
    }

    @Test
    void organizadorInexistente_pideReembolso() {
        ordenEncontrada();
        when(paqueteCreditoRepository.findById(3L)).thenReturn(Optional.of(paquete));
        when(organizadorRepository.findById(100L)).thenReturn(Optional.empty());

        assertThat(creditoService.confirmarPagoCredito("ref", 999L, MONTO, "ARS")).isEqualTo(ResultadoPago.SIN_DISPONIBILIDAD);
        assertThat(transaccion.getEstado()).isEqualTo(EstadoTransaccion.Pendiente);
    }

    @Test
    void marcarOrdenReembolsada_ordenPendiente_quedaReembolsadaYDevuelveDatosParaElMail() {
        organizador.setEmail("organizador@test.com");
        organizador.setNombre("Organizador Demo");
        ordenEncontrada();
        when(organizadorRepository.findById(100L)).thenReturn(Optional.of(organizador));
        when(paqueteCreditoRepository.findById(3L)).thenReturn(Optional.of(paquete));

        var resultado = creditoService.marcarOrdenReembolsada("ref", 999L);

        assertThat(transaccion.getEstado()).isEqualTo(EstadoTransaccion.Reembolsada);
        assertThat(resultado.reembolsada()).isTrue();
        assertThat(resultado.emailOrganizador()).isEqualTo("organizador@test.com");
        assertThat(resultado.nombreOrganizador()).isEqualTo("Organizador Demo");
        assertThat(resultado.cantidadCreditos()).isEqualTo(10);
    }

    @Test
    void marcarOrdenReembolsada_ordenYaAcreditada_noSeTocaYNoHaceFaltaAvisar() {
        transaccion.setEstado(EstadoTransaccion.Aprobada);
        ordenEncontrada();

        var resultado = creditoService.marcarOrdenReembolsada("ref", 999L);

        assertThat(transaccion.getEstado()).isEqualTo(EstadoTransaccion.Aprobada);
        assertThat(resultado.reembolsada()).isFalse();
    }

    // ─────────────────────────────────────────────
    // expirarSiSigueActivaPendiente — job de vencimiento (Fase 21.6)
    // ─────────────────────────────────────────────

    @Test
    void expirarSiSigueActivaPendiente_ordenPendiente_quedaExpirada() {
        ordenEncontrada();

        creditoService.expirarSiSigueActivaPendiente("ref");

        assertThat(transaccion.getEstado()).isEqualTo(EstadoTransaccion.Expirada);
    }

    @Test
    void expirarSiSigueActivaPendiente_ordenYaAprobadaPorLaReconciliacion_noSeToca() {
        transaccion.setEstado(EstadoTransaccion.Aprobada);
        ordenEncontrada();

        creditoService.expirarSiSigueActivaPendiente("ref");

        assertThat(transaccion.getEstado()).isEqualTo(EstadoTransaccion.Aprobada);
        verify(transaccionCreditoRepository, never()).save(any());
    }

    // ─────────────────────────────────────────────
    // listarCompras — historial de compras del Organizador (CU-019)
    // ─────────────────────────────────────────────

    @Test
    void listarCompras_devuelveTodasLasOrdenesEnCualquierEstado() {
        TransaccionCredito aprobada = new TransaccionCredito();
        aprobada.setExternalReference("ref-aprobada");
        aprobada.setIdPaquete(3L);
        aprobada.setMonto(5000.0);
        aprobada.setEstado(EstadoTransaccion.Aprobada);

        TransaccionCredito pendiente = new TransaccionCredito();
        pendiente.setExternalReference("ref-pendiente");
        pendiente.setIdPaquete(3L);
        pendiente.setMonto(5000.0);
        pendiente.setEstado(EstadoTransaccion.Pendiente);

        paquete.setNombre("Pack Grande");
        when(transaccionCreditoRepository.findByIdOrganizadorOrderByFechaTransaccionDesc(100L))
                .thenReturn(java.util.List.of(aprobada, pendiente));
        when(paqueteCreditoRepository.findById(3L)).thenReturn(Optional.of(paquete));

        var resultado = creditoService.listarCompras(100L);

        assertThat(resultado).hasSize(2);
        assertThat(resultado.get(0).getEstado()).isEqualTo(EstadoTransaccion.Aprobada);
        assertThat(resultado.get(0).getNombrePaquete()).isEqualTo("Pack Grande");
        assertThat(resultado.get(0).getCantidadCreditos()).isEqualTo(10);
        assertThat(resultado.get(1).getEstado()).isEqualTo(EstadoTransaccion.Pendiente);
    }

    @Test
    void listarCompras_paqueteYaNoExiste_usaNombrePorDefectoSinRomper() {
        TransaccionCredito orden = new TransaccionCredito();
        orden.setExternalReference("ref-huerfana");
        orden.setIdPaquete(999L);
        orden.setMonto(1000.0);
        orden.setEstado(EstadoTransaccion.Rechazada);

        when(transaccionCreditoRepository.findByIdOrganizadorOrderByFechaTransaccionDesc(100L))
                .thenReturn(java.util.List.of(orden));
        when(paqueteCreditoRepository.findById(999L)).thenReturn(Optional.empty());

        var resultado = creditoService.listarCompras(100L);

        assertThat(resultado).hasSize(1);
        assertThat(resultado.get(0).getNombrePaquete()).isEqualTo("Paquete eliminado");
        assertThat(resultado.get(0).getCantidadCreditos()).isNull();
    }
}
