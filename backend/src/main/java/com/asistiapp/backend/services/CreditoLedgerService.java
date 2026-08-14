package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.models.entities.MovimientoCredito;
import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.models.enums.TipoMovimiento;
import com.asistiapp.backend.repositories.MovimientoCreditoRepository;
import com.asistiapp.backend.repositories.OrganizadorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Único punto de mutación de `saldo_creditos`. Cada vez que el saldo de un
 * Organizador cambia, se actualiza el saldo Y se deja un MovimientoCredito
 * como rastro auditable — evita que distintos servicios (registro, publicación
 * de eventos, recarga) muevan el saldo por su cuenta sin dejar historial.
 */
@Service
@RequiredArgsConstructor
public class CreditoLedgerService {

    private final OrganizadorRepository organizadorRepository;
    private final MovimientoCreditoRepository movimientoCreditoRepository;

    @Transactional
    public MovimientoCredito registrarBienvenida(Organizador organizador, int monto) {
        return registrarMovimiento(organizador, TipoMovimiento.Bienvenida, monto, null, null);
    }

    @Transactional
    public MovimientoCredito registrarRecarga(Organizador organizador, int monto, Long idTransaccionCredito) {
        return registrarMovimiento(organizador, TipoMovimiento.Recarga, monto, idTransaccionCredito, null);
    }

    @Transactional
    public MovimientoCredito registrarConsumoPublicacion(Organizador organizador, int monto, Long idEvento) {
        return registrarMovimiento(organizador, TipoMovimiento.Consumo_Publicacion, -monto, null, idEvento);
    }

    private MovimientoCredito registrarMovimiento(Organizador organizador, TipoMovimiento tipo, int montoSigned,
                                                    Long idTransaccionCredito, Long idEvento) {
        int nuevoSaldo = organizador.getSaldoCreditos() + montoSigned;
        if (nuevoSaldo < 0) {
            throw new BusinessRuleException("Saldo de créditos insuficiente");
        }

        organizador.setSaldoCreditos(nuevoSaldo);
        organizadorRepository.save(organizador);

        MovimientoCredito movimiento = new MovimientoCredito();
        movimiento.setIdOrganizador(organizador.getId());
        movimiento.setTipoMovimiento(tipo);
        movimiento.setMonto(montoSigned);
        movimiento.setSaldoResultante(nuevoSaldo);
        movimiento.setIdTransaccionCredito(idTransaccionCredito);
        movimiento.setIdEvento(idEvento);

        return movimientoCreditoRepository.save(movimiento);
    }
}
