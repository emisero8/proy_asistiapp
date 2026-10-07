package com.asistiapp.backend.services;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Base64;

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

    @Value("${app.frontend-base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    private static final int TAMANO_QR_EMAIL_PX = 300;

    /**
     * Envía el email de confirmación de compra con la imagen del código QR
     * embebida inline y un botón para ver la entrada en el frontend.
     *
     * @param emailDestino    email del comprador
     * @param nombreComprador nombre del comprador para personalizar el mensaje
     * @param nombreEvento    nombre del evento
     * @param nombreTanda     nombre de la tanda comprada
     * @param codigoQr        código QR único de la entrada
     * @param entradaId       ID de la entrada, para construir el link "Ver mi entrada"
     */
    @Async
    public void enviarConfirmacionCompra(
            String emailDestino,
            String nombreComprador,
            String nombreEvento,
            String nombreTanda,
            String codigoQr,
            Long entradaId) {

        try {
            byte[] qrPng = qrImageService.generarPng(codigoQr, TAMANO_QR_EMAIL_PX);
            // Base64 data URI: compatible con MailHog y todos los clientes de email.
            // CID inline require soporte explícito del visor (MailHog no lo tiene).
            String qrDataUri = "data:image/png;base64," + Base64.getEncoder().encodeToString(qrPng);
            String ticketUrl = frontendBaseUrl + "/mi-entrada?codigoQr=" + codigoQr;

            MimeMessage mimeMessage = mailSender.createMimeMessage();
            // multipart=false: ya no usamos CID inline, el HTML lleva la imagen embebida
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, false, "UTF-8");
            helper.setTo(emailDestino);
            helper.setSubject("✅ Tu entrada para " + nombreEvento + " — AsistíAPP");
            helper.setText(construirCuerpoEmailHtml(nombreComprador, nombreEvento, nombreTanda, codigoQr, qrDataUri, ticketUrl), true);

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

            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setTo(emailDestino);
            helper.setSubject("Recuperar tu contraseña — AsistíAPP");
            helper.setText(construirCuerpoEmailRecuperacionHtml(nombre, resetUrl), true);

            mailSender.send(mimeMessage);
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
            String codigoQr,
            String qrDataUri,
            String ticketUrl) {

        return String.format("""
                <html>
                <body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f4f4f7;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
                    <tr><td align="center">
                      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

                        <!-- Header -->
                        <tr>
                          <td style="background:#09090b;padding:28px 40px;text-align:center;">
                            <span style="font-size:26px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">Asist&iacute;<span style="color:#9cadd3;">APP</span></span>
                          </td>
                        </tr>

                        <!-- Hero: evento confirmado -->
                        <tr>
                          <td style="background:#f0f4ff;padding:28px 40px 20px;text-align:center;border-bottom:1px solid #e8eaf0;">
                            <div style="font-size:36px;margin-bottom:8px;">&#127881;</div>
                            <h2 style="margin:0 0 4px;font-size:20px;font-weight:800;color:#111827;">&#161;Compra confirmada!</h2>
                            <p style="margin:0;font-size:14px;color:#6b7280;">Hola <strong style="color:#111827;">%s</strong>, ya ten&eacute;s tu entrada.</p>
                          </td>
                        </tr>

                        <!-- Detalle del evento -->
                        <tr>
                          <td style="padding:28px 40px 0;">
                            <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
                              <tr>
                                <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                                  <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;font-weight:600;">Evento</span><br>
                                  <span style="font-size:16px;font-weight:700;color:#111827;">%s</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding:16px 20px;">
                                  <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;font-weight:600;">Tanda</span><br>
                                  <span style="font-size:14px;font-weight:600;color:#374151;">%s</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <!-- QR central -->
                        <tr>
                          <td style="padding:32px 40px 8px;text-align:center;">
                            <p style="margin:0 0 16px;font-size:14px;color:#374151;font-weight:600;">&#128197; Mostr&aacute; este c&oacute;digo QR en la puerta del evento</p>
                            <div style="display:inline-block;background:#ffffff;border:3px solid #09090b;border-radius:16px;padding:14px;box-shadow:0 4px 20px rgba(0,0,0,0.12);">
                              <img src="%s" alt="Código QR de tu entrada" width="260" height="260" style="display:block;">
                            </div>
                            <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;word-break:break-all;">Cód: %s</p>
                          </td>
                        </tr>

                        <!-- CTA: Ver mi entrada -->
                        <tr>
                          <td style="padding:24px 40px 32px;text-align:center;">
                            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                              <tr>
                                <td style="border-radius:12px;background:#09090b;">
                                  <a href="%s" target="_blank"
                                     style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:-0.2px;">
                                    &#127915; Ver mi entrada
                                  </a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                          <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #f3f4f6;">
                            <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">Guard&aacute; este email como comprobante de tu compra.</p>
                            <p style="margin:0;font-size:12px;color:#9ca3af;">El equipo de <strong>AsistíAPP</strong></p>
                          </td>
                        </tr>

                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """,
                nombreComprador,
                nombreEvento,
                nombreTanda,
                qrDataUri,
                codigoQr,
                ticketUrl
        );
    }

    private String construirCuerpoEmailRecuperacionHtml(String nombre, String resetUrl) {
        return String.format("""
                <html>
                <body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f4f4f7;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
                    <tr><td align="center">
                      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                        <!-- Header -->
                        <tr>
                          <td style="background:#09090b;padding:28px 40px;text-align:center;">
                            <span style="font-size:26px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">Asist&iacute;<span style="color:#9cadd3;">APP</span></span>
                          </td>
                        </tr>
                        <!-- Body -->
                        <tr>
                          <td style="padding:40px 40px 32px;">
                            <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Restablecer contrase&ntilde;a</h2>
                            <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">Hola <strong style="color:#111827;">%s</strong>, recibimos una solicitud para restablecer tu contrase&ntilde;a en AsistíAPP.</p>
                            <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.6;">Hac&eacute; clic en el bot&oacute;n de abajo para crear una nueva contrase&ntilde;a. Este enlace es v&aacute;lido por <strong style="color:#111827;">30 minutos</strong>.</p>
                            <!-- CTA Button -->
                            <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                              <tr>
                                <td style="border-radius:12px;background:#09090b;">
                                  <a href="%s" target="_blank"
                                     style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:-0.2px;">
                                    🔑 Recuperar Contrase&ntilde;a
                                  </a>
                                </td>
                              </tr>
                            </table>
                            <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;">Si el bot&oacute;n no funciona, copi&aacute; y peg&aacute; este enlace en tu navegador:</p>
                            <p style="margin:0 0 24px;font-size:11px;color:#9cadd3;word-break:break-all;">%s</p>
                            <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;">
                            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">Si no solicitaste este cambio, pod&eacute;s ignorar este email con tranquilidad. Tu contrase&ntilde;a actual sigue siendo la misma.</p>
                          </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                          <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #f3f4f6;">
                            <p style="margin:0;font-size:12px;color:#9ca3af;">El equipo de <strong>AsistíAPP</strong></p>
                          </td>
                        </tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """,
                nombre, resetUrl, resetUrl
        );
    }
}
