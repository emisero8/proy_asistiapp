package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.PasarelaPagoException;
import com.asistiapp.backend.models.dtos.entrada.EntradaResponseDTO;
import com.asistiapp.backend.models.dtos.entrada.ResultadoAnulacionResponseDTO;
import com.asistiapp.backend.models.dtos.entrada.ResultadoReembolsoMasivoResponseDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Anular entradas y devolver el dinero a quien las compró (8.6), a pedido del Organizador.
 *
 * La plataforma no interviene en los reembolsos: el dinero sale de la cuenta de Mercado Pago del Organizador,
 * con su token. Esta clase NO es transaccional a propósito: cada paso con base de datos es su propia transacción
 * en {@link AnulacionEntradaService} y la llamada a Mercado Pago queda afuera de ellas.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReembolsoEntradaService {

    static final String MOTIVO_FALLA_GENERICO = "Mercado Pago no pudo devolver el dinero";

    private final AnulacionEntradaService anulacionService;
    private final MercadoPagoService mercadoPagoService;
    private final CuentaCobroService cuentaCobroService;
    private final EmailService emailService;

    /**
     * Anula la entrada y, si se pidió, intenta devolver el dinero. Si el reembolso falla (por ejemplo, saldo
     * insuficiente en la cuenta del Organizador) la entrada queda anulada igual y el reembolso se puede reintentar.
     */
    public ResultadoAnulacionResponseDTO anular(Long idEntrada, Long idOrganizador, String motivo, boolean reembolsar) {
        AnulacionEntradaService.EntradaAnulada anulada = anulacionService.anular(idEntrada, idOrganizador, motivo);
        AnulacionEntradaService.DatosEntrada datos = anulada.datos();
        emailService.enviarNotificacionEntradaAnulada(datos.emailComprador(), datos.nombreComprador(), datos.nombreEvento());

        if (!reembolsar || !esReembolsable(anulada.entrada())) {
            return ResultadoAnulacionResponseDTO.builder().entrada(anulada.entrada()).build();
        }
        try {
            EntradaResponseDTO reembolsada = reembolsar(idEntrada, idOrganizador);
            return ResultadoAnulacionResponseDTO.builder().entrada(reembolsada).reembolsada(true).build();
        } catch (RuntimeException e) {
            log.warn("La entrada {} quedó anulada pero no se pudo reembolsar: {}", idEntrada, e.getMessage());
            return ResultadoAnulacionResponseDTO.builder().entrada(anulada.entrada())
                    .avisoReembolso(e.getMessage()).build();
        }
    }

    /** Devuelve el dinero de una entrada anulada (o de un evento cancelado). Sirve también para reintentar un reembolso fallido. */
    public EntradaResponseDTO reembolsar(Long idEntrada, Long idOrganizador) {
        return reembolsarConToken(idEntrada, idOrganizador, null, true).entrada();
    }

    /** Reembolsa todas las compras de un evento cancelado. Las que fallan quedan pendientes, listas para reintentar. */
    public ResultadoReembolsoMasivoResponseDTO reembolsarTodo(Long idEvento, Long idOrganizador) {
        List<Long> ids = anulacionService.idsParaReembolsoMasivo(idEvento, idOrganizador);
        List<ResultadoReembolsoMasivoResponseDTO.Falla> fallidas = new ArrayList<>();
        int reembolsadas = 0;
        double monto = 0;
        if (!ids.isEmpty()) {
            String token = cuentaCobroService.tokenParaReembolsar(idOrganizador);
            for (Long id : ids) {
                try {
                    Reembolsado hecho = reembolsarConToken(id, idOrganizador, token, false);
                    reembolsadas++;
                    monto += hecho.monto();
                } catch (RuntimeException e) {
                    log.warn("No se pudo reembolsar la entrada {} del evento {}: {}", id, idEvento, e.getMessage());
                    fallidas.add(falla(id, idOrganizador, e));
                }
            }
        }
        return ResultadoReembolsoMasivoResponseDTO.builder()
                .reembolsadas(reembolsadas)
                .montoReembolsado(monto)
                .fallidas(fallidas)
                .build();
    }

    // ─────────────────────────────────────────────

    /**
     * @param pedirToken true si todavía no se tiene el token del Organizador: se pide después de validar la entrada
     *                   (así el aviso de "entrada que no se puede reembolsar" no depende de la cuenta) y si no hay
     *                   cuenta utilizable se suelta el turno
     */
    /** Lo que devolvió un reembolso: la entrada y el monto (precio + cargo por procesamiento, si se cobró). */
    private record Reembolsado(EntradaResponseDTO entrada, double monto) {}

    private Reembolsado reembolsarConToken(Long idEntrada, Long idOrganizador, String token, boolean pedirToken) {
        AnulacionEntradaService.PlanReembolso plan = anulacionService.prepararReembolso(idEntrada, idOrganizador);
        try {
            String tokenDeCobro = pedirToken ? cuentaCobroService.tokenParaReembolsar(idOrganizador) : token;
            mercadoPagoService.reembolsarParcial(plan.paymentId(), plan.monto(), tokenDeCobro);
        } catch (RuntimeException e) {
            anulacionService.liberarReembolso(idEntrada);
            throw e;
        }
        EntradaResponseDTO dto;
        try {
            dto = anulacionService.completarReembolso(idEntrada, idOrganizador);
        } catch (RuntimeException e) {
            // El dinero ya salió: NO se libera el turno, para que un reintento no lo devuelva dos veces.
            log.error("Mercado Pago devolvió el dinero de la entrada {} pero no se pudo dejar constancia: revisar a mano", idEntrada, e);
            throw e;
        }
        AnulacionEntradaService.DatosEntrada datos = plan.entrada();
        emailService.enviarNotificacionReembolsoOrganizador(datos.emailComprador(), datos.nombreComprador(), datos.nombreEvento(), datos.precio());
        return new Reembolsado(dto, plan.monto().doubleValue());
    }

    private boolean esReembolsable(EntradaResponseDTO entrada) {
        return entrada.getPrecioTanda() != null && entrada.getPrecioTanda() > 0
                && entrada.getCanalVenta() == com.asistiapp.backend.models.enums.CanalVenta.Online;
    }

    private ResultadoReembolsoMasivoResponseDTO.Falla falla(Long idEntrada, Long idOrganizador, RuntimeException e) {
        String motivo = e instanceof PasarelaPagoException || e instanceof com.asistiapp.backend.exceptions.BusinessRuleException
                ? e.getMessage() : MOTIVO_FALLA_GENERICO;
        return ResultadoReembolsoMasivoResponseDTO.Falla.builder()
                .idEntrada(idEntrada)
                .motivo(motivo)
                .build();
    }
}
