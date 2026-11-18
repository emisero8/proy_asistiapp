package com.asistiapp.backend.services;

import com.asistiapp.backend.config.MercadoPagoConfig;
import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.PasarelaPagoException;
import com.asistiapp.backend.models.entities.CuentaMercadoPago;
import com.asistiapp.backend.models.entities.IntentoVinculacionMp;
import com.asistiapp.backend.models.enums.EstadoCuentaMp;
import com.asistiapp.backend.repositories.CuentaMercadoPagoRepository;
import com.asistiapp.backend.repositories.IntentoVinculacionMpRepository;
import com.asistiapp.backend.services.MercadoPagoOAuthClient.TokensMp;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VinculacionMercadoPagoServiceTest {

    private static final long ID_ORG = 7L;

    @Mock
    private IntentoVinculacionMpRepository intentoRepository;
    @Mock
    private CuentaMercadoPagoRepository cuentaRepository;
    @Mock
    private MercadoPagoOAuthClient oauthClient;
    @Mock
    private NotificacionService notificacionService;
    @Mock
    private MercadoPagoConfig config;

    private final TokenCifradoService cifrado = new TokenCifradoService(
            Base64.getEncoder().encodeToString(new byte[32]));

    private VinculacionMercadoPagoService servicio;

    @BeforeEach
    void setUp() {
        servicio = new VinculacionMercadoPagoService(intentoRepository, cuentaRepository, oauthClient, cifrado, notificacionService, config);
    }

    private IntentoVinculacionMp intento(String state, LocalDateTime creado) {
        IntentoVinculacionMp i = new IntentoVinculacionMp();
        i.setState(state);
        i.setIdOrganizador(ID_ORG);
        i.setCodeVerifier("verificador-" + state);
        i.setCreadoEn(creado);
        return i;
    }

    private CuentaMercadoPago cuenta(EstadoCuentaMp estado, LocalDateTime expira) {
        CuentaMercadoPago c = new CuentaMercadoPago();
        c.setId(1L);
        c.setIdOrganizador(ID_ORG);
        c.setMpUserId(555L);
        c.setAccessTokenCifrado(cifrado.cifrar("acceso-viejo"));
        c.setRefreshTokenCifrado(cifrado.cifrar("refresco-viejo"));
        c.setExpiraEn(expira);
        c.setVinculadaEn(LocalDateTime.now().minusDays(100));
        c.setEstado(estado);
        return c;
    }

    // ── Iniciar ─────────────────────────────────────────────

    @Test
    void iniciar_guardaElIntentoConStateUnicoYVerificadorYDevuelveLaUrl() {
        when(oauthClient.urlAutorizacion(anyString(), anyString())).thenReturn("https://auth.mp/authorization?x=1");

        String url = servicio.iniciar(ID_ORG);

        assertThat(url).isEqualTo("https://auth.mp/authorization?x=1");
        ArgumentCaptor<IntentoVinculacionMp> guardado = ArgumentCaptor.forClass(IntentoVinculacionMp.class);
        verify(intentoRepository).save(guardado.capture());
        IntentoVinculacionMp i = guardado.getValue();
        assertThat(i.getIdOrganizador()).isEqualTo(ID_ORG);
        assertThat(i.getState()).hasSizeGreaterThanOrEqualTo(32);
        assertThat(i.getCodeVerifier()).hasSizeBetween(43, 128);
        // El desafío que se manda es el SHA-256 del verificador guardado (PKCE S256), nunca el verificador.
        ArgumentCaptor<String> desafio = ArgumentCaptor.forClass(String.class);
        verify(oauthClient).urlAutorizacion(eq(i.getState()), desafio.capture());
        assertThat(desafio.getValue()).isNotEqualTo(i.getCodeVerifier()).hasSize(43);
    }

    @Test
    void iniciar_borraLosIntentosAnterioresDelOrganizador() {
        when(oauthClient.urlAutorizacion(anyString(), anyString())).thenReturn("u");

        servicio.iniciar(ID_ORG);

        verify(intentoRepository).deleteByIdOrganizador(ID_ORG);
    }

    @Test
    void dosIniciosDanStatesDistintos() {
        when(oauthClient.urlAutorizacion(anyString(), anyString())).thenReturn("u");

        servicio.iniciar(ID_ORG);
        servicio.iniciar(ID_ORG);

        ArgumentCaptor<IntentoVinculacionMp> guardados = ArgumentCaptor.forClass(IntentoVinculacionMp.class);
        verify(intentoRepository, org.mockito.Mockito.times(2)).save(guardados.capture());
        assertThat(guardados.getAllValues().get(0).getState()).isNotEqualTo(guardados.getAllValues().get(1).getState());
    }

    // ── Completar (retorno de Mercado Pago) ─────────────────

    @Test
    void completar_cambiaElCodigoPorTokensYLosGuardaCifrados() {
        when(intentoRepository.findById("st")).thenReturn(Optional.of(intento("st", LocalDateTime.now().minusMinutes(1))));
        when(oauthClient.intercambiarCodigo("codigo", "verificador-st"))
                .thenReturn(new TokensMp("acceso-nuevo", "refresco-nuevo", 999L, 15552000L));
        when(cuentaRepository.findByIdOrganizador(ID_ORG)).thenReturn(Optional.empty());
        when(cuentaRepository.save(any(CuentaMercadoPago.class))).thenAnswer(inv -> inv.getArgument(0));

        Long idOrg = servicio.completar("st", "codigo");

        assertThat(idOrg).isEqualTo(ID_ORG);
        ArgumentCaptor<CuentaMercadoPago> c = ArgumentCaptor.forClass(CuentaMercadoPago.class);
        verify(cuentaRepository).save(c.capture());
        CuentaMercadoPago guardada = c.getValue();
        assertThat(guardada.getIdOrganizador()).isEqualTo(ID_ORG);
        assertThat(guardada.getMpUserId()).isEqualTo(999L);
        assertThat(guardada.getEstado()).isEqualTo(EstadoCuentaMp.Vinculada);
        assertThat(guardada.getAccessTokenCifrado()).doesNotContain("acceso-nuevo");
        assertThat(cifrado.descifrar(guardada.getAccessTokenCifrado())).isEqualTo("acceso-nuevo");
        assertThat(cifrado.descifrar(guardada.getRefreshTokenCifrado())).isEqualTo("refresco-nuevo");
        assertThat(guardada.getExpiraEn()).isAfter(LocalDateTime.now().plusDays(179));
        verify(intentoRepository).delete(any(IntentoVinculacionMp.class)); // un solo uso
    }

    @Test
    void completar_siYaTeniaCuenta_laActualizaEnVezDeDuplicar() {
        CuentaMercadoPago existente = cuenta(EstadoCuentaMp.Revocada, LocalDateTime.now().minusDays(1));
        when(intentoRepository.findById("st")).thenReturn(Optional.of(intento("st", LocalDateTime.now())));
        when(oauthClient.intercambiarCodigo(anyString(), anyString())).thenReturn(new TokensMp("a", "r", 1000L, 100L));
        when(cuentaRepository.findByIdOrganizador(ID_ORG)).thenReturn(Optional.of(existente));
        when(cuentaRepository.save(any(CuentaMercadoPago.class))).thenAnswer(inv -> inv.getArgument(0));

        servicio.completar("st", "codigo");

        assertThat(existente.getEstado()).isEqualTo(EstadoCuentaMp.Vinculada);
        assertThat(existente.getMpUserId()).isEqualTo(1000L);
        verify(cuentaRepository).save(existente);
    }

    @Test
    void completar_conUnStateDesconocido_lanzaBusinessRuleExceptionYNoLlamaAMercadoPago() {
        when(intentoRepository.findById("falso")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> servicio.completar("falso", "codigo")).isInstanceOf(BusinessRuleException.class);

        org.mockito.Mockito.verifyNoInteractions(oauthClient);
        verify(cuentaRepository, never()).save(any());
    }

    @Test
    void completar_conUnIntentoVencido_lanzaBusinessRuleExceptionYLoBorra() {
        IntentoVinculacionMp viejo = intento("st", LocalDateTime.now().minusMinutes(11));
        when(intentoRepository.findById("st")).thenReturn(Optional.of(viejo));

        assertThatThrownBy(() -> servicio.completar("st", "codigo")).isInstanceOf(BusinessRuleException.class);

        verify(intentoRepository).delete(viejo);
        org.mockito.Mockito.verifyNoInteractions(oauthClient);
    }

    @Test
    void completar_siMercadoPagoRechazaElCodigo_noGuardaNadaYElIntentoYaNoSirve() {
        IntentoVinculacionMp i = intento("st", LocalDateTime.now());
        when(intentoRepository.findById("st")).thenReturn(Optional.of(i));
        when(oauthClient.intercambiarCodigo(anyString(), anyString())).thenThrow(new PasarelaPagoException("rechazado"));

        assertThatThrownBy(() -> servicio.completar("st", "codigo")).isInstanceOf(PasarelaPagoException.class);

        verify(intentoRepository).delete(i);
        verify(cuentaRepository, never()).save(any());
    }

    // ── Estado y desvincular ────────────────────────────────

    @Test
    void estado_sinCuenta_noEstaVinculada() {
        when(cuentaRepository.findByIdOrganizador(ID_ORG)).thenReturn(Optional.empty());

        var estado = servicio.estado(ID_ORG);

        assertThat(estado.isVinculada()).isFalse();
        assertThat(estado.getEstado()).isNull();
    }

    @Test
    void estado_conCuentaVinculada_traeElUsuarioDeMpYNingunToken() {
        when(cuentaRepository.findByIdOrganizador(ID_ORG)).thenReturn(Optional.of(cuenta(EstadoCuentaMp.Vinculada, LocalDateTime.now().plusDays(100))));

        var estado = servicio.estado(ID_ORG);

        assertThat(estado.isVinculada()).isTrue();
        assertThat(estado.getMpUserId()).isEqualTo(555L);
        assertThat(estado.getEstado()).isEqualTo(EstadoCuentaMp.Vinculada);
    }

    @Test
    void estado_conCuentaRevocada_noEstaVinculadaPeroSeInformaElMotivo() {
        when(cuentaRepository.findByIdOrganizador(ID_ORG)).thenReturn(Optional.of(cuenta(EstadoCuentaMp.Revocada, LocalDateTime.now())));

        var estado = servicio.estado(ID_ORG);

        assertThat(estado.isVinculada()).isFalse();
        assertThat(estado.getEstado()).isEqualTo(EstadoCuentaMp.Revocada);
    }

    @Test
    void estado_informaSiVincularEsObligatorioParaPublicar() {
        when(cuentaRepository.findByIdOrganizador(ID_ORG)).thenReturn(Optional.empty());

        when(config.isExigirCuentaVinculada()).thenReturn(true);
        assertThat(servicio.estado(ID_ORG).isObligatoria()).isTrue();

        // En desarrollo (MP_EXIGIR_CUENTA_VINCULADA=false) se publica sin cuenta: el frontend no tiene que bloquear.
        when(config.isExigirCuentaVinculada()).thenReturn(false);
        assertThat(servicio.estado(ID_ORG).isObligatoria()).isFalse();
    }

    @Test
    void desvincular_borraLaCuentaYLosTokens() {
        CuentaMercadoPago c = cuenta(EstadoCuentaMp.Vinculada, LocalDateTime.now().plusDays(100));
        when(cuentaRepository.findByIdOrganizador(ID_ORG)).thenReturn(Optional.of(c));

        servicio.desvincular(ID_ORG);

        verify(cuentaRepository).delete(c);
    }

    // ── Token para cobrar ───────────────────────────────────

    @Test
    void obtenerAccessToken_sinCuenta_pideVincular() {
        when(cuentaRepository.findByIdOrganizador(ID_ORG)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> servicio.obtenerAccessToken(ID_ORG))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Mercado Pago");
    }

    @Test
    void obtenerAccessToken_conCuentaRevocada_pideVincularDeNuevo() {
        when(cuentaRepository.findByIdOrganizador(ID_ORG)).thenReturn(Optional.of(cuenta(EstadoCuentaMp.Revocada, LocalDateTime.now().plusDays(100))));

        assertThatThrownBy(() -> servicio.obtenerAccessToken(ID_ORG)).isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void obtenerAccessToken_vigente_loDevuelveDescifradoSinRenovar() {
        when(cuentaRepository.findByIdOrganizador(ID_ORG)).thenReturn(Optional.of(cuenta(EstadoCuentaMp.Vinculada, LocalDateTime.now().plusDays(100))));

        assertThat(servicio.obtenerAccessToken(ID_ORG)).isEqualTo("acceso-viejo");

        org.mockito.Mockito.verifyNoInteractions(oauthClient);
    }

    @Test
    void obtenerAccessToken_porVencer_loRenuevaAntesDeDevolverlo() {
        CuentaMercadoPago c = cuenta(EstadoCuentaMp.Vinculada, LocalDateTime.now().plusHours(2));
        when(cuentaRepository.findByIdOrganizador(ID_ORG)).thenReturn(Optional.of(c));
        when(oauthClient.renovar("refresco-viejo")).thenReturn(new TokensMp("acceso-renovado", "refresco-renovado", 555L, 15552000L));
        when(cuentaRepository.save(any(CuentaMercadoPago.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThat(servicio.obtenerAccessToken(ID_ORG)).isEqualTo("acceso-renovado");

        // El refresh_token rota en cada renovación: se guarda el nuevo.
        assertThat(cifrado.descifrar(c.getRefreshTokenCifrado())).isEqualTo("refresco-renovado");
        assertThat(c.getExpiraEn()).isAfter(LocalDateTime.now().plusDays(179));
    }

    // ── Renovación y revocación ─────────────────────────────

    @Test
    void renovarProximosAVencer_renuevaLasQueVencenPronto() {
        CuentaMercadoPago c = cuenta(EstadoCuentaMp.Vinculada, LocalDateTime.now().plusDays(10));
        when(cuentaRepository.findByEstadoAndExpiraEnBefore(eq(EstadoCuentaMp.Vinculada), any(LocalDateTime.class))).thenReturn(List.of(c));
        when(oauthClient.renovar("refresco-viejo")).thenReturn(new TokensMp("nuevo", "refresco-nuevo", 555L, 15552000L));
        when(cuentaRepository.save(any(CuentaMercadoPago.class))).thenAnswer(inv -> inv.getArgument(0));

        int renovadas = servicio.renovarProximosAVencer();

        assertThat(renovadas).isEqualTo(1);
        assertThat(cifrado.descifrar(c.getAccessTokenCifrado())).isEqualTo("nuevo");
    }

    @Test
    void siMercadoPagoRechazaLaRenovacion_laCuentaQuedaRevocadaYSeAvisaAlOrganizador() {
        CuentaMercadoPago c = cuenta(EstadoCuentaMp.Vinculada, LocalDateTime.now().plusDays(10));
        when(cuentaRepository.findByEstadoAndExpiraEnBefore(eq(EstadoCuentaMp.Vinculada), any(LocalDateTime.class))).thenReturn(List.of(c));
        when(oauthClient.renovar(anyString())).thenThrow(new MercadoPagoOAuthClient.TokenRechazadoException("invalid_grant"));

        int renovadas = servicio.renovarProximosAVencer();

        assertThat(renovadas).isZero();
        assertThat(c.getEstado()).isEqualTo(EstadoCuentaMp.Revocada);
        verify(notificacionService).crear(eq(ID_ORG), anyString(), org.mockito.ArgumentMatchers.contains("Mercado Pago"), anyString(), any());
    }

    @Test
    void siMercadoPagoEstaCaido_noSeRevocaNadaYSeSigueConLasDemas() {
        CuentaMercadoPago c = cuenta(EstadoCuentaMp.Vinculada, LocalDateTime.now().plusDays(10));
        when(cuentaRepository.findByEstadoAndExpiraEnBefore(eq(EstadoCuentaMp.Vinculada), any(LocalDateTime.class))).thenReturn(List.of(c));
        when(oauthClient.renovar(anyString())).thenThrow(new PasarelaPagoException("caído"));

        assertThat(servicio.renovarProximosAVencer()).isZero();

        assertThat(c.getEstado()).isEqualTo(EstadoCuentaMp.Vinculada);
        org.mockito.Mockito.verifyNoInteractions(notificacionService);
    }

    @Test
    void obtenerAccessToken_siLaRenovacionEsRechazada_marcaRevocadaYPideVincularDeNuevo() {
        CuentaMercadoPago c = cuenta(EstadoCuentaMp.Vinculada, LocalDateTime.now().plusHours(1));
        when(cuentaRepository.findByIdOrganizador(ID_ORG)).thenReturn(Optional.of(c));
        when(oauthClient.renovar(anyString())).thenThrow(new MercadoPagoOAuthClient.TokenRechazadoException("invalid_grant"));

        assertThatThrownBy(() -> servicio.obtenerAccessToken(ID_ORG)).isInstanceOf(BusinessRuleException.class);

        assertThat(c.getEstado()).isEqualTo(EstadoCuentaMp.Revocada);
    }

    @Test
    void limpiarIntentosVencidos_borraLosDeMasDeDiezMinutos() {
        servicio.limpiarIntentosVencidos();

        verify(intentoRepository).deleteByCreadoEnBefore(any(LocalDateTime.class));
    }
}
