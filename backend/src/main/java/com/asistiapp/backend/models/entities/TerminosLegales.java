package com.asistiapp.backend.models.entities;

/**
 * Versión vigente de los Términos y Condiciones y la Política de Privacidad (8.7). Se guarda junto con la
 * fecha en que cada Organizador los aceptó; al cambiar los textos hay que subir esta versión y la que
 * muestra el frontend (`frontend/src/lib/terminos.ts`).
 */
public final class TerminosLegales {

    public static final String VERSION = "2026-11-20";

    private TerminosLegales() {}
}
