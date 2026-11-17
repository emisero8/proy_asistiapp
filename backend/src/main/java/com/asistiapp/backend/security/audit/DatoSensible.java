package com.asistiapp.backend.security.audit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marca un parámetro de un método @Auditable cuyo valor nunca debe quedar
 * escrito en LOG_AUDITORIA (contraseñas, tokens, claves). AuditoriaAspect lo
 * reemplaza por {@link AuditoriaAspect#VALOR_ENMASCARADO} en el detalle.
 *
 * Es la forma explícita; además el aspecto enmascara por nombre de parámetro
 * (ver {@link AuditoriaAspect#esNombreSensible}) como red de seguridad por si
 * alguien olvida anotar uno nuevo.
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.PARAMETER)
public @interface DatoSensible {
}
