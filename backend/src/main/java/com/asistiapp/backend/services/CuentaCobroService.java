package com.asistiapp.backend.services;

import com.asistiapp.backend.config.MercadoPagoConfig;
import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.PasarelaPagoException;
import com.asistiapp.backend.models.entities.CuentaMercadoPago;
import com.asistiapp.backend.models.enums.EstadoCuentaMp;
import com.asistiapp.backend.repositories.CuentaMercadoPagoRepository;
import com.asistiapp.backend.repositories.TandaRepository;
import com.asistiapp.backend.repositories.TransaccionPagoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Con qué cuenta de Mercado Pago se cobra cada cosa (8.5).
 *
 * Las entradas se cobran con la cuenta del Organizador del evento: el dinero cae directo en ella y la
 * plataforma no lo toca. La compra de créditos sigue con la cuenta de la plataforma. Un token `null`
 * significa "la cuenta de la plataforma".
 */
@Service
@RequiredArgsConstructor
public class CuentaCobroService {

    private final VinculacionMercadoPagoService vinculacionService;
    private final CuentaMercadoPagoRepository cuentaRepository;
    private final TransaccionPagoRepository transaccionPagoRepository;
    private final TandaRepository tandaRepository;
    private final MercadoPagoConfig config;

    /** ¿Puede este Organizador cobrar entradas ahora? Se pide al publicar un evento. */
    @Transactional(readOnly = true)
    public boolean puedeCobrar(Long idOrganizador) {
        if (!config.isExigirCuentaVinculada()) {
            return true;
        }
        return cuentaRepository.findByIdOrganizador(idOrganizador)
                .map(c -> c.getEstado() == EstadoCuentaMp.Vinculada)
                .orElse(false);
    }

    /**
     * Token con el que cobrar una compra de entradas de este Organizador. Lo ve el comprador, así que el
     * mensaje no habla de tokens ni de OAuth.
     */
    public String tokenParaCobrar(Long idOrganizador) {
        if (!config.isExigirCuentaVinculada() && cuentaRepository.findByIdOrganizador(idOrganizador).isEmpty()) {
            return null;
        }
        try {
            return vinculacionService.obtenerAccessToken(idOrganizador);
        } catch (BusinessRuleException e) {
            throw new BusinessRuleException(
                    "Este evento no puede cobrar online en este momento. Contactá al organizador.");
        }
    }

    /** Token para devolver dinero desde la cuenta del Organizador (8.6). El mensaje le habla a él, no al comprador. */
    public String tokenParaReembolsar(Long idOrganizador) {
        if (!config.isExigirCuentaVinculada() && cuentaRepository.findByIdOrganizador(idOrganizador).isEmpty()) {
            return null;
        }
        try {
            return vinculacionService.obtenerAccessToken(idOrganizador);
        } catch (BusinessRuleException e) {
            throw new BusinessRuleException(
                    "Tu cuenta de Mercado Pago no está vinculada o perdió el acceso: vinculala de nuevo en Mi perfil para poder reembolsar.");
        }
    }

    /**
     * Token de la cuenta a la que se cobró una orden, para consultar el pago o reembolsarlo. Null si la
     * orden no es de entradas (por ejemplo, créditos) o si no hay cuenta del Organizador (modo sin exigirla).
     *
     * @throws PasarelaPagoException si la cuenta del Organizador perdió el acceso: el webhook responde 5xx y
     *                               Mercado Pago reintenta, así el aviso no se pierde mientras la vuelve a vincular
     */
    @Transactional(readOnly = true)
    public String tokenParaOrden(String externalReference) {
        Long idOrganizador = transaccionPagoRepository.findByExternalReference(externalReference)
                .flatMap(t -> tandaRepository.findById(t.getIdTanda()))
                .map(tanda -> tanda.getEvento().getIdOrganizador())
                .orElse(null);
        return idOrganizador == null ? null : tokenParaConsultar(idOrganizador);
    }

    /** Token a partir del vendedor de Mercado Pago que informa el aviso (`user_id`); null si no es de un Organizador nuestro. */
    @Transactional(readOnly = true)
    public String tokenParaVendedor(Long mpUserId) {
        if (mpUserId == null) {
            return null;
        }
        return cuentaRepository.findByMpUserId(mpUserId)
                .map(CuentaMercadoPago::getIdOrganizador)
                .map(this::tokenParaConsultar)
                .orElse(null);
    }

    private String tokenParaConsultar(Long idOrganizador) {
        if (!config.isExigirCuentaVinculada() && cuentaRepository.findByIdOrganizador(idOrganizador).isEmpty()) {
            return null;
        }
        try {
            return vinculacionService.obtenerAccessToken(idOrganizador);
        } catch (BusinessRuleException e) {
            throw new PasarelaPagoException("No hay acceso a la cuenta de Mercado Pago del organizador " + idOrganizador);
        }
    }
}
