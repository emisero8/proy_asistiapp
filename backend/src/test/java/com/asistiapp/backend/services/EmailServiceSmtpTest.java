package com.asistiapp.backend.services;

import com.icegreen.greenmail.junit5.GreenMailExtension;
import com.icegreen.greenmail.util.ServerSetupTest;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.mockito.Mockito;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * Los mails de reembolso salen de verdad por SMTP: GreenMail hace de servidor (el rol que en
 * desarrollo cumple MailHog) y se verifica lo que realmente llega, incluida la codificación de los
 * acentos y del guion largo del asunto, que los tests con un JavaMailSender de mentira no ven.
 */
class EmailServiceSmtpTest {

    @RegisterExtension
    static final GreenMailExtension smtp = new GreenMailExtension(ServerSetupTest.SMTP);

    private EmailService servicio(int puerto) {
        // Igual que la autoconfiguración de Spring Boot con spring.mail.host/port (default-encoding UTF-8).
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost("localhost");
        sender.setPort(puerto);
        sender.setDefaultEncoding("UTF-8");
        return new EmailService(sender, Mockito.mock(QrImageService.class));
    }

    /** El cuerpo ya decodificado (quoted-printable, UTF-8), como lo vería quien abre el mail. */
    private String cuerpo(MimeMessage mail) throws Exception {
        return (String) mail.getContent();
    }

    private MimeMessage unicoMensaje() {
        MimeMessage[] recibidos = smtp.getReceivedMessages();
        assertThat(recibidos).hasSize(1);
        return recibidos[0];
    }

    @Test
    void reembolsoDeEntradas_llegaAlComprador_conAcentosIntactos() throws Exception {
        servicio(smtp.getSmtp().getPort())
                .enviarNotificacionReembolsoEntradas("maria@ejemplo.com", "María Peña", "Festival de la Ñ");

        MimeMessage mail = unicoMensaje();
        assertThat(mail.getAllRecipients()[0].toString()).isEqualTo("maria@ejemplo.com");
        assertThat(mail.getSubject()).isEqualTo("Te devolvimos tu pago — Festival de la Ñ — AsistíAPP");
        String texto = cuerpo(mail);
        assertThat(texto).contains("Hola María Peña,").contains("\"Festival de la Ñ\"").contains("Disculpá las molestias");
        assertThat(mail.getContentType()).containsIgnoringCase("utf-8");
    }

    @Test
    void reembolsoDeCreditos_llegaAlOrganizador_conLaCantidad() throws Exception {
        servicio(smtp.getSmtp().getPort())
                .enviarNotificacionReembolsoCreditos("org@ejemplo.com", "Óscar", 50);

        MimeMessage mail = unicoMensaje();
        assertThat(mail.getAllRecipients()[0].toString()).isEqualTo("org@ejemplo.com");
        assertThat(mail.getSubject()).isEqualTo("Te devolvimos tu pago — AsistíAPP");
        assertThat(cuerpo(mail)).contains("Hola Óscar,").contains("Tu compra de 50 créditos no se pudo acreditar");
    }

    @Test
    void reembolsoDeCreditos_sinCantidad_diceLosCreditos() throws Exception {
        servicio(smtp.getSmtp().getPort())
                .enviarNotificacionReembolsoCreditos("org@ejemplo.com", "Óscar", null);

        assertThat(cuerpo(unicoMensaje())).contains("Tu compra de los créditos no se pudo acreditar");
    }

    @Test
    void siElServidorDeMailNoResponde_elFlujoDeNegocioNoSeRompe() {
        // Diseño intencional (ver CLAUDE.md): un mail que falla solo se loguea, no revienta el reembolso.
        EmailService sinServidor = servicio(1); // puerto donde no escucha nadie

        assertThatCode(() -> sinServidor.enviarNotificacionReembolsoEntradas("a@b.com", "A", "E")).doesNotThrowAnyException();
        assertThatCode(() -> sinServidor.enviarNotificacionReembolsoCreditos("a@b.com", "A", 5)).doesNotThrowAnyException();
    }
}
