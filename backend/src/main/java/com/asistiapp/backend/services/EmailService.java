package com.asistiapp.backend.services;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import static com.asistiapp.backend.services.PlantillaEmail.*;

/**
 * Servicio de envío de correos electrónicos vía SMTP.
 *
 * Los métodos son @Async para no bloquear el hilo principal de la petición HTTP.
 * El comprador recibe su confirmación mientras la respuesta ya llegó al cliente.
 *
 * Configuración SMTP en application.yml (spring.mail.*).
 *
 * Todos los mails salen en HTML con el diseño de {@link PlantillaEmail} y con una versión en texto plano
 * (multipart/alternative): los filtros de spam desconfían de los mails solo-HTML y los clientes sin HTML
 * igual muestran lo esencial.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final QrImageService qrImageService;

    @Value("${app.frontend-base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    /**
     * Remitente de todos los mails (MAIL_FROM). Vacío = lo decide el servidor SMTP (con Gmail, la cuenta
     * autenticada). Los servicios que exigen un remitente verificado (Brevo, etc.) lo necesitan.
     */
    @Value("${app.mail.from:}")
    private String remitente;

    private static final int TAMANO_QR_EMAIL_PX = 300;

    /**
     * Envía UN SOLO email de confirmación de compra con el código QR de cada entrada
     * comprada (una compra de varias entradas manda un mail, no uno por entrada).
     * Cada QR va embebido inline y con su propio botón "Ver mi entrada".
     *
     * @param emailDestino    email del comprador
     * @param nombreComprador nombre del comprador para personalizar el mensaje
     * @param nombreEvento    nombre del evento (todas las entradas de una misma
     *                        compra son de la misma tanda, así que comparten evento)
     * @param nombreTanda     nombre de la tanda comprada
     * @param codigosQr       código QR de cada entrada comprada, en el orden a mostrar
     */
    @Async
    public void enviarConfirmacionCompra(
            String emailDestino,
            String nombreComprador,
            String nombreEvento,
            String nombreTanda,
            List<String> codigosQr) {

        try {
            int total = codigosQr.size();
            StringBuilder bloques = new StringBuilder();
            StringBuilder textoEntradas = new StringBuilder();
            List<byte[]> imagenesQr = new ArrayList<>();
            for (int i = 0; i < total; i++) {
                String codigoQr = codigosQr.get(i);
                imagenesQr.add(qrImageService.generarPng(codigoQr, TAMANO_QR_EMAIL_PX));
                String ticketUrl = frontendBaseUrl + "/mi-entrada?codigoQr=" + codigoQr;
                // El QR viaja como imagen inline (cid:), no como data: URI en base64: Gmail (y otros
                // clientes) bloquean las imágenes data: y mostraban el QR roto. MailHog no resuelve
                // cid: en su vista HTML, pero ahí el botón "Ver mi entrada" lleva al QR igual.
                bloques.append(construirBloqueEntrada(i + 1, total, "cid:" + cidDelQr(i), codigoQr, ticketUrl));
                if (total > 1) {
                    textoEntradas.append("Entrada ").append(i + 1).append(" de ").append(total).append("\n");
                }
                textoEntradas.append("Código: ").append(codigoQr).append("\n")
                        .append("Ver mi entrada (con el QR): ").append(ticketUrl).append("\n\n");
            }

            String asunto = total == 1
                    ? "✅ Tu entrada para " + nombreEvento + " — AsistíAPP"
                    : "✅ Tus " + total + " entradas para " + nombreEvento + " — AsistíAPP";
            String cuantas = total == 1 ? "tu entrada" : "tus " + total + " entradas";
            String textoPlano = "¡Compra confirmada!\n"
                    + "Hola " + nombreComprador + ", ya tenés " + cuantas + ".\n\n"
                    + "Evento: " + nombreEvento + "\n"
                    + "Tanda: " + nombreTanda + "\n\n"
                    + textoEntradas
                    + "Mostrá el código QR en la puerta del evento.\n"
                    + "Guardá este email como comprobante de tu compra.\n— AsistíAPP\n";
            // El nombre del comprador lo escribe cualquiera (la compra es pública): se escapa para que no
            // pueda meter HTML ni enlaces en un mail que sale con el remitente de AsistíAPP.
            String html = documento(Tono.COMPRA, "¡Compra confirmada!",
                    "Hola " + destacado(escapar(nombreComprador)) + ", ya tenés " + cuantas + ".",
                    fila(recuadro(dato("Evento", nombreEvento), dato("Tanda", nombreTanda)))
                            + bloques);

            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = armarMensaje(mimeMessage, emailDestino, asunto, textoPlano, html);
            // Las imágenes inline se agregan después del texto HTML que las referencia.
            for (int i = 0; i < imagenesQr.size(); i++) {
                helper.addInline(cidDelQr(i), new ByteArrayResource(imagenesQr.get(i)), "image/png");
            }

            mailSender.send(mimeMessage);
            log.info("Email de confirmación enviado a: {} ({} entrada[s]) para el evento: {}",
                    emailDestino, total, nombreEvento);

        } catch (Exception e) {
            // El fallo de email NO debe revertir la compra.
            // Loguear el error y continuar — los QR ya fueron generados y guardados en BD.
            log.error("Error al enviar email de confirmación a {}: {}", emailDestino, e.getMessage());
        }
    }

    /**
     * Envía las credenciales de acceso a un miembro de Staff recién dado de alta
     * por el Organizador (CU-005, CU-006). Si el envío falla, no revierte el alta
     * — se loguea el error para que el Organizador informe la contraseña manualmente.
     *
     * @param emailDestino     email del nuevo Staff
     * @param nombre           nombre del nuevo Staff
     * @param rolDescripcion   descripción legible del rol ("Staff QR" / "Staff Vendedor")
     * @param passwordTemporal contraseña generada, en texto plano (solo viaja por este email)
     */
    @Async
    public void enviarCredencialesStaff(
            String emailDestino,
            String nombre,
            String rolDescripcion,
            String passwordTemporal) {

        try {
            String texto = String.format("""
                    Hola %s,

                    Fuiste dado de alta como %s en AsistíAPP. Estas son tus credenciales:

                    📧 Usuario: %s
                    🔑 Contraseña temporal: %s

                    Por seguridad, te recomendamos cambiar la contraseña después de tu primer inicio de sesión.

                    El equipo de AsistíAPP
                    """,
                    nombre, rolDescripcion, emailDestino, passwordTemporal);
            String html = documento(Tono.CUENTA, "Ya sos parte del equipo",
                    "Hola " + destacado(escapar(nombre)) + ", fuiste dado de alta como "
                            + destacado(escapar(rolDescripcion)) + " en AsistíAPP.",
                    fila(recuadro(dato("Usuario", emailDestino), dato("Contraseña temporal", passwordTemporal))
                            + parrafo("Por seguridad, te recomendamos cambiar la contraseña después de tu primer inicio de sesión.")));

            enviar(emailDestino, "Tus credenciales de acceso — AsistíAPP", texto, html);
            log.info("Credenciales de Staff enviadas a: {} ({})", emailDestino, rolDescripcion);

        } catch (Exception e) {
            log.error("Error al enviar credenciales de Staff a {}: {}", emailDestino, e.getMessage());
        }
    }

    /**
     * Envía el enlace para restablecer la contraseña (CU-003).
     * El link apunta al frontend (/organizador/recuperar-password?token=...) donde
     * el usuario ingresa su nueva contraseña. Email en formato HTML con botón CTA.
     *
     * @param emailDestino email del usuario que solicitó la recuperación
     * @param nombre       nombre del usuario para personalizar el mensaje
     * @param token        token de un solo uso generado por PasswordRecoveryService
     */
    @Async
    public void enviarEmailRecuperacion(String emailDestino, String nombre, String token) {
        try {
            String resetUrl = frontendBaseUrl + "/organizador/recuperar-password?token=" + token;
            String texto = String.format("""
                    Hola %s,

                    Recibimos una solicitud para restablecer tu contraseña en AsistíAPP.
                    Para crear una nueva contraseña, abrí este enlace (es válido por 30 minutos):

                    %s

                    Si no solicitaste este cambio, podés ignorar este email con tranquilidad. Tu contraseña
                    actual sigue siendo la misma.

                    El equipo de AsistíAPP
                    """,
                    nombre, resetUrl);
            String html = documento(Tono.CUENTA, "Restablecer contraseña",
                    "Hola " + destacado(escapar(nombre)) + ", recibimos tu solicitud.",
                    fila(centrado(parrafo("Recibimos una solicitud para restablecer tu contraseña en AsistíAPP. "
                            + "Tocá el botón para crear una nueva. Este enlace es válido por " + destacado("30 minutos") + ".")
                            + boton("Recuperar contraseña", resetUrl)
                            + nota("Si el botón no funciona, copiá y pegá este enlace en tu navegador:")
                            + codigo(resetUrl)
                            + nota("Si no solicitaste este cambio, podés ignorar este email con tranquilidad. "
                            + "Tu contraseña actual sigue siendo la misma."))));

            enviar(emailDestino, "Recuperar tu contraseña — AsistíAPP", texto, html);
            log.info("Email de recuperación de contraseña enviado a: {}", emailDestino);

        } catch (Exception e) {
            log.error("Error al enviar email de recuperación a {}: {}", emailDestino, e.getMessage());
        }
    }

    /**
     * Notifica a un comprador que el evento de su entrada fue cancelado.
     * Se dispara una vez por cada Entrada asociada al evento al cancelarlo
     * (EventoService/AdminEventoService). No implica reembolso automático
     * — eso requeriría integrar la API de reembolsos de MercadoPago, fuera
     * de alcance por ahora.
     *
     * @param emailDestino   email del comprador
     * @param nombreComprador nombre del comprador
     * @param nombreEvento   nombre del evento cancelado
     */
    @Async
    public void enviarNotificacionCancelacion(String emailDestino, String nombreComprador, String nombreEvento) {
        try {
            String texto = String.format("""
                    Hola %s,

                    Lamentamos informarte que el evento "%s" fue cancelado por el organizador.

                    Tu entrada ya no es válida para el ingreso. Por consultas sobre reembolsos,
                    contactá directamente al organizador del evento.

                    El equipo de AsistíAPP
                    """,
                    nombreComprador, nombreEvento);
            String html = documento(Tono.BAJA, "Evento cancelado",
                    "Hola " + escapar(nombreComprador),
                    fila(recuadro(dato("Evento", nombreEvento))
                            + parrafo("Lamentamos informarte que el evento fue cancelado por el organizador.")
                            + parrafo("Tu entrada ya no es válida para el ingreso. Por consultas sobre reembolsos, "
                            + "contactá directamente al organizador del evento.")));

            enviar(emailDestino, "Evento cancelado: " + nombreEvento + " — AsistíAPP", texto, html);
            log.info("Notificación de cancelación enviada a: {} para el evento: {}", emailDestino, nombreEvento);

        } catch (Exception e) {
            log.error("Error al enviar notificación de cancelación a {}: {}", emailDestino, e.getMessage());
        }
    }

    /**
     * Avisa al comprador que se le devolvió el dinero de una compra de entradas que no se
     * pudo entregar (ej. se agotó el cupo entre iniciar el pago y que MercadoPago lo aprobara).
     * El reembolso en sí ya se hizo contra la API de MP antes de llamar a este método — esto
     * es solo la notificación, para que no se entere únicamente por el aviso de MercadoPago.
     */
    @Async
    public void enviarNotificacionReembolsoEntradas(String emailDestino, String nombreComprador, String nombreEvento) {
        try {
            String texto = String.format("""
                    Hola %s,

                    Lamentablemente tu compra para "%s" no se pudo completar (se agotaron las
                    entradas disponibles justo antes de confirmar tu pago). Ya te devolvimos el
                    dinero a través de MercadoPago — deberías verlo reflejado en los próximos días
                    según el medio de pago que hayas usado.

                    Disculpá las molestias. Podés volver a intentar la compra desde la página del
                    evento si todavía hay entradas disponibles.

                    El equipo de AsistíAPP
                    """,
                    nombreComprador, nombreEvento);
            String html = documento(Tono.REEMBOLSO, "Te devolvimos tu pago",
                    "Hola " + escapar(nombreComprador),
                    fila(recuadro(dato("Evento", nombreEvento))
                            + parrafo("Lamentablemente tu compra no se pudo completar (se agotaron las entradas disponibles "
                            + "justo antes de confirmar tu pago). Ya te devolvimos el dinero a través de MercadoPago — "
                            + "deberías verlo reflejado en los próximos días según el medio de pago que hayas usado.")
                            + parrafo("Disculpá las molestias. Podés volver a intentar la compra desde la página del evento "
                            + "si todavía hay entradas disponibles.")));

            enviar(emailDestino, "Te devolvimos tu pago — " + nombreEvento + " — AsistíAPP", texto, html);
            log.info("Notificación de reembolso (entradas) enviada a: {} para el evento: {}", emailDestino, nombreEvento);

        } catch (Exception e) {
            log.error("Error al enviar notificación de reembolso a {}: {}", emailDestino, e.getMessage());
        }
    }

    /**
     * Avisa a quien tenía una entrada que el Organizador la anuló (8.6). No dice el motivo: es una nota interna.
     * Si hubo reembolso va en otro mail ({@link #enviarNotificacionReembolsoOrganizador}).
     */
    @Async
    public void enviarNotificacionEntradaAnulada(String emailDestino, String nombreComprador, String nombreEvento) {
        try {
            String texto = String.format("""
                    Hola %s,

                    El organizador de "%s" anuló tu entrada, por lo que ya no tiene validez para
                    ingresar al evento.

                    Si tenés dudas, comunicate directamente con el organizador del evento.

                    El equipo de AsistíAPP
                    """,
                    nombreComprador, nombreEvento);
            String html = documento(Tono.BAJA, "Tu entrada fue anulada",
                    "Hola " + escapar(nombreComprador),
                    fila(recuadro(dato("Evento", nombreEvento))
                            + parrafo("El organizador anuló tu entrada, por lo que ya no tiene validez para ingresar al evento.")
                            + parrafo("Si tenés dudas, comunicate directamente con el organizador del evento.")));

            enviar(emailDestino, "Tu entrada fue anulada — " + nombreEvento + " — AsistíAPP", texto, html);
            log.info("Aviso de entrada anulada enviado a: {} para el evento: {}", emailDestino, nombreEvento);

        } catch (Exception e) {
            log.error("Error al enviar el aviso de entrada anulada a {}: {}", emailDestino, e.getMessage());
        }
    }

    /** Avisa que el Organizador le devolvió el dinero de su compra (anulación o evento cancelado), ya hecho en Mercado Pago (8.6). */
    @Async
    public void enviarNotificacionReembolsoOrganizador(String emailDestino, String nombreComprador, String nombreEvento, double monto) {
        try {
            String importe = String.format(Locale.forLanguageTag("es-AR"), "$%,.2f", monto);
            String texto = String.format("""
                    Hola %s,

                    El organizador de "%s" te devolvió %s de tu compra, a través de Mercado Pago.
                    Deberías verlo reflejado en los próximos días según el medio de pago que hayas usado.

                    El equipo de AsistíAPP
                    """,
                    nombreComprador, nombreEvento, importe);
            String html = documento(Tono.REEMBOLSO, "Te devolvimos tu dinero",
                    "Hola " + escapar(nombreComprador),
                    fila(recuadro(dato("Evento", nombreEvento), dato("Importe devuelto", importe))
                            + parrafo("El organizador te devolvió ese importe de tu compra, a través de Mercado Pago. "
                            + "Deberías verlo reflejado en los próximos días según el medio de pago que hayas usado.")));

            enviar(emailDestino, "Te devolvimos tu dinero — " + nombreEvento + " — AsistíAPP", texto, html);
            log.info("Aviso de reembolso enviado a: {} para el evento: {}", emailDestino, nombreEvento);

        } catch (Exception e) {
            log.error("Error al enviar el aviso de reembolso a {}: {}", emailDestino, e.getMessage());
        }
    }

    /**
     * Avisa al Organizador que se le devolvió el dinero de una compra de créditos que no se
     * pudo acreditar. El reembolso en sí ya se hizo contra la API de MP antes de llamar a
     * este método — esto es solo la notificación.
     */
    @Async
    public void enviarNotificacionReembolsoCreditos(String emailDestino, String nombreOrganizador, Integer cantidadCreditos) {
        try {
            String descripcionCreditos = cantidadCreditos != null ? cantidadCreditos + " créditos" : "los créditos";
            String texto = String.format("""
                    Hola %s,

                    Tu compra de %s no se pudo acreditar y ya te devolvimos el dinero a través de
                    MercadoPago — deberías verlo reflejado en los próximos días según el medio de
                    pago que hayas usado.

                    Disculpá las molestias. Podés volver a intentar la compra desde la sección de
                    Créditos de tu panel.

                    El equipo de AsistíAPP
                    """,
                    nombreOrganizador, descripcionCreditos);
            String html = documento(Tono.REEMBOLSO, "Te devolvimos tu pago",
                    "Hola " + escapar(nombreOrganizador),
                    fila((cantidadCreditos != null ? recuadro(dato("Compra", descripcionCreditos)) : "")
                            + parrafo("Tu compra de " + descripcionCreditos + " no se pudo acreditar y ya te devolvimos el dinero "
                            + "a través de MercadoPago — deberías verlo reflejado en los próximos días según el medio de "
                            + "pago que hayas usado.")
                            + parrafo("Disculpá las molestias. Podés volver a intentar la compra desde la sección de Créditos "
                            + "de tu panel.")));

            enviar(emailDestino, "Te devolvimos tu pago — AsistíAPP", texto, html);
            log.info("Notificación de reembolso (créditos) enviada a: {}", emailDestino);

        } catch (Exception e) {
            log.error("Error al enviar notificación de reembolso de créditos a {}: {}", emailDestino, e.getMessage());
        }
    }

    private void enviar(String destino, String asunto, String textoPlano, String html)
            throws jakarta.mail.MessagingException {
        MimeMessage mimeMessage = mailSender.createMimeMessage();
        armarMensaje(mimeMessage, destino, asunto, textoPlano, html);
        mailSender.send(mimeMessage);
    }

    private MimeMessageHelper armarMensaje(MimeMessage mimeMessage, String destino, String asunto,
                                           String textoPlano, String html) throws jakarta.mail.MessagingException {
        MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED, "UTF-8");
        helper.setTo(destino);
        if (remitente != null && !remitente.isBlank()) helper.setFrom(remitente.trim());
        helper.setSubject(asunto);
        helper.setText(textoPlano, html);
        return helper;
    }

    private static String cidDelQr(int indice) {
        return "qr-entrada-" + (indice + 1);
    }

    /** Corte punteado, QR y botón de cada entrada. "Entrada N de M" solo si hay más de una. */
    private static String construirBloqueEntrada(int numero, int total, String qrSrc, String codigoQr, String ticketUrl) {
        String etiqueta = total > 1
                ? "<p style=\"margin:0 0 6px;\">" + rotulo("Entrada " + numero + " de " + total) + "</p>"
                : "";
        return troquel() + fila(centrado(etiqueta
                + "<p style=\"margin:0 0 14px;font-size:14px;\">" + destacado("Mostrá este código QR en la puerta del evento") + "</p>"
                + marcoQr(qrSrc)
                + codigo(codigoQr)
                + boton("Ver mi entrada", ticketUrl)
                + (numero == total ? nota("Guardá este email como comprobante de tu compra.") : "")));
    }
}
