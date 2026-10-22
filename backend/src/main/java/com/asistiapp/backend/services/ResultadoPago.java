package com.asistiapp.backend.services;

/** Qué pasó al intentar confirmar un pago aprobado de MercadoPago contra su orden. */
public enum ResultadoPago {
    /** La orden estaba pendiente y se entregó lo comprado (entradas o créditos). */
    CONFIRMADA,
    /** Notificación repetida de un pago que ya se procesó: no se hace nada. */
    YA_PROCESADA,
    /** Otro pago aprobado para una orden que ya se resolvió con un pago distinto: hay que devolverlo. */
    DUPLICADO,
    /** Se cobró pero ya no se puede entregar (tanda agotada, evento dado de baja, tope por comprador): hay que devolverlo. */
    SIN_DISPONIBILIDAD,
    /** El monto o la moneda del pago no coinciden con la orden: no se entrega nada. */
    MONTO_INVALIDO,
    /** No hay ninguna orden con ese external_reference. */
    NO_ENCONTRADA
}
