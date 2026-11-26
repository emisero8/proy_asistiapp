package com.asistiapp.backend.services;

import com.asistiapp.backend.config.MercadoPagoConfig;
import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.PasarelaPagoException;
import com.asistiapp.backend.models.dtos.mercadopago.EstadoCuentaMpResponseDTO;
import com.asistiapp.backend.models.entities.CuentaMercadoPago;
import com.asistiapp.backend.models.entities.IntentoVinculacionMp;
import com.asistiapp.backend.models.enums.EstadoCuentaMp;
import com.asistiapp.backend.repositories.CuentaMercadoPagoRepository;
import com.asistiapp.backend.repositories.IntentoVinculacionMpRepository;
import com.asistiapp.backend.services.MercadoPagoOAuthClient.TokenRechazadoException;
import com.asistiapp.backend.services.MercadoPagoOAuthClient.TokensMp;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

/**
 * Cuenta de Mercado Pago de cada Organizador (8.4): vinculación por OAuth, estado, renovación del token y manejo
 * de acceso revocado. El dinero de las entradas cae en esa cuenta, así que 8.5 cobra con el token que da
 * {@link #obtenerAccessToken(Long)}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VinculacionMercadoPagoService {

    /** Lo que dura el código de autorización en Mercado Pago. */
    static final int MINUTOS_VIGENCIA_INTENTO = 10;
    /** Un token que vence en menos de esto se renueva antes de usarlo. */
    static final int HORAS_RENOVAR_AL_USAR = 24;
    /** El job renueva los tokens que vencen dentro de este plazo (el access_token dura 180 días). */
    static final int DIAS_RENOVAR_POR_ADELANTADO = 30;

    private final IntentoVinculacionMpRepository intentoRepository;
    private final CuentaMercadoPagoRepository cuentaRepository;
    private final MercadoPagoOAuthClient oauthClient;
    private final TokenCifradoService tokenCifradoService;
    private final NotificacionService notificacionService;
    private final MercadoPagoConfig config;

    private final SecureRandom random = new SecureRandom();

    // ─────────────────────────────────────────────
    // Vincular
    // ─────────────────────────────────────────────

    /** Arranca una vinculación: guarda el intento (state único + verificador PKCE) y devuelve la URL de Mercado Pago. */
    @Transactional
    public String iniciar(Long idOrganizador) {
        // Un solo intento abierto por Organizador: el anterior, si seguía ahí, ya no sirve.
        intentoRepository.deleteByIdOrganizador(idOrganizador);

        String state = aleatorioUrlSafe();
        String verificador = aleatorioUrlSafe();

        IntentoVinculacionMp intento = new IntentoVinculacionMp();
        intento.setState(state);
        intento.setIdOrganizador(idOrganizador);
        intento.setCodeVerifier(verificador);
        intento.setCreadoEn(LocalDateTime.now());
        intentoRepository.save(intento);

        return oauthClient.urlAutorizacion(state, desafioS256(verificador));
    }

    /**
     * Cierra la vinculación cuando Mercado Pago vuelve con el código. El intento es de un solo uso: se borra antes
     * de hablar con Mercado Pago, así un state repetido o robado no se puede reusar.
     * No es transaccional a propósito: el borrado tiene que quedar aunque el intercambio falle.
     *
     * @return el Organizador que quedó vinculado
     */
    @com.asistiapp.backend.security.audit.Auditable(accion = "VINCULAR_MP", entidad = "CuentaMercadoPago")
    public Long completar(String state, String code) {
        IntentoVinculacionMp intento = intentoRepository.findById(state)
                .orElseThrow(() -> new BusinessRuleException("El pedido de vinculación no existe o ya se usó. Volvé a intentarlo."));
        intentoRepository.delete(intento);
        if (intento.getCreadoEn().isBefore(LocalDateTime.now().minusMinutes(MINUTOS_VIGENCIA_INTENTO))) {
            throw new BusinessRuleException("El pedido de vinculación venció. Volvé a intentarlo.");
        }

        TokensMp tokens = oauthClient.intercambiarCodigo(code, intento.getCodeVerifier());

        CuentaMercadoPago cuenta = cuentaRepository.findByIdOrganizador(intento.getIdOrganizador())
                .orElseGet(CuentaMercadoPago::new);
        cuenta.setIdOrganizador(intento.getIdOrganizador());
        cuenta.setVinculadaEn(LocalDateTime.now());
        cuenta.setEstado(EstadoCuentaMp.Vinculada);
        guardarTokens(cuenta, tokens);
        cuentaRepository.save(cuenta);
        // La vuelta de Mercado Pago llega sin sesión: el emisor es el Organizador que inició la vinculación.
        com.asistiapp.backend.security.audit.AuditoriaContexto.emisor(intento.getIdOrganizador());
        com.asistiapp.backend.security.audit.AuditoriaContexto.objetivo(cuenta.getId(), "Cuenta de Mercado Pago");
        com.asistiapp.backend.security.audit.AuditoriaContexto.detalle("Usuario de Mercado Pago: " + tokens.userId());
        log.info("Organizador id={} vinculó su cuenta de Mercado Pago (user_id={})", intento.getIdOrganizador(), tokens.userId());
        return intento.getIdOrganizador();
    }

    // ─────────────────────────────────────────────
    // Estado y desvinculación
    // ─────────────────────────────────────────────

    @Transactional(readOnly = true)
    public EstadoCuentaMpResponseDTO estado(Long idOrganizador) {
        boolean obligatoria = config.isExigirCuentaVinculada();
        return cuentaRepository.findByIdOrganizador(idOrganizador)
                .map(c -> EstadoCuentaMpResponseDTO.builder()
                        .vinculada(c.getEstado() == EstadoCuentaMp.Vinculada)
                        .estado(c.getEstado())
                        .mpUserId(c.getMpUserId())
                        .vinculadaEn(c.getVinculadaEn())
                        .obligatoria(obligatoria)
                        .build())
                .orElseGet(() -> EstadoCuentaMpResponseDTO.builder().vinculada(false).obligatoria(obligatoria).build());
    }

    /** Borra los tokens guardados. El acceso de la aplicación también se puede quitar desde la cuenta de Mercado Pago. */
    @Transactional
    @com.asistiapp.backend.security.audit.Auditable(accion = "DESVINCULAR_MP", entidad = "CuentaMercadoPago")
    public void desvincular(Long idOrganizador) {
        cuentaRepository.findByIdOrganizador(idOrganizador).ifPresent(cuenta -> {
            com.asistiapp.backend.security.audit.AuditoriaContexto.objetivo(cuenta.getId(), "Cuenta de Mercado Pago");
            com.asistiapp.backend.security.audit.AuditoriaContexto.detalle("Usuario de Mercado Pago: " + cuenta.getMpUserId());
            com.asistiapp.backend.security.audit.AuditoriaContexto.detalle("Se borraron los tokens guardados.");
            cuentaRepository.delete(cuenta);
            log.info("Organizador id={} desvinculó su cuenta de Mercado Pago", idOrganizador);
        });
    }

    // ─────────────────────────────────────────────
    // Token para cobrar
    // ─────────────────────────────────────────────

    /** Access token vigente del Organizador, renovándolo si está por vencer. Lo usa el cobro (8.5). */
    public String obtenerAccessToken(Long idOrganizador) {
        CuentaMercadoPago cuenta = cuentaRepository.findByIdOrganizador(idOrganizador)
                .orElseThrow(() -> new BusinessRuleException(
                        "El organizador todavía no vinculó su cuenta de Mercado Pago."));
        if (cuenta.getEstado() != EstadoCuentaMp.Vinculada) {
            throw new BusinessRuleException(
                    "La cuenta de Mercado Pago del organizador perdió el acceso: tiene que volver a vincularla.");
        }
        if (cuenta.getExpiraEn().isBefore(LocalDateTime.now().plusHours(HORAS_RENOVAR_AL_USAR))) {
            try {
                renovar(cuenta);
            } catch (TokenRechazadoException e) {
                marcarRevocada(cuenta);
                throw new BusinessRuleException(
                        "La cuenta de Mercado Pago del organizador perdió el acceso: tiene que volver a vincularla.");
            }
        }
        return tokenCifradoService.descifrar(cuenta.getAccessTokenCifrado());
    }

    /** Renueva los tokens que vencen pronto. Una falla de Mercado Pago no revoca nada: se reintenta en la próxima pasada. */
    public int renovarProximosAVencer() {
        int renovadas = 0;
        for (CuentaMercadoPago cuenta : cuentaRepository.findByEstadoAndExpiraEnBefore(
                EstadoCuentaMp.Vinculada, LocalDateTime.now().plusDays(DIAS_RENOVAR_POR_ADELANTADO))) {
            try {
                renovar(cuenta);
                renovadas++;
            } catch (TokenRechazadoException e) {
                marcarRevocada(cuenta);
            } catch (PasarelaPagoException e) {
                log.warn("No se pudo renovar el token de Mercado Pago del organizador id={}; se reintenta luego",
                        cuenta.getIdOrganizador());
            }
        }
        return renovadas;
    }

    @Transactional
    public void limpiarIntentosVencidos() {
        intentoRepository.deleteByCreadoEnBefore(LocalDateTime.now().minusMinutes(MINUTOS_VIGENCIA_INTENTO));
    }

    // ─────────────────────────────────────────────
    // Internos
    // ─────────────────────────────────────────────

    private void renovar(CuentaMercadoPago cuenta) {
        TokensMp tokens = oauthClient.renovar(tokenCifradoService.descifrar(cuenta.getRefreshTokenCifrado()));
        guardarTokens(cuenta, tokens);
        cuentaRepository.save(cuenta);
    }

    /** El refresh_token rota en cada renovación: siempre se guarda el nuevo. */
    private void guardarTokens(CuentaMercadoPago cuenta, TokensMp tokens) {
        cuenta.setAccessTokenCifrado(tokenCifradoService.cifrar(tokens.accessToken()));
        cuenta.setRefreshTokenCifrado(tokenCifradoService.cifrar(tokens.refreshToken()));
        if (tokens.userId() != null) {
            cuenta.setMpUserId(tokens.userId());
        }
        cuenta.setExpiraEn(LocalDateTime.now().plusSeconds(tokens.expiresInSegundos()));
    }

    private void marcarRevocada(CuentaMercadoPago cuenta) {
        cuenta.setEstado(EstadoCuentaMp.Revocada);
        cuentaRepository.save(cuenta);
        log.warn("Mercado Pago rechazó el acceso del organizador id={}: cuenta marcada como revocada", cuenta.getIdOrganizador());
        notificacionService.crear(cuenta.getIdOrganizador(),
                "Tu cuenta de Mercado Pago se desvinculó",
                "Mercado Pago ya no acepta el acceso de AsistíAPP a tu cuenta. Volvé a vincularla desde Mi perfil "
                        + "para seguir cobrando entradas.",
                "CuentaMercadoPago", cuenta.getId());
    }

    private String aleatorioUrlSafe() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String desafioS256(String verificador) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(verificador.getBytes(StandardCharsets.US_ASCII));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
