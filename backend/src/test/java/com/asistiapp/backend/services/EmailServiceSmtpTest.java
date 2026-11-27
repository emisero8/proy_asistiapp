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
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * Los mails salen de verdad por SMTP: GreenMail hace de servidor (el rol que en
 * desarrollo cumple MailHog) y se verifica lo que realmente llega, incluida la codificación de los
 * acentos y del guion largo del asunto, que los tests con un JavaMailSender de mentira no ven.
 */
class EmailServiceSmtpTest {

    @RegisterExtension
    static final GreenMailExtension smtp = new GreenMailExtension(ServerSetupTest.SMTP);

    private EmailService servicio(int puerto) {
        return new EmailService(sender(puerto), Mockito.mock(QrImageService.class));
    }

    /** La versión en texto plano ya decodificada (quoted-printable, UTF-8). */
    private String cuerpo(MimeMessage mail) throws Exception {
        return parteDeTipo(mail, "text/plain");
    }

    /** La versión HTML, la que muestra un cliente de correo normal. */
    private String html(MimeMessage mail) throws Exception {
        return parteDeTipo(mail, "text/html");
    }

    private static String parteDeTipo(MimeMessage mail, String tipo) throws Exception {
        List<Part> partes = new ArrayList<>();
        recolectar(mail, partes);
        for (Part parte : partes) {
            if (parte.isMimeType(tipo)) {
                return (String) parte.getContent();
            }
        }
        throw new AssertionError("El mail no trae una parte " + tipo);
    }

    private MimeMessage unicoMensaje() {
        MimeMessage[] recibidos = smtp.getReceivedMessages();
        assertThat(recibidos).hasSize(1);
        return recibidos[0];
    }

    @Test
    void conMailFromConfigurado_todosLosMailsSalenConEseRemitente() throws Exception {
        EmailService servicio = servicio(smtp.getSmtp().getPort());
        ReflectionTestUtils.setField(servicio, "remitente", "demo@asistiapp.com");

        servicio.enviarNotificacionCancelacion("maria@ejemplo.com", "María", "Festival");
        servicio.enviarEmailRecuperacion("maria@ejemplo.com", "María", "token-123");

        MimeMessage[] recibidos = smtp.getReceivedMessages();
        assertThat(recibidos).hasSize(2);
        for (MimeMessage mail : recibidos) {
            assertThat(mail.getFrom()[0].toString()).isEqualTo("demo@asistiapp.com");
        }
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
        assertThat(html(mail)).contains("Festival de la Ñ").contains("Disculpá las molestias");
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
        EmailService servicio = new EmailService(sender(smtp.getSmtp().getPort()), new QrImageService());

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

    @Test
    void confirmacionDeCompra_escapaElHtmlDelNombreDelComprador() throws Exception {
        // La compra es pública: quien compra elige el nombre. No puede colar HTML ni enlaces en el mail.
        EmailService servicio = new EmailService(sender(smtp.getSmtp().getPort()), new QrImageService());

        servicio.enviarConfirmacionCompra("ana@ejemplo.com", "<a href=\"http://malo.example\">Ingresá acá</a>",
                "Noche <b>de</b> Demo", "General", List.of("QR-AAA"));

        List<Part> partes = new ArrayList<>();
        recolectar(unicoMensaje(), partes);
        String html = null;
        for (Part parte : partes) {
            if (parte.isMimeType("text/html")) {
                html = (String) parte.getContent();
            }
        }
        assertThat(html).doesNotContain("http://malo.example\"").doesNotContain("<a href=\"http://malo")
                .doesNotContain("<b>de</b>")
                .contains("&lt;a href=&quot;http://malo.example&quot;&gt;").contains("Noche &lt;b&gt;de&lt;/b&gt; Demo");
    }

    /** Los ocho mails comparten diseño: HTML en español, con la marca, y su versión en texto plano. */
    @Test
    void todosLosMails_llevanElDisenoComunYSuVersionEnTextoPlano() throws Exception {
        EmailService servicio = new EmailService(sender(smtp.getSmtp().getPort()), new QrImageService());

        servicio.enviarConfirmacionCompra("a@ejemplo.com", "Ana", "Festival", "General", List.of("QR-AAA"));
        servicio.enviarEmailRecuperacion("a@ejemplo.com", "Ana", "token-123");
        servicio.enviarCredencialesStaff("a@ejemplo.com", "Ana", "Staff QR", "clave-temporal");
        servicio.enviarNotificacionCancelacion("a@ejemplo.com", "Ana", "Festival");
        servicio.enviarNotificacionReembolsoEntradas("a@ejemplo.com", "Ana", "Festival");
        servicio.enviarNotificacionEntradaAnulada("a@ejemplo.com", "Ana", "Festival");
        servicio.enviarNotificacionReembolsoOrganizador("a@ejemplo.com", "Ana", "Festival", 1234.5);
        servicio.enviarNotificacionReembolsoCreditos("a@ejemplo.com", "Ana", 50);

        MimeMessage[] recibidos = smtp.getReceivedMessages();
        assertThat(recibidos).hasSize(8);
        for (MimeMessage mail : recibidos) {
            assertThat(html(mail)).as(mail.getSubject())
                    .contains("<html lang=\"es\">")
                    .contains("Asistí<span style=\"color:#9fe02a;\">APP</span>")
                    .contains("El equipo de")
                    .contains("Ana")
                    .doesNotContain("%s").doesNotContain("$s");
            assertThat(cuerpo(mail)).as(mail.getSubject()).contains("Ana").doesNotContain("<");
        }
    }

    @Test
    void recuperacion_llevaElEnlaceEnLasDosVersiones() throws Exception {
        EmailService servicio = servicio(smtp.getSmtp().getPort());
        ReflectionTestUtils.setField(servicio, "frontendBaseUrl", "https://app.ejemplo.com");

        servicio.enviarEmailRecuperacion("maria@ejemplo.com", "María", "token-123");

        String enlace = "https://app.ejemplo.com/organizador/recuperar-password?token=token-123";
        MimeMessage mail = unicoMensaje();
        assertThat(html(mail)).contains("href=\"" + enlace + "\"").contains("30 minutos");
        assertThat(cuerpo(mail)).contains(enlace).contains("30 minutos");
    }

    @Test
    void credencialesDeStaff_muestranUsuarioYContrasenaTemporal() throws Exception {
        servicio(smtp.getSmtp().getPort())
                .enviarCredencialesStaff("juan@ejemplo.com", "Juan", "Staff QR", "a1<b>2");

        MimeMessage mail = unicoMensaje();
        assertThat(html(mail)).contains("juan@ejemplo.com").contains("a1&lt;b&gt;2").contains("Staff QR");
        assertThat(cuerpo(mail)).contains("Contraseña temporal: a1<b>2");
    }

    @Test
    void reembolsoDelOrganizador_formateaElImporteEnPesos() throws Exception {
        servicio(smtp.getSmtp().getPort())
                .enviarNotificacionReembolsoOrganizador("a@ejemplo.com", "Ana", "Festival", 1234.5);

        MimeMessage mail = unicoMensaje();
        assertThat(html(mail)).contains("$1.234,50");
        assertThat(cuerpo(mail)).contains("te devolvió $1.234,50 de tu compra");
    }

    /** Nombres y eventos los escribe una persona: en ningún mail pueden colar HTML. */
    @Test
    void ningunMail_dejaColarHtmlEnLosDatos() throws Exception {
        EmailService servicio = servicio(smtp.getSmtp().getPort());
        String malo = "<img src=x>";

        servicio.enviarEmailRecuperacion("a@ejemplo.com", malo, "token-123");
        servicio.enviarCredencialesStaff("a@ejemplo.com", malo, "Staff QR", "clave");
        servicio.enviarNotificacionCancelacion("a@ejemplo.com", malo, malo);
        servicio.enviarNotificacionReembolsoEntradas("a@ejemplo.com", malo, malo);
        servicio.enviarNotificacionEntradaAnulada("a@ejemplo.com", malo, malo);
        servicio.enviarNotificacionReembolsoOrganizador("a@ejemplo.com", malo, malo, 10);
        servicio.enviarNotificacionReembolsoCreditos("a@ejemplo.com", malo, null);

        MimeMessage[] recibidos = smtp.getReceivedMessages();
        assertThat(recibidos).hasSize(7);
        for (MimeMessage mail : recibidos) {
            assertThat(html(mail)).as(mail.getSubject()).doesNotContain(malo).contains("&lt;img src=x&gt;");
        }
    }

    private static JavaMailSenderImpl sender(int puerto) {
        // Igual que la autoconfiguración de Spring Boot con spring.mail.host/port (default-encoding UTF-8).
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost("localhost");
        sender.setPort(puerto);
        sender.setDefaultEncoding("UTF-8");
        return sender;
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
