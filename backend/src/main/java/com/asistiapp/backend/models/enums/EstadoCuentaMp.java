package com.asistiapp.backend.models.enums;

/** Estado de la cuenta de Mercado Pago de un Organizador. Una cuenta que no existe simplemente no está vinculada. */
public enum EstadoCuentaMp {
    /** Autorizó la aplicación y tenemos tokens vigentes. */
    Vinculada,
    /** Mercado Pago rechazó la renovación (el Organizador revocó el acceso o cambió credenciales): hay que vincular de nuevo. */
    Revocada
}
