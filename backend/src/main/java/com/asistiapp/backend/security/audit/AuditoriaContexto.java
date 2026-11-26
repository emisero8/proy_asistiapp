package com.asistiapp.backend.security.audit;

import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

/**
 * Lo que un método {@link Auditable} cuenta de sí mismo mientras se ejecuta: sobre qué
 * registro actuó (id + nombre legible) y un detalle en lenguaje natural, con los cambios
 * "antes → después". {@link AuditoriaAspect} abre el contexto antes de llamar al método y,
 * si el método termina bien, lo usa para escribir la fila de LOG_AUDITORIA.
 *
 * El nombre se guarda como foto del momento: si después el usuario o el evento se borran,
 * la auditoría sigue diciendo quién era.
 *
 * Fuera de un método auditado (un test que llama al servicio directo, por ejemplo) no hay
 * contexto abierto y todas las llamadas son no-ops.
 */
public final class AuditoriaContexto {

    /** Un valor de un cambio más largo que esto se resume como "modificado" (ej. una descripción). */
    static final int LARGO_MAXIMO_VALOR = 80;

    private static final ThreadLocal<Datos> ACTUAL = new ThreadLocal<>();

    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter FECHA_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private AuditoriaContexto() {
    }

    /** Lo que se juntó durante una ejecución. */
    public static final class Datos {
        private Long idEntidad;
        private String nombreEntidad;
        private boolean objetivoDefinido;
        private Long idEmisor;
        private String accion;
        private final List<String> lineas = new ArrayList<>();

        /** Código de acción que reemplaza al de la anotación (ej. un ingreso rechazado); null = el de @Auditable. */
        public String getAccion() {
            return accion;
        }

        /** Emisor fijado a mano (flujo sin sesión, ej. la vuelta de Mercado Pago); null = el usuario logueado. */
        public Long getIdEmisor() {
            return idEmisor;
        }

        public Long getIdEntidad() {
            return idEntidad;
        }

        public String getNombreEntidad() {
            return nombreEntidad;
        }

        public boolean isObjetivoDefinido() {
            return objetivoDefinido;
        }

        /** Las líneas del detalle unidas con salto de línea, o null si el método no describió nada. */
        public String getDetalle() {
            return lineas.isEmpty() ? null : String.join("\n", lineas);
        }
    }

    // ---- Ciclo de vida (lo usa solo el aspecto) ----

    /** Abre un contexto nuevo y devuelve el anterior (para restaurarlo si hubiera anidamiento). */
    static Datos abrir() {
        Datos previo = ACTUAL.get();
        ACTUAL.set(new Datos());
        return previo;
    }

    static Datos actual() {
        return ACTUAL.get();
    }

    static void cerrar(Datos previo) {
        if (previo == null) {
            ACTUAL.remove();
        } else {
            ACTUAL.set(previo);
        }
    }

    // ---- API para los servicios auditados ----

    /**
     * Si hay un método auditado en curso. Sirve para no hacer consultas extra (buscar el
     * nombre del organizador, la foto de una tanda) cuando nadie va a usar el resultado.
     */
    public static boolean activo() {
        return ACTUAL.get() != null;
    }

    /** El registro sobre el que se actuó. {@code id} puede ser null (acción global, ej. un anuncio). */
    public static void objetivo(Long id, String nombre) {
        Datos datos = ACTUAL.get();
        if (datos == null) {
            return;
        }
        datos.idEntidad = id;
        datos.nombreEntidad = recortar(nombre, 300);
        datos.objetivoDefinido = true;
    }

    /**
     * Quién hizo la acción, cuando no hay usuario logueado en el request (ej. la vuelta de
     * Mercado Pago al vincular la cuenta, que llega sin token). Si no se llama, es el logueado.
     */
    public static void emisor(Long idUsuario) {
        Datos datos = ACTUAL.get();
        if (datos != null) {
            datos.idEmisor = idUsuario;
        }
    }

    /**
     * Cambia el código de acción de esta ejecución, cuando un mismo método termina de dos formas
     * que conviene filtrar por separado (validar un QR: ingreso aceptado o rechazado).
     */
    public static void accion(String codigo) {
        Datos datos = ACTUAL.get();
        if (datos != null) {
            datos.accion = codigo;
        }
    }

    /** Agrega una línea al detalle. Ignora textos vacíos. */
    public static void detalle(String linea) {
        Datos datos = ACTUAL.get();
        if (datos == null || linea == null || linea.isBlank()) {
            return;
        }
        datos.lineas.add(linea.strip());
    }

    /** Agrega "Campo: antes → después" si el valor cambió. */
    public static void cambio(String campo, Object antes, Object despues) {
        String a = texto(antes);
        String d = texto(despues);
        if (Objects.equals(a, d)) {
            return;
        }
        if (largo(a) > LARGO_MAXIMO_VALOR || largo(d) > LARGO_MAXIMO_VALOR) {
            detalle(campo + ": modificado");
        } else {
            detalle(campo + ": " + (a == null ? "(vacío)" : a) + " → " + (d == null ? "(vacío)" : d));
        }
    }

    /**
     * Compara dos fotos de los mismos campos (mismo orden de claves) y agrega una línea por
     * cada campo que cambió. Si no cambió ninguno, lo dice.
     */
    public static void cambios(Map<String, ?> antes, Map<String, ?> despues) {
        Datos datos = ACTUAL.get();
        if (datos == null) {
            return;
        }
        int lineasPrevias = datos.lineas.size();
        for (Map.Entry<String, ?> campo : despues.entrySet()) {
            cambio(campo.getKey(), antes.get(campo.getKey()), campo.getValue());
        }
        if (datos.lineas.size() == lineasPrevias) {
            detalle("Se guardó sin cambios.");
        }
    }

    // ---- Formato legible de valores ----

    /** Pasa un valor a texto legible (fechas dd/MM/yyyy, booleanos Sí/No, enums sin guión bajo). */
    public static String texto(Object valor) {
        if (valor == null) {
            return null;
        }
        if (valor instanceof LocalDateTime f) {
            return f.format(FECHA_HORA);
        }
        if (valor instanceof LocalDate f) {
            return f.format(FECHA);
        }
        if (valor instanceof LocalTime h) {
            return h.format(HORA);
        }
        if (valor instanceof Boolean b) {
            return b ? "Sí" : "No";
        }
        if (valor instanceof Enum<?> e) {
            return e.name().replace('_', ' ');
        }
        String s = valor.toString().strip();
        return s.isEmpty() ? null : s;
    }

    /** Monto en pesos con el formato de la app: $12.000 o $1.234,50. */
    public static String pesos(Double monto) {
        if (monto == null) {
            return null;
        }
        DecimalFormatSymbols simbolos = new DecimalFormatSymbols(Locale.forLanguageTag("es-AR"));
        simbolos.setGroupingSeparator('.');
        simbolos.setDecimalSeparator(',');
        String patron = monto % 1 == 0 ? "#,##0" : "#,##0.00";
        return "$" + new DecimalFormat(patron, simbolos).format(monto);
    }

    public static String recortar(String texto, int maximo) {
        if (texto == null || texto.length() <= maximo) {
            return texto;
        }
        return texto.substring(0, maximo - 1) + "…";
    }

    private static int largo(String s) {
        return s == null ? 0 : s.length();
    }
}
