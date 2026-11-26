package com.asistiapp.backend.security.audit;

import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.entities.Tanda;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Las "fotos" de un registro que se comparan antes y después de un cambio para la auditoría
 * ({@link AuditoriaContexto#cambios}). Las usan el Admin y el Organizador, así una misma
 * edición se describe igual la haga quien la haga. Los valores quedan en el orden en que se
 * muestran.
 */
public final class FotosAuditoria {

    private FotosAuditoria() {
    }

    /** Los datos del evento que se pueden editar. */
    public static Map<String, Object> evento(Evento evento) {
        Map<String, Object> campos = new LinkedHashMap<>();
        campos.put("Nombre", evento.getNombre());
        campos.put("Fecha", evento.getFechaEvento());
        campos.put("Hora", evento.getHoraEvento());
        campos.put("Lugar", evento.getLugar());
        campos.put("Descripción", evento.getDescripcion());
        campos.put("Imagen de portada", evento.getImagenPortadaUrl());
        campos.put("Estado", evento.getEstado());
        return campos;
    }

    public static Map<String, Object> tanda(Tanda tanda) {
        Map<String, Object> campos = new LinkedHashMap<>();
        campos.put("Nombre", tanda.getNombre());
        campos.put("Precio", AuditoriaContexto.pesos(tanda.getPrecio()));
        campos.put("Cupo", tanda.getCupoMaximo());
        campos.put("Inicio de venta", tanda.getFechaInicioVigencia());
        campos.put("Fin de venta", tanda.getFechaFinVigencia());
        campos.put("Solo emisión", tanda.isSoloEmision());
        return campos;
    }

    /** "General — Fiesta de fin de año": la tanda sola no dice de qué evento es. */
    public static String nombreTanda(String nombreTanda, Evento evento) {
        return (nombreTanda != null ? nombreTanda : "Tanda") + " — " + evento.getNombre();
    }

    /** Una línea "Campo: valor" por cada dato (para lo que se crea o se elimina). */
    public static void detallarTodo(Map<String, Object> campos) {
        campos.forEach((campo, valor) -> {
            String texto = AuditoriaContexto.texto(valor);
            if (texto != null) {
                AuditoriaContexto.detalle(campo + ": " + AuditoriaContexto.recortar(texto, AuditoriaContexto.LARGO_MAXIMO_VALOR));
            }
        });
    }
}
