package com.asistiapp.backend.services;

import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.models.enums.PlazoLiberacionMp;
import com.asistiapp.backend.models.enums.ZonaComisionMp;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;

/**
 * Cargo por procesamiento de pago que se suma al precio de una entrada cuando el Organizador elige trasladar
 * la comisión de Mercado Pago al comprador. AsistíAPP no cobra nada: es solo lo que Mercado Pago le descuenta
 * al Organizador.
 *
 * Mercado Pago cobra su comisión (más IVA) sobre **todo** lo que paga el comprador, cargo incluido. Para que
 * el Organizador reciba el precio de la entrada, el cargo se calcula "hacia arriba":
 *
 *   t     = porcentaje / 100 × 1,21            (comisión con IVA, como fracción)
 *   cargo = precio × t / (1 − t)                redondeado al centavo
 *
 * Ej.: $10.000 al instante, tasa general → t = 0,076109 → cargo $823,79; el comprador paga $10.823,79 y
 * Mercado Pago le descuenta al Organizador $823,79 (≈ 7,61 % de $10.823,79). El cargo es **por entrada**:
 * así el reembolso de una sola entrada devuelve exactamente lo que se pagó por ella.
 */
public final class CargoServicioMp {

    private static final BigDecimal IVA = new BigDecimal("1.21");
    private static final BigDecimal CIEN = BigDecimal.valueOf(100);
    private static final MathContext PRECISION = MathContext.DECIMAL64;

    private CargoServicioMp() {}

    /** Comisión de Mercado Pago con IVA, como fracción del monto cobrado (ej. 0,076109). */
    public static BigDecimal tasaConIva(PlazoLiberacionMp plazo, ZonaComisionMp zona) {
        return plazo.porcentajeSinIva(zona).multiply(IVA).divide(CIEN, PRECISION);
    }

    /** Cuánto se suma al precio de una entrada, al centavo. Cero si el precio no es positivo. */
    public static BigDecimal cargoUnitario(double precio, PlazoLiberacionMp plazo, ZonaComisionMp zona) {
        if (precio <= 0) {
            return BigDecimal.ZERO.setScale(2);
        }
        BigDecimal t = tasaConIva(plazo, zona);
        return BigDecimal.valueOf(precio)
                .multiply(t)
                .divide(BigDecimal.ONE.subtract(t), PRECISION)
                .setScale(2, RoundingMode.HALF_UP);
    }

    /** Recargo efectivo sobre el precio, en porcentaje con dos decimales (ej. 8,24), para mostrarlo. */
    public static BigDecimal porcentajeRecargo(PlazoLiberacionMp plazo, ZonaComisionMp zona) {
        BigDecimal t = tasaConIva(plazo, zona);
        return t.divide(BigDecimal.ONE.subtract(t), PRECISION).multiply(CIEN).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Cargo por entrada que paga el comprador en un evento de este Organizador: cero si absorbe él la comisión
     * (el valor por defecto) o si no hay Organizador.
     */
    public static BigDecimal cargoUnitarioPara(Organizador organizador, double precio) {
        if (organizador == null || !organizador.isTrasladarCargoMp()) {
            return BigDecimal.ZERO.setScale(2);
        }
        return cargoUnitario(precio, plazoDe(organizador), zonaDe(organizador));
    }

    /** Recargo efectivo de este Organizador si traslada la comisión; null si la absorbe. */
    public static BigDecimal porcentajeRecargoPara(Organizador organizador) {
        if (organizador == null || !organizador.isTrasladarCargoMp()) {
            return null;
        }
        return porcentajeRecargo(plazoDe(organizador), zonaDe(organizador));
    }

    public static PlazoLiberacionMp plazoDe(Organizador organizador) {
        return organizador.getPlazoLiberacionMp() == null ? PlazoLiberacionMp.AlInstante : organizador.getPlazoLiberacionMp();
    }

    public static ZonaComisionMp zonaDe(Organizador organizador) {
        return organizador.getZonaComisionMp() == null ? ZonaComisionMp.General : organizador.getZonaComisionMp();
    }
}
