package com.asistiapp.backend.services;

import com.icegreen.greenmail.junit5.GreenMailExtension;
import com.icegreen.greenmail.util.ServerSetupTest;
import jakarta.mail.BodyPart;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.mockito.Mockito;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

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

    /**
     * Gmail bloquea las imágenes data: en base64 (el QR llegaba roto): el QR tiene que viajar como
     * imagen inline referenciada por cid:, una parte PNG por entrada.
     */
    @Test
    void confirmacionDeCompra_llevaCadaQrComoImagenInline_noComoDataUri() throws Exception {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost("localhost");
        sender.setPort(smtp.getSmtp().getPort());
        sender.setDefaultEncoding("UTF-8");
        EmailService servicio = new EmailService(sender, new QrImageService());

        servicio.enviarConfirmacionCompra("ana@ejemplo.com", "Ana", "Noche de Demo", "General",
                List.of("QR-AAA", "QR-BBB"));

        MimeMessage mail = unicoMensaje();
        assertThat(mail.getSubject()).isEqualTo("✅ Tus 2 entradas para Noche de Demo — AsistíAPP");
        List<Part> partes = new ArrayList<>();
        recolectar(mail, partes);
        String html = null;
        String texto = null;
        List<String> imagenes = new ArrayList<>();
        for (Part parte : partes) {
            if (parte.isMimeType("text/html")) {
                html = (String) parte.getContent();
            } else if (parte.isMimeType("text/plain")) {
                texto = (String) parte.getContent();
            } else if (parte.isMimeType("image/png")) {
                String[] id = parte.getHeader("Content-ID");
                assertThat(id).isNotNull();
                imagenes.add(id[0]);
                try (InputStream in = parte.getInputStream()) {
                    assertThat(in.readNBytes(4)).containsExactly(0x89, 0x50, 0x4E, 0x47); // firma PNG
                }
            }
        }
        assertThat(html).contains("src=\"cid:qr-entrada-1\"").contains("src=\"cid:qr-entrada-2\"").doesNotContain("data:image");
        // Versión en texto plano (multipart/alternative): lo esencial sin HTML.
        assertThat(texto).contains("Hola Ana, ya tenés tus 2 entradas.").contains("Evento: Noche de Demo")
                .contains("Entrada 1 de 2").contains("Código: QR-AAA").contains("/mi-entrada?codigoQr=QR-BBB")
                .doesNotContain("<");
        assertThat(imagenes).containsExactlyInAnyOrder("<qr-entrada-1>", "<qr-entrada-2>");
    }

    private static void recolectar(Part parte, List<Part> acumulado) throws Exception {
        if (parte.isMimeType("multipart/*")) {
            Multipart multipart = (Multipart) parte.getContent();
            for (int i = 0; i < multipart.getCount(); i++) {
                BodyPart hija = multipart.getBodyPart(i);
                recolectar(hija, acumulado);
            }
        } else {
            acumulado.add(parte);
        }
    }

    @Test
    void siElServidorDeMailNoResponde_elFlujoDeNegocioNoSeRompe() {
        // Diseño intencional (ver CLAUDE.md): un mail que falla solo se loguea, no revienta el reembolso.
        EmailService sinServidor = servicio(1); // puerto donde no escucha nadie

        assertThatCode(() -> sinServidor.enviarNotificacionReembolsoEntradas("a@b.com", "A", "E")).doesNotThrowAnyException();
        assertThatCode(() -> sinServidor.enviarNotificacionReembolsoCreditos("a@b.com", "A", 5)).doesNotThrowAnyException();
    }
}
