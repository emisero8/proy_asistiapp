package com.asistiapp.backend.services;

import com.asistiapp.backend.config.MercadoPagoConfig;
import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.PasarelaPagoException;
import com.asistiapp.backend.models.entities.CuentaMercadoPago;
import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.entities.Tanda;
import com.asistiapp.backend.models.entities.TransaccionPago;
import com.asistiapp.backend.models.enums.EstadoCuentaMp;
import com.asistiapp.backend.repositories.CuentaMercadoPagoRepository;
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
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** Con qué cuenta de Mercado Pago se cobra y se consulta cada cosa (8.5). */
@ExtendWith(MockitoExtension.class)
class CuentaCobroServiceTest {

    private static final Long ORG = 7L;
    private static final String REF = "ref-1";

    @Mock
    private VinculacionMercadoPagoService vinculacionService;
    @Mock
    private CuentaMercadoPagoRepository cuentaRepository;
    @Mock
    private TransaccionPagoRepository transaccionPagoRepository;
    @Mock
    private TandaRepository tandaRepository;
    @Mock
    private MercadoPagoConfig config;
    @InjectMocks
    private CuentaCobroService service;

    @BeforeEach
    void setUp() {
        lenient().when(config.isExigirCuentaVinculada()).thenReturn(true);
    }

    private CuentaMercadoPago cuenta(EstadoCuentaMp estado) {
        CuentaMercadoPago c = new CuentaMercadoPago();
        c.setIdOrganizador(ORG);
        c.setEstado(estado);
        return c;
    }

    private void ordenDelOrganizador() {
        TransaccionPago t = new TransaccionPago();
        t.setIdTanda(3L);
        Evento evento = new Evento();
        evento.setIdOrganizador(ORG);
        Tanda tanda = new Tanda();
        tanda.setEvento(evento);
        when(transaccionPagoRepository.findByExternalReference(REF)).thenReturn(Optional.of(t));
        when(tandaRepository.findById(3L)).thenReturn(Optional.of(tanda));
    }

    // ── puedeCobrar ─────────────────────────────────────────

    @Test
    void puedeCobrar_conCuentaVinculada_esTrue() {
        lenient().when(cuentaRepository.findByIdOrganizador(ORG)).thenReturn(Optional.of(cuenta(EstadoCuentaMp.Vinculada)));

        assertThat(service.puedeCobrar(ORG)).isTrue();
    }

    @Test
    void puedeCobrar_sinCuenta_oConElAccesoRevocado_esFalse() {
        lenient().when(cuentaRepository.findByIdOrganizador(ORG)).thenReturn(Optional.empty());
        assertThat(service.puedeCobrar(ORG)).isFalse();

        lenient().when(cuentaRepository.findByIdOrganizador(ORG)).thenReturn(Optional.of(cuenta(EstadoCuentaMp.Revocada)));
        assertThat(service.puedeCobrar(ORG)).isFalse();
    }

    @Test
    void puedeCobrar_conLaExigenciaApagada_esTrueSinMirarLaCuenta() {
        when(config.isExigirCuentaVinculada()).thenReturn(false);

        assertThat(service.puedeCobrar(ORG)).isTrue();
        verifyNoInteractions(cuentaRepository);
    }

    // ── tokenParaCobrar ─────────────────────────────────────

    @Test
    void tokenParaCobrar_devuelveElTokenVigenteDelOrganizador() {
        lenient().when(cuentaRepository.findByIdOrganizador(ORG)).thenReturn(Optional.of(cuenta(EstadoCuentaMp.Vinculada)));
        when(vinculacionService.obtenerAccessToken(ORG)).thenReturn("token-org");

        assertThat(service.tokenParaCobrar(ORG)).isEqualTo("token-org");
    }

    @Test
    void tokenParaCobrar_sinCuenta_aclaraAlCompradorQueElEventoNoCobraSinHablarDeTokens() {
        lenient().when(cuentaRepository.findByIdOrganizador(ORG)).thenReturn(Optional.empty());
        when(vinculacionService.obtenerAccessToken(ORG)).thenThrow(new BusinessRuleException("El organizador todavía no vinculó su cuenta"));

        assertThatThrownBy(() -> service.tokenParaCobrar(ORG))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("no puede cobrar online");
    }

    @Test
    void tokenParaCobrar_conLaExigenciaApagadaYSinCuenta_cobraConLaDeLaPlataforma() {
        when(config.isExigirCuentaVinculada()).thenReturn(false);
        lenient().when(cuentaRepository.findByIdOrganizador(ORG)).thenReturn(Optional.empty());

        assertThat(service.tokenParaCobrar(ORG)).isNull();
        verifyNoInteractions(vinculacionService);
    }

    // ── tokenParaOrden ──────────────────────────────────────

    @Test
    void tokenParaOrden_deUnaOrdenDeEntradas_esElTokenDelOrganizadorDelEvento() {
        ordenDelOrganizador();
        lenient().when(cuentaRepository.findByIdOrganizador(ORG)).thenReturn(Optional.of(cuenta(EstadoCuentaMp.Vinculada)));
        when(vinculacionService.obtenerAccessToken(ORG)).thenReturn("token-org");

        assertThat(service.tokenParaOrden(REF)).isEqualTo("token-org");
    }

    @Test
    void tokenParaOrden_deUnaOrdenQueNoEsDeEntradas_esNull_seCobraConLaPlataforma() {
        when(transaccionPagoRepository.findByExternalReference("ref-creditos")).thenReturn(Optional.empty());

        assertThat(service.tokenParaOrden("ref-creditos")).isNull();
        verifyNoInteractions(vinculacionService);
    }

    @Test
    void tokenParaOrden_siElOrganizadorPerdioElAcceso_lanzaPasarelaPagoExceptionParaQueMercadoPagoReintente() {
        ordenDelOrganizador();
        lenient().when(cuentaRepository.findByIdOrganizador(ORG)).thenReturn(Optional.of(cuenta(EstadoCuentaMp.Revocada)));
        when(vinculacionService.obtenerAccessToken(ORG)).thenThrow(new BusinessRuleException("perdió el acceso"));

        assertThatThrownBy(() -> service.tokenParaOrden(REF)).isInstanceOf(PasarelaPagoException.class);
    }

    // ── tokenParaVendedor ───────────────────────────────────

    @Test
    void tokenParaVendedor_ubicaLaCuentaPorElUsuarioDeMercadoPago() {
        when(cuentaRepository.findByMpUserId(478575150L)).thenReturn(Optional.of(cuenta(EstadoCuentaMp.Vinculada)));
        lenient().when(cuentaRepository.findByIdOrganizador(ORG)).thenReturn(Optional.of(cuenta(EstadoCuentaMp.Vinculada)));
        when(vinculacionService.obtenerAccessToken(ORG)).thenReturn("token-org");

        assertThat(service.tokenParaVendedor(478575150L)).isEqualTo("token-org");
    }

    @Test
    void tokenParaVendedor_sinVendedorOConUnoDesconocido_esNull() {
        when(cuentaRepository.findByMpUserId(1L)).thenReturn(Optional.empty());

        assertThat(service.tokenParaVendedor(null)).isNull();
        assertThat(service.tokenParaVendedor(1L)).isNull();
    }
}
