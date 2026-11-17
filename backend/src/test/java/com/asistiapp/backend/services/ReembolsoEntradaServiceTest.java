package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.PasarelaPagoException;
import com.asistiapp.backend.models.dtos.entrada.EntradaResponseDTO;
import com.asistiapp.backend.models.enums.CanalVenta;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Orquestación de anular y reembolsar (8.6): el dinero sale de la cuenta del Organizador, con su token, y un
 * fallo de Mercado Pago nunca deja un reembolso a medias ni permite devolver el dinero dos veces.
 */
@ExtendWith(MockitoExtension.class)
class ReembolsoEntradaServiceTest {

    private static final Long ORG = 7L;
    private static final Long ID = 50L;

    @Mock
    private AnulacionEntradaService anulacionService;
    @Mock
    private MercadoPagoService mercadoPagoService;
    @Mock
    private CuentaCobroService cuentaCobroService;
    @Mock
    private EmailService emailService;
    @InjectMocks
    private ReembolsoEntradaService service;

    private AnulacionEntradaService.DatosEntrada datos;

    @BeforeEach
    void setUp() {
        datos = new AnulacionEntradaService.DatosEntrada(ID, 3L, ORG, "Juan", "juan@mail.com", "Recital", 1500);
    }

    private EntradaResponseDTO dto(CanalVenta canal, double precio) {
        return EntradaResponseDTO.builder().id(ID).canalVenta(canal).precioTanda(precio).build();
    }

    private void anulacionOk(CanalVenta canal, double precio) {
        when(anulacionService.anular(ID, ORG, "motivo"))
                .thenReturn(new AnulacionEntradaService.EntradaAnulada(dto(canal, precio), datos));
    }

    private void reembolsoPreparado() {
        when(cuentaCobroService.tokenParaReembolsar(ORG)).thenReturn("token-org");
        when(anulacionService.prepararReembolso(ID, ORG))
                .thenReturn(new AnulacionEntradaService.PlanReembolso(datos, 12345L, BigDecimal.valueOf(1500)));
        org.mockito.Mockito.lenient().when(anulacionService.completarReembolso(ID, ORG)).thenReturn(dto(CanalVenta.Online, 1500));
    }

    // ── reembolsar ──────────────────────────────────────────

    @Test
    void reembolsar_devuelveElDineroConElTokenDelOrganizadorYAvisaAlComprador() {
        reembolsoPreparado();

        service.reembolsar(ID, ORG);

        verify(mercadoPagoService).reembolsarParcial(12345L, BigDecimal.valueOf(1500), "token-org");
        verify(anulacionService).completarReembolso(ID, ORG);
        verify(emailService).enviarNotificacionReembolsoOrganizador("juan@mail.com", "Juan", "Recital", 1500);
    }

    @Test
    void reembolsar_sinCuentaVinculada_sueltaElTurnoYNoTocaMercadoPago() {
        when(cuentaCobroService.tokenParaReembolsar(ORG)).thenThrow(new BusinessRuleException("vinculala de nuevo"));
        when(anulacionService.prepararReembolso(ID, ORG))
                .thenReturn(new AnulacionEntradaService.PlanReembolso(datos, 12345L, BigDecimal.valueOf(1500)));

        assertThatThrownBy(() -> service.reembolsar(ID, ORG)).isInstanceOf(BusinessRuleException.class);

        verify(anulacionService).liberarReembolso(ID);
        verifyNoInteractions(mercadoPagoService, emailService);
    }

    @Test
    void reembolsar_deUnaEntradaQueNoSePuedeReembolsar_avisaSinPedirLaCuentaNiTocarNada() {
        when(anulacionService.prepararReembolso(ID, ORG)).thenThrow(new BusinessRuleException("no se pagó por Mercado Pago"));

        assertThatThrownBy(() -> service.reembolsar(ID, ORG)).isInstanceOf(BusinessRuleException.class);

        verifyNoInteractions(cuentaCobroService, mercadoPagoService, emailService);
    }

    @Test
    void reembolsar_siMercadoPagoFalla_sueltaElTurnoParaReintentarYNoDejaConstanciaNiAvisa() {
        reembolsoPreparado();
        doThrow(new PasarelaPagoException("saldo insuficiente")).when(mercadoPagoService)
                .reembolsarParcial(anyLong(), any(), anyString());

        assertThatThrownBy(() -> service.reembolsar(ID, ORG)).isInstanceOf(PasarelaPagoException.class);

        verify(anulacionService).liberarReembolso(ID);
        verify(anulacionService, never()).completarReembolso(anyLong(), anyLong());
        verifyNoInteractions(emailService);
    }

    @Test
    void reembolsar_siElDineroSalioPeroNoSePudoDejarConstancia_noSueltaElTurnoParaNoDevolverDosVeces() {
        reembolsoPreparado();
        when(anulacionService.completarReembolso(ID, ORG)).thenThrow(new IllegalStateException("base caída"));

        assertThatThrownBy(() -> service.reembolsar(ID, ORG)).isInstanceOf(IllegalStateException.class);

        verify(anulacionService, never()).liberarReembolso(anyLong());
    }

    @Test
    void reembolsar_primeroTomaElTurno_despuesPideAMercadoPago_yReciénAhoraDejaConstancia() {
        reembolsoPreparado();

        service.reembolsar(ID, ORG);

        InOrder orden = inOrder(anulacionService, mercadoPagoService);
        orden.verify(anulacionService).prepararReembolso(ID, ORG);
        orden.verify(mercadoPagoService).reembolsarParcial(anyLong(), any(), anyString());
        orden.verify(anulacionService).completarReembolso(ID, ORG);
    }

    // ── anular ──────────────────────────────────────────────

    @Test
    void anular_sinReembolso_anulaYAvisaAlCompradorSinTocarMercadoPago() {
        anulacionOk(CanalVenta.Online, 1500);

        var resultado = service.anular(ID, ORG, "motivo", false);

        assertThat(resultado.isReembolsada()).isFalse();
        verify(emailService).enviarNotificacionEntradaAnulada("juan@mail.com", "Juan", "Recital");
        verifyNoInteractions(mercadoPagoService);
    }

    @Test
    void anular_conReembolso_anulaYDevuelveElDinero() {
        anulacionOk(CanalVenta.Online, 1500);
        reembolsoPreparado();

        var resultado = service.anular(ID, ORG, "motivo", true);

        assertThat(resultado.isReembolsada()).isTrue();
        assertThat(resultado.getAvisoReembolso()).isNull();
        verify(mercadoPagoService).reembolsarParcial(12345L, BigDecimal.valueOf(1500), "token-org");
    }

    @Test
    void anular_conReembolsoQueFalla_laEntradaQuedaAnuladaYSeAvisaPorQueNoSeReembolso() {
        anulacionOk(CanalVenta.Online, 1500);
        reembolsoPreparado();
        doThrow(new PasarelaPagoException("Mercado Pago no pudo devolver el dinero")).when(mercadoPagoService)
                .reembolsarParcial(anyLong(), any(), anyString());

        var resultado = service.anular(ID, ORG, "motivo", true);

        assertThat(resultado.isReembolsada()).isFalse();
        assertThat(resultado.getAvisoReembolso()).contains("no pudo devolver");
        assertThat(resultado.getEntrada()).isNotNull();
        verify(anulacionService).liberarReembolso(ID);
    }

    @Test
    void anular_conReembolsoPedidoEnUnaEntradaManual_soloAnula_noHayNadaQueReembolsar() {
        anulacionOk(CanalVenta.Manual, 1500);

        var resultado = service.anular(ID, ORG, "motivo", true);

        assertThat(resultado.isReembolsada()).isFalse();
        assertThat(resultado.getAvisoReembolso()).isNull();
        verifyNoInteractions(mercadoPagoService);
    }

    @Test
    void anular_siLaAnulacionFalla_nuncaIntentaReembolsarNiAvisa() {
        when(anulacionService.anular(ID, ORG, "motivo")).thenThrow(new BusinessRuleException("ya se usó"));

        assertThatThrownBy(() -> service.anular(ID, ORG, "motivo", true)).isInstanceOf(BusinessRuleException.class);

        verifyNoInteractions(mercadoPagoService, emailService, cuentaCobroService);
    }

    // ── reembolsarTodo ──────────────────────────────────────

    @Test
    void reembolsarTodo_reembolsaCadaCompraYInformaElTotal() {
        when(anulacionService.idsParaReembolsoMasivo(3L, ORG)).thenReturn(List.of(ID, 51L));
        when(cuentaCobroService.tokenParaReembolsar(ORG)).thenReturn("token-org");
        for (Long id : List.of(ID, 51L)) {
            var d = new AnulacionEntradaService.DatosEntrada(id, 3L, ORG, "Comprador " + id, "c" + id + "@mail.com", "Recital", 1500);
            when(anulacionService.prepararReembolso(id, ORG))
                    .thenReturn(new AnulacionEntradaService.PlanReembolso(d, 100L + id, BigDecimal.valueOf(1500)));
            when(anulacionService.completarReembolso(id, ORG)).thenReturn(dto(CanalVenta.Online, 1500));
        }

        var resultado = service.reembolsarTodo(3L, ORG);

        assertThat(resultado.getReembolsadas()).isEqualTo(2);
        assertThat(resultado.getMontoReembolsado()).isEqualTo(3000.0);
        assertThat(resultado.getFallidas()).isEmpty();
        verify(emailService, org.mockito.Mockito.times(2)).enviarNotificacionReembolsoOrganizador(anyString(), anyString(), anyString(), anyDouble());
    }

    @Test
    void reembolsarTodo_siUnaFalla_siguenLasDemasYLaFallidaQuedaEnLaLista() {
        when(anulacionService.idsParaReembolsoMasivo(3L, ORG)).thenReturn(List.of(ID, 51L));
        when(cuentaCobroService.tokenParaReembolsar(ORG)).thenReturn("token-org");
        var d1 = new AnulacionEntradaService.DatosEntrada(ID, 3L, ORG, "Juan", "juan@mail.com", "Recital", 1500);
        var d2 = new AnulacionEntradaService.DatosEntrada(51L, 3L, ORG, "Ana", "ana@mail.com", "Recital", 1500);
        when(anulacionService.prepararReembolso(ID, ORG)).thenReturn(new AnulacionEntradaService.PlanReembolso(d1, 111L, BigDecimal.valueOf(1500)));
        when(anulacionService.prepararReembolso(51L, ORG)).thenReturn(new AnulacionEntradaService.PlanReembolso(d2, 222L, BigDecimal.valueOf(1500)));
        doThrow(new PasarelaPagoException("Mercado Pago no pudo devolver el dinero (por ejemplo, por saldo insuficiente en tu cuenta)"))
                .when(mercadoPagoService).reembolsarParcial(eq(111L), any(), anyString());
        when(anulacionService.completarReembolso(51L, ORG)).thenReturn(dto(CanalVenta.Online, 1500));

        var resultado = service.reembolsarTodo(3L, ORG);

        assertThat(resultado.getReembolsadas()).isEqualTo(1);
        assertThat(resultado.getMontoReembolsado()).isEqualTo(1500.0);
        assertThat(resultado.getFallidas()).hasSize(1);
        assertThat(resultado.getFallidas().get(0).getIdEntrada()).isEqualTo(ID);
        assertThat(resultado.getFallidas().get(0).getMotivo()).contains("saldo insuficiente");
        verify(anulacionService).liberarReembolso(ID);
    }

    @Test
    void reembolsarTodo_sinNadaPendiente_noPideTokenNiTocaMercadoPago() {
        when(anulacionService.idsParaReembolsoMasivo(3L, ORG)).thenReturn(List.of());

        var resultado = service.reembolsarTodo(3L, ORG);

        assertThat(resultado.getReembolsadas()).isZero();
        verifyNoInteractions(cuentaCobroService, mercadoPagoService);
    }

    @Test
    void reembolsarTodo_deUnEventoQueNoEstaCancelado_lanzaBusinessRuleException() {
        when(anulacionService.idsParaReembolsoMasivo(3L, ORG)).thenThrow(new BusinessRuleException("Solo se pueden reembolsar todas las compras de un evento cancelado"));

        assertThatThrownBy(() -> service.reembolsarTodo(3L, ORG)).isInstanceOf(BusinessRuleException.class);
        verifyNoInteractions(mercadoPagoService);
    }
}
