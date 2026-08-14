package com.asistiapp.backend.security.audit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marca un método de servicio administrativo cuya ejecución exitosa
 * debe quedar registrada en LOG_AUDITORIA (Fase 7).
 *
 * El método anotado debe recibir como primer parámetro el ID de la
 * entidad afectada — AuditoriaAspect lo usa para completar el registro.
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface Auditable {

    /** Descripción corta de la acción (ej. "SUSPENDER_USUARIO"). */
    String accion();

    /** Nombre de la entidad afectada (ej. "Usuario", "PaqueteCredito"). */
    String entidad();
}
