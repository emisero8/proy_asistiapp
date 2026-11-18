package com.asistiapp.backend.security.audit;

import com.asistiapp.backend.security.SecurityUtils;
import com.asistiapp.backend.services.AuditoriaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;

import java.lang.annotation.Annotation;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Locale;

/**
 * Intercepta los métodos de servicio anotados con @Auditable y registra
 * automáticamente la acción en LOG_AUDITORIA una vez que la transacción
 * se completó exitosamente (@AfterReturning nunca corre si el método
 * lanzó una excepción, por lo que solo se auditan cambios efectivos).
 *
 * El ID de la entidad afectada se toma del primer parámetro Long del
 * método (ej. suspenderUsuario(Long idUsuario)); si no hay ninguno
 * (ej. una creación, donde el ID todavía no existe al invocar el método),
 * se toma del getId() del valor devuelto.
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class AuditoriaAspect {

    /** Lo que se escribe en el log en lugar del valor de un parámetro sensible. */
    public static final String VALOR_ENMASCARADO = "***";

    private final AuditoriaService auditoriaService;
    private final SecurityUtils securityUtils;

    @AfterReturning(pointcut = "@annotation(auditable)", returning = "resultado")
    public void auditar(JoinPoint joinPoint, Auditable auditable, Object resultado) {
        Long idAdmin = securityUtils.getIdUsuarioAutenticado();
        Long idEntidadAfectada = extraerIdEntidad(joinPoint, resultado);
        String detalle = construirDetalle(joinPoint);

        auditoriaService.registrar(idAdmin, auditable.accion(), auditable.entidad(),
                idEntidadAfectada, detalle);

        log.info("Auditoría registrada: admin={}, accion={}, entidad={}, idEntidad={}",
                idAdmin, auditable.accion(), auditable.entidad(), idEntidadAfectada);
    }

    private Long extraerIdEntidad(JoinPoint joinPoint, Object resultado) {
        for (Object arg : joinPoint.getArgs()) {
            if (arg instanceof Long id) {
                return id;
            }
        }
        return extraerIdDeResultado(resultado);
    }

    private Long extraerIdDeResultado(Object resultado) {
        if (resultado == null) {
            return null;
        }
        try {
            Object id = resultado.getClass().getMethod("getId").invoke(resultado);
            return id instanceof Long l ? l : null;
        } catch (ReflectiveOperationException e) {
            return null;
        }
    }

    /**
     * Arma "metodo([arg1, arg2])" para el detalle del log, reemplazando por
     * {@link #VALOR_ENMASCARADO} todo argumento marcado con @DatoSensible o cuyo
     * nombre de parámetro parezca sensible. El log de auditoría lo lee el Admin
     * (y cualquiera con acceso a la base): una contraseña acá sería texto plano.
     */
    private String construirDetalle(JoinPoint joinPoint) {
        MethodSignature firma = (MethodSignature) joinPoint.getSignature();
        Method metodo = firma.getMethod();
        Object[] args = joinPoint.getArgs();
        String[] nombres = firma.getParameterNames();
        Annotation[][] anotaciones = metodo.getParameterAnnotations();

        Object[] visibles = new Object[args.length];
        for (int i = 0; i < args.length; i++) {
            boolean sensible = (i < anotaciones.length && tieneDatoSensible(anotaciones[i]))
                    || (nombres != null && i < nombres.length && esNombreSensible(nombres[i]));
            visibles[i] = sensible ? VALOR_ENMASCARADO : args[i];
        }
        return metodo.getName() + "(" + Arrays.toString(visibles) + ")";
    }

    private static boolean tieneDatoSensible(Annotation[] anotacionesDelParametro) {
        for (Annotation a : anotacionesDelParametro) {
            if (a instanceof DatoSensible) {
                return true;
            }
        }
        return false;
    }

    static boolean esNombreSensible(String nombreParametro) {
        if (nombreParametro == null) {
            return false;
        }
        String n = nombreParametro.toLowerCase(Locale.ROOT);
        return n.contains("password") || n.contains("contrasena") || n.contains("contraseña")
                || n.contains("secret") || n.contains("token") || n.contains("clave");
    }
}
