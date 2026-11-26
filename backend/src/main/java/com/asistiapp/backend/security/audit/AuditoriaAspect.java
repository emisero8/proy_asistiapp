package com.asistiapp.backend.security.audit;

import com.asistiapp.backend.models.entities.Usuario;
import com.asistiapp.backend.repositories.UsuarioRepository;
import com.asistiapp.backend.security.SecurityUtils;
import com.asistiapp.backend.services.AuditoriaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;

import java.lang.annotation.Annotation;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Locale;

/**
 * Intercepta los métodos de servicio anotados con @Auditable y registra la acción en
 * LOG_AUDITORIA. Si el método lanza una excepción no se registra nada: solo se auditan
 * cambios efectivos. Audita a cualquier rol (Admin, Organizador, Staff).
 *
 * Mientras el método corre hay un {@link AuditoriaContexto} abierto, donde el propio método
 * cuenta sobre qué registro actuó (id + nombre) y qué cambió. Con eso se escribe la fila,
 * junto con el id, el nombre y el rol de quien la hizo (foto del momento: sigue siendo
 * legible aunque después se borren el usuario o el evento).
 *
 * Si un método auditado no describe nada (uno nuevo que todavía no lo hace), se usa el
 * comportamiento anterior como red: el id es el primer parámetro Long (o el getId() del
 * valor devuelto) y el detalle, la firma con los argumentos, enmascarando los sensibles.
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
    private final UsuarioRepository usuarioRepository;

    /**
     * Un método auditado llamado desde otro método auditado (el Admin edita un evento a través
     * de EventoService.actualizarEvento) no genera una segunda fila: corre con un contexto propio
     * que se descarta, y la acción queda registrada una sola vez, por el de afuera.
     */
    @Around("@annotation(auditable)")
    public Object auditar(ProceedingJoinPoint joinPoint, Auditable auditable) throws Throwable {
        AuditoriaContexto.Datos previo = AuditoriaContexto.abrir();
        try {
            Object resultado = joinPoint.proceed();
            if (previo == null) {
                registrar(joinPoint, auditable, resultado, AuditoriaContexto.actual());
            }
            return resultado;
        } finally {
            AuditoriaContexto.cerrar(previo);
        }
    }

    /**
     * El emisor: el fijado por el método (flujo sin sesión) o el usuario logueado. Null si no hay
     * ninguno: la acción ya se hizo y no se la tira abajo por no poder auditarla.
     */
    private Usuario resolverEmisor(AuditoriaContexto.Datos datos) {
        if (datos.getIdEmisor() != null) {
            return usuarioRepository.findById(datos.getIdEmisor()).orElse(null);
        }
        try {
            return securityUtils.getUsuarioAutenticado();
        } catch (RuntimeException sinSesion) {
            return null;
        }
    }

    private void registrar(JoinPoint joinPoint, Auditable auditable, Object resultado,
                           AuditoriaContexto.Datos datos) {
        Usuario emisor = resolverEmisor(datos);
        if (emisor == null) {
            log.warn("Auditoría sin emisor: no se registró accion={} (no hay usuario logueado ni emisor fijado)",
                    auditable.accion());
            return;
        }

        Long idEntidad;
        String nombreEntidad;
        if (datos.isObjetivoDefinido()) {
            idEntidad = datos.getIdEntidad();
            nombreEntidad = datos.getNombreEntidad();
        } else {
            idEntidad = extraerIdEntidad(joinPoint, resultado);
            nombreEntidad = null;
        }
        String detalle = datos.getDetalle() != null ? datos.getDetalle() : construirDetalle(joinPoint);

        String accion = datos.getAccion() != null ? datos.getAccion() : auditable.accion();

        auditoriaService.registrar(emisor.getId(), emisor.getNombre(), emisor.getRol(), accion,
                auditable.entidad(), idEntidad, nombreEntidad, detalle);

        log.info("Auditoría registrada: emisor={} ({}), accion={}, entidad={}, idEntidad={}",
                emisor.getId(), emisor.getRol(), accion, auditable.entidad(), idEntidad);
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
     * Red para métodos que no describen su acción: arma "metodo([arg1, arg2])", reemplazando
     * por {@link #VALOR_ENMASCARADO} todo argumento marcado con @DatoSensible o cuyo nombre de
     * parámetro parezca sensible. El log de auditoría lo lee el Admin (y cualquiera con acceso
     * a la base): una contraseña acá sería texto plano.
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
