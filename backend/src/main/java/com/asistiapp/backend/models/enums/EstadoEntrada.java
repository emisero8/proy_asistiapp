package com.asistiapp.backend.models.enums;

public enum EstadoEntrada {
    Pagada,
    Usada,
    /** El Organizador la dejó sin efecto (8.6): ya no vale en el escáner ni cuenta como vendida. */
    Anulada
}
