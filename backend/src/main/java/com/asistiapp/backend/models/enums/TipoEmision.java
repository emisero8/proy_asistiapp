package com.asistiapp.backend.models.enums;

/**
 * Por qué el Organizador emitió una entrada él mismo (sin pasar por la compra online ni por un
 * Staff Vendedor). Es nulo en las entradas compradas online y en las vendidas en el POS.
 */
public enum TipoEmision {
    /** Entrada regalada (prensa, invitados, sponsors). */
    Cortesia,
    /** Entrada cobrada por fuera de la plataforma (efectivo, transferencia, acuerdo con el comprador). */
    Pago_Externo
}
