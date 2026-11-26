package com.asistiapp.backend.security.audit;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Cada código de acción que puede escribir el backend en LOG_AUDITORIA tiene que tener su
 * etiqueta en el frontend (frontend/src/lib/auditoria.ts, mapa ACCIONES): si no, la pantalla
 * de Auditoría lo muestra crudo y el filtro de acciones no lo ofrece.
 *
 * Lee el código fuente: los @Auditable(accion = "...") y los AuditoriaContexto.accion("...").
 */
class AccionesAuditadasEnElFrontendTest {

    private static final Path FUENTES = Path.of("src", "main", "java");
    private static final Path ETIQUETAS_DEL_FRONTEND = Path.of("..", "frontend", "src", "lib", "auditoria.ts");
    private static final Pattern ANOTACION = Pattern.compile("@(?:[\\w.]+\\.)?Auditable\\(accion\\s*=\\s*\"([A-Z_]+)\"");
    private static final Pattern CAMBIO_DE_ACCION = Pattern.compile("AuditoriaContexto\\.accion\\(\"([A-Z_]+)\"\\)");

    @Test
    void cadaAccionDelBackendTieneEtiquetaEnElFrontend() throws IOException {
        Set<String> acciones = accionesDelBackend();
        assertThat(acciones).as("acciones encontradas en el backend").isNotEmpty();
        assertThat(ETIQUETAS_DEL_FRONTEND).exists();
        String etiquetas = Files.readString(ETIQUETAS_DEL_FRONTEND);

        Set<String> sinEtiqueta = new TreeSet<>();
        for (String accion : acciones) {
            if (!Pattern.compile("\\b" + accion + ":\\s*\\{").matcher(etiquetas).find()) {
                sinEtiqueta.add(accion);
            }
        }
        assertThat(sinEtiqueta)
                .as("Acciones auditadas sin etiqueta en frontend/src/lib/auditoria.ts (agregalas al mapa ACCIONES)")
                .isEmpty();
    }

    private static Set<String> accionesDelBackend() throws IOException {
        Set<String> acciones = new TreeSet<>();
        try (Stream<Path> archivos = Files.walk(FUENTES)) {
            for (Path archivo : archivos.filter(p -> p.toString().endsWith(".java")).toList()) {
                String fuente = Files.readString(archivo);
                agregar(ANOTACION.matcher(fuente), acciones);
                agregar(CAMBIO_DE_ACCION.matcher(fuente), acciones);
            }
        }
        return acciones;
    }

    private static void agregar(Matcher m, Set<String> destino) {
        while (m.find()) {
            destino.add(m.group(1));
        }
    }
}
