package com.asistiapp.backend.models.enums;

public enum EstadoTransaccion {
    Pendiente,
    Aprobada,
    Rechazada,
    /** La orden venció sin pagarse. */
    Expirada,
    /** Se cobró pero no se pudo entregar (ej. tanda agotada) y se devolvió el dinero. */
    Reembolsada
}
