package com.asistiapp.backend.services;

import org.springframework.web.util.HtmlUtils;

/**
 * Diseño común de los mails de AsistíAPP: tarjeta con el encabezado de la marca, una franja de color según
 * el tipo de aviso, el cuerpo y el pie. Los colores son los del frontend (theme.css, modo claro).
 *
 * Todo va con tablas y estilos en línea, y con fuentes del sistema: los clientes de correo descartan las
 * hojas de estilo y las fuentes web. Lo que venga de una persona (nombres, eventos) se escapa con
 * {@link #escapar} antes de meterlo en el HTML.
 */
final class PlantillaEmail {

    private static final String TINTA = "#141311";
    private static final String CREMA = "#f3f1ec";
    private static final String ARENA = "#e7e3d9";
    private static final String GRIS = "#56554f";
    private static final String VIOLETA = "#5b54c7";
    private static final String LIMA = "#9fe02a";
    private static final String TROQUEL = "#c9c4b6";

    private static final String SANS = "'Segoe UI',Arial,sans-serif";
    private static final String MONO = "'Courier New',Courier,monospace";

    /** Color de la franja del título. */
    enum Tono {
        /** Compra confirmada. */
        COMPRA(LIMA, TINTA),
        /** Avisos sobre la cuenta (contraseña, alta de Staff). */
        CUENTA("#e9e7f8", TINTA),
        /** Algo dejó de valer (evento cancelado, entrada anulada). */
        BAJA("#772238", "#ffffff"),
        /** Dinero devuelto. */
        REEMBOLSO("#215f3a", "#ffffff");

        private final String fondo;
        private final String texto;

        Tono(String fondo, String texto) {
            this.fondo = fondo;
            this.texto = texto;
        }
    }

    private PlantillaEmail() {
    }

    static String escapar(String texto) {
        // Con UTF-8 solo se escapan los caracteres especiales de HTML; los acentos viajan tal cual.
        return texto == null ? "" : HtmlUtils.htmlEscape(texto, "UTF-8");
    }

    /**
     * El mail completo.
     *
     * @param titulo      título de la franja (texto fijo de la aplicación)
     * @param bajadaHtml  línea bajo el título, ya en HTML (con los datos escapados)
     * @param filas       filas del cuerpo, armadas con {@link #fila} y {@link #troquel}
     */
    static String documento(Tono tono, String titulo, String bajadaHtml, String filas) {
        return """
                <!DOCTYPE html>
                <html lang="es">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                </head>
                <body style="margin:0;padding:0;background:%1$s;font-family:%2$s;">
                  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:%1$s;">
                    <tr><td align="center" style="padding:28px 12px;">
                      <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:500px;background:#ffffff;border:1px solid %3$s;border-radius:16px;overflow:hidden;border-collapse:separate;">
                        <tr><td style="background:%3$s;padding:22px 28px;text-align:center;border-radius:15px 15px 0 0;">
                          <span style="font-size:25px;font-weight:900;color:#ffffff;letter-spacing:-0.8px;">Asistí<span style="color:%4$s;">APP</span></span>
                        </td></tr>
                        <tr><td style="background:%5$s;padding:26px 28px;text-align:center;">
                          <h1 style="margin:0;font-size:24px;line-height:1.25;font-weight:900;letter-spacing:-0.6px;color:%6$s;">%7$s</h1>
                          <p style="margin:6px 0 0;font-size:14px;line-height:1.5;color:%6$s;">%8$s</p>
                        </td></tr>
                        %9$s
                        <tr><td style="background:%10$s;padding:16px 28px;text-align:center;font-size:12px;color:%11$s;border-radius:0 0 15px 15px;">
                          El equipo de <strong style="color:%3$s;">AsistíAPP</strong>
                        </td></tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(CREMA, SANS, TINTA, LIMA, tono.fondo, tono.texto, titulo, bajadaHtml, filas, ARENA, GRIS);
    }

    static String fila(String contenidoHtml) {
        return "<tr><td style=\"padding:24px 28px;\">" + contenidoHtml + "</td></tr>\n";
    }

    /** Línea punteada, como el corte de una entrada. */
    static String troquel() {
        return "<tr><td style=\"padding:0 28px;\"><div style=\"border-top:2px dashed " + TROQUEL + ";\"></div></td></tr>\n";
    }

    /** Párrafo de texto corrido; el contenido ya viene en HTML. */
    static String parrafo(String html) {
        return "<p style=\"margin:14px 0 0;font-size:14px;line-height:1.6;color:" + GRIS + ";\">" + html + "</p>";
    }

    /** Aclaración en letra chica. */
    static String nota(String html) {
        return "<p style=\"margin:18px 0 0;font-size:12px;line-height:1.6;color:" + GRIS + ";\">" + html + "</p>";
    }

    static String destacado(String html) {
        return "<strong style=\"color:" + TINTA + ";\">" + html + "</strong>";
    }

    /** Rótulo chico en violeta ("EVENTO", "ENTRADA 1 DE 2"). */
    static String rotulo(String texto) {
        return "<span style=\"font-family:" + MONO + ";font-size:11px;font-weight:700;letter-spacing:1.5px;"
                + "text-transform:uppercase;color:" + VIOLETA + ";\">" + texto + "</span>";
    }

    /** Un dato del recuadro. El rótulo es texto fijo; el valor se escapa acá. */
    static String dato(String rotulo, String valor) {
        return rotulo(rotulo) + "<br><span style=\"font-size:16px;font-weight:700;color:" + TINTA + ";word-break:break-word;\">"
                + escapar(valor) + "</span>";
    }

    /** Recuadro con uno o más datos armados con {@link #dato}. */
    static String recuadro(String... datos) {
        StringBuilder html = new StringBuilder("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" "
                + "style=\"border:1px solid " + ARENA + ";border-radius:12px;background:" + CREMA + ";\">");
        for (int i = 0; i < datos.length; i++) {
            html.append("<tr><td style=\"padding:14px 18px;")
                    .append(i > 0 ? "border-top:1px solid " + ARENA + ";" : "")
                    .append("\">").append(datos[i]).append("</td></tr>");
        }
        return html.append("</table>").toString();
    }

    static String boton(String texto, String url) {
        return "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin:18px auto 0;\"><tr>"
                + "<td style=\"border-radius:10px;background:" + TINTA + ";\">"
                + "<a href=\"" + escapar(url) + "\" target=\"_blank\" style=\"display:inline-block;padding:13px 28px;"
                + "font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;\">" + texto + "</a>"
                + "</td></tr></table>";
    }

    /** El QR sobre blanco, con marco: se lee igual en la puerta. */
    static String marcoQr(String src) {
        return "<div style=\"display:inline-block;background:#ffffff;border:3px solid " + TINTA
                + ";border-radius:16px;padding:14px;\">"
                + "<img src=\"" + src + "\" alt=\"Código QR de tu entrada\" width=\"220\" height=\"220\" style=\"display:block;\">"
                + "</div>";
    }

    /** Texto técnico (códigos, enlaces) en monoespaciada, cortable en cualquier punto. */
    static String codigo(String texto) {
        return "<p style=\"margin:14px 0 0;font-family:" + MONO + ";font-size:11px;color:" + GRIS
                + ";word-break:break-all;\">" + escapar(texto) + "</p>";
    }

    static String centrado(String html) {
        return "<div style=\"text-align:center;\">" + html + "</div>";
    }
}
