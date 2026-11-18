package com.asistiapp.backend.models.enums;

import java.math.BigDecimal;

/**
 * Plazo en que Mercado Pago libera el dinero de una venta con Checkout Pro / Link de pago. Lo elige cada
 * Organizador en su cuenta de Mercado Pago; cuanto antes cobra, más comisión le descuenta Mercado Pago.
 *
 * Porcentajes **sin IVA** (Mercado Pago Argentina, valores de referencia al 2026-11-17): el primero es la tasa
 * general y el segundo la de Buenos Aires, Entre Ríos y Chubut. Si Mercado Pago los cambia, se actualizan acá
 * y en `frontend/src/lib/comisionesMp.ts` (la tabla informativa de Mi perfil).
 */
public enum PlazoLiberacionMp {
    AlInstante("6.29", "6.60"),
    Dias10("4.39", "4.61"),
    Dias18("3.39", "3.56"),
    Dias35("1.49", "1.56");

    private final BigDecimal porcentajeGeneral;
    private final BigDecimal porcentajeZonaAlta;

    PlazoLiberacionMp(String general, String zonaAlta) {
        this.porcentajeGeneral = new BigDecimal(general);
        this.porcentajeZonaAlta = new BigDecimal(zonaAlta);
    }

    /** Comisión de Mercado Pago en porcentaje, sin IVA, para la zona del Organizador. */
    public BigDecimal porcentajeSinIva(ZonaComisionMp zona) {
        return zona == ZonaComisionMp.BuenosAiresEntreRiosChubut ? porcentajeZonaAlta : porcentajeGeneral;
    }
}
