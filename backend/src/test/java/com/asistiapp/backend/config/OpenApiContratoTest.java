package com.asistiapp.backend.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * El frontend guarda una copia del contrato de esta API (frontend/openapi.json) y de ella genera los tipos con los
 * que verifica a mano `types.ts`. Si el contrato cambia y la copia no se actualiza, esa guardia se queda mirando
 * un contrato viejo y no avisa de nada: este test lo evita.
 *
 * Si falla: con el backend corriendo, `cd frontend && npm run types:api`, y después `npx tsc -b` para ver qué
 * tipos de `types.ts` hay que actualizar.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OpenApiContratoTest {

    private static final Path COPIA_DEL_FRONTEND = Path.of("..", "frontend", "openapi.json");

    /**
     * Dos números con el mismo valor son iguales: el backend escribe `0.0` y la copia, que genera Node,
     * `0` (JavaScript no distingue), y Jackson no los considera iguales aunque valgan lo mismo.
     */
    private static final Comparator<JsonNode> IGUALDAD_NUMERICA = (a, b) -> {
        if (a.isNumber() && b.isNumber()) {
            return a.decimalValue().compareTo(b.decimalValue());
        }
        return a.equals(b) ? 0 : 1;
    };

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void elContratoDelBackendCoincideConLaCopiaQueUsaElFrontend() throws Exception {
        assertThat(COPIA_DEL_FRONTEND).as("copia del contrato en el frontend").exists();

        String respuesta = mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                // La respuesta es application/json sin charset: sin esto se decodifica como ISO-8859-1 y la "í" de AsistíAPP llega rota.
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        JsonNode actual = objectMapper.readTree(respuesta);
        // "servers" depende del host desde el que se pide: no es parte del contrato (el script del frontend lo saca igual).
        ((ObjectNode) actual).remove("servers");
        JsonNode copia = leer(COPIA_DEL_FRONTEND);

        List<String> diferencias = new ArrayList<>();
        comparar("endpoint", actual.path("paths"), copia.path("paths"), diferencias);
        comparar("DTO", actual.at("/components/schemas"), copia.at("/components/schemas"), diferencias);

        assertThat(diferencias)
                .as("El contrato del backend cambió y frontend/openapi.json quedó viejo. Con el backend corriendo: "
                        + "cd frontend && npm run types:api")
                .isEmpty();
        assertThat(actual.equals(IGUALDAD_NUMERICA, copia))
                .as("El contrato cambió en algo que no son endpoints ni DTOs (info, seguridad...)")
                .isTrue();
    }

    private JsonNode leer(Path archivo) throws IOException {
        return objectMapper.readTree(Files.readString(archivo));
    }

    private static String resumir(JsonNode nodo) {
        String texto = nodo.toString();
        return texto.length() > 700 ? texto.substring(0, 700) + "…" : texto;
    }

    /** Lista qué se agregó, quitó o cambió entre dos mapas de nombre → definición. */
    private static void comparar(String tipo, JsonNode actual, JsonNode copia, List<String> diferencias) {
        actual.fieldNames().forEachRemaining(nombre -> {
            if (!copia.has(nombre)) {
                diferencias.add(tipo + " nuevo en el backend: " + nombre);
            } else if (!actual.get(nombre).equals(IGUALDAD_NUMERICA, copia.get(nombre))) {
                diferencias.add(tipo + " que cambió: " + nombre + "\n   backend: " + resumir(actual.get(nombre))
                        + "\n   copia:   " + resumir(copia.get(nombre)));
            }
        });
        copia.fieldNames().forEachRemaining(nombre -> {
            if (!actual.has(nombre)) {
                diferencias.add(tipo + " que el backend ya no tiene: " + nombre);
            }
        });
    }
}
