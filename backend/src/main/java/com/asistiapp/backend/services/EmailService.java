package com.asistiapp.backend.services;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Servicio de envío de correos electrónicos vía SMTP.
 *
 * Los métodos son @Async para no bloquear el hilo principal de la petición HTTP.
 * El comprador recibe su confirmación mientras la respuesta ya llegó al cliente.
 *
 * Configuración SMTP en application.yml (spring.mail.*).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final QrImageService qrImageService;

    private static final int TAMANO_QR_EMAIL_PX = 300;

    /**
     * Envía el email de confirmación de compra con la imagen del código QR
     * embebida inline (Fase 16) — antes solo se enviaba el string como texto.
     *
     * @param emailDestino   email del comprador
     * @param nombreComprador nombre del comprador para personalizar el mensaje
     * @param nombreEvento   nombre del evento
     * @param nombreTanda    nombre de la tanda comprada
     * @param codigoQr       código QR único de la entrada
     */
    @Async
    public void enviarConfirmacionCompra(
            String emailDestino,
            String nombreComprador,
            String nombreEvento,
            String nombreTanda,
            String codigoQr) {

        try {
            byte[] qrPng = qrImageService.generarPng(codigoQr, TAMANO_QR_EMAIL_PX);

            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setTo(emailDestino);
            helper.setSubject("✅ Tu entrada para " + nombreEvento + " — AsistíAPP");
            helper.setText(construirCuerpoEmailHtml(nombreComprador, nombreEvento, nombreTanda, codigoQr), true);
            helper.addInline("qrImage", new ByteArrayResource(qrPng), "image/png");

            mailSender.send(mimeMessage);
            log.info("Email de confirmación enviado a: {} para el evento: {}", emailDestino, nombreEvento);

        } catch (Exception e) {
            // El fallo de email NO debe revertir la compra.
            // Loguear el error y continuar — el QR ya fue generado y guardado en BD.
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
            SimpleMailMessage mensaje = new SimpleMailMessage();
            mensaje.setTo(emailDestino);
            mensaje.setSubject("Tus credenciales de acceso — AsistíAPP");
            mensaje.setText(String.format("""
                    Hola %s,

                    Fuiste dado de alta como %s en AsistíAPP. Estas son tus credenciales:

                    📧 Usuario: %s
                    🔑 Contraseña temporal: %s

                    Por seguridad, te recomendamos cambiar la contraseña después de tu primer inicio de sesión.

                    El equipo de AsistíAPP
                    """,
                    nombre, rolDescripcion, emailDestino, passwordTemporal));

            mailSender.send(mensaje);
            log.info("Credenciales de Staff enviadas a: {} ({})", emailDestino, rolDescripcion);

        } catch (Exception e) {
            log.error("Error al enviar credenciales de Staff a {}: {}", emailDestino, e.getMessage());
        }
    }

    /**
     * Envía el enlace para restablecer la contraseña (CU-003).
     * El link apunta al frontend, que toma el token de la URL y lo manda
     * a PasswordRecoveryService.restablecerPassword() junto a la nueva contraseña.
     *
     * @param emailDestino email del usuario que solicitó la recuperación
     * @param nombre       nombre del usuario para personalizar el mensaje
     * @param token        token de un solo uso generado por PasswordRecoveryService
     */
    @Async
    public void enviarEmailRecuperacion(String emailDestino, String nombre, String token) {
        try {
            SimpleMailMessage mensaje = new SimpleMailMessage();
            mensaje.setTo(emailDestino);
            mensaje.setSubject("Recuperar tu contraseña — AsistíAPP");
            mensaje.setText(String.format("""
                    Hola %s,

                    Recibimos una solicitud para restablecer tu contraseña en AsistíAPP.

                    🔑 Token de recuperación: %s

                    Este enlace/token es válido por 30 minutos. Si no solicitaste este cambio, podés ignorar este email.

                    El equipo de AsistíAPP
                    """,
                    nombre, token));

            mailSender.send(mensaje);
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
            SimpleMailMessage mensaje = new SimpleMailMessage();
            mensaje.setTo(emailDestino);
            mensaje.setSubject("Evento cancelado: " + nombreEvento + " — AsistíAPP");
            mensaje.setText(String.format("""
                    Hola %s,

                    Lamentamos informarte que el evento "%s" fue cancelado por el organizador.

                    Tu entrada ya no es válida para el ingreso. Por consultas sobre reembolsos,
                    contactá directamente al organizador del evento.

                    El equipo de AsistíAPP
                    """,
                    nombreComprador, nombreEvento));

            mailSender.send(mensaje);
            log.info("Notificación de cancelación enviada a: {} para el evento: {}", emailDestino, nombreEvento);

        } catch (Exception e) {
            log.error("Error al enviar notificación de cancelación a {}: {}", emailDestino, e.getMessage());
        }
    }

    private String construirCuerpoEmailHtml(
            String nombreComprador,
            String nombreEvento,
            String nombreTanda,
            String codigoQr) {

        return String.format("""
                <html>
                <body style="font-family: sans-serif; color: #222;">
                    <p>Hola %s,</p>
                    <p>¡Tu compra fue confirmada! Aquí están los detalles de tu entrada:</p>
                    <p>
                        🎉 Evento: <strong>%s</strong><br>
                        🎫 Tanda: <strong>%s</strong><br>
                        🔑 Código QR: <strong>%s</strong>
                    </p>
                    <p>Presentá este código QR en la puerta del evento para ingresar:</p>
                    <p><img src="cid:qrImage" alt="Código QR de tu entrada" width="300" height="300"></p>
                    <p>Guardá este email como comprobante.</p>
                    <p>¡Nos vemos en el evento!<br>El equipo de AsistíAPP</p>
                </body>
                </html>
                """,
                nombreComprador,
                nombreEvento,
                nombreTanda,
                codigoQr
        );
    }
}
