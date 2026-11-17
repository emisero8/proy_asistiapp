package com.asistiapp.backend.exceptions;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;


import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Los errores del propio cliente (método, Content-Type, JSON o parámetros mal formados) tienen que
 * devolver 4xx con el formato de error de la app; antes todos terminaban en 500.
 */
class GlobalExceptionHandlerTest {

    record Pedido(@NotBlank(message = "es obligatorio") String nombre) {}

    @RestController
    static class ControllerDePrueba {
        @PostMapping(value = "/prueba/json", consumes = MediaType.APPLICATION_JSON_VALUE)
        public String json(@Valid @RequestBody Pedido pedido) { return "ok"; }

        @GetMapping("/prueba/param")
        public String param(@RequestParam("cantidad") int cantidad) { return "ok"; }

        @GetMapping("/prueba/{id}")
        public String porId(@PathVariable Long id) { return "ok"; }

        @GetMapping("/prueba/objeto")
        public Pedido objeto() { return new Pedido("x"); }

        @GetMapping("/prueba/negocio")
        public String negocio() { throw new AsistiAppException("Conflicto de negocio", HttpStatus.CONFLICT); }

        @GetMapping("/prueba/suspendida")
        public String suspendida() { throw new DisabledException("x"); }

        @GetMapping("/prueba/sin-sesion")
        public String sinSesion() { throw new BadCredentialsException("x"); }

        @GetMapping("/prueba/prohibido")
        public String prohibido() { throw new AccessDeniedException("x"); }

        @GetMapping("/prueba/roto")
        public String roto() { throw new IllegalStateException("detalle interno secreto"); }
    }

    private MockMvc mvc;

    @BeforeEach
    void armar() {
        mvc = MockMvcBuilders.standaloneSetup(new ControllerDePrueba())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void metodoNoSoportado_es405() throws Exception {
        mvc.perform(delete("/prueba/json"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.status").value(405))
                .andExpect(jsonPath("$.error").value("Método HTTP no soportado en esta ruta"))
                .andExpect(jsonPath("$.path").value("/prueba/json"));
    }

    @Test
    void contentTypeNoSoportado_es415() throws Exception {
        mvc.perform(post("/prueba/json").contentType(MediaType.APPLICATION_FORM_URLENCODED).content("a=b"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.status").value(415))
                .andExpect(jsonPath("$.error").value("Tipo de contenido no soportado"));
    }

    @Test
    void jsonMalformado_es400SinFiltrarDetallesInternos() throws Exception {
        mvc.perform(post("/prueba/json").contentType(MediaType.APPLICATION_JSON).content("{no es json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("La solicitud no es válida: revisá el formato de los datos enviados"));
    }

    @Test
    void utf8Invalido_es400() throws Exception {
        byte[] invalido = {'{', '"', 'n', 'o', 'm', 'b', 'r', 'e', '"', ':', '"', (byte) 0xE9, '"', '}'};
        mvc.perform(post("/prueba/json").contentType(MediaType.APPLICATION_JSON).content(invalido))
                .andExpect(status().isBadRequest());
    }

    @Test
    void parametroFaltante_es400ConElNombre() throws Exception {
        mvc.perform(get("/prueba/param"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Falta el parámetro obligatorio 'cantidad'"));
    }

    @Test
    void parametroDeTipoIncorrecto_es400() throws Exception {
        mvc.perform(get("/prueba/param?cantidad=abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("El valor del parámetro 'cantidad' no es válido"));
        mvc.perform(get("/prueba/no-es-numero"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void validacionDeCampos_es400ConElDetallePorCampo() throws Exception {
        mvc.perform(post("/prueba/json").contentType(MediaType.APPLICATION_JSON).content("{\"nombre\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Error de validación en los campos enviados"))
                .andExpect(jsonPath("$.fields.nombre").value("es obligatorio"));
    }

    @Test
    void excepcionDeNegocio_usaSuStatusYMensaje() throws Exception {
        mvc.perform(get("/prueba/negocio"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("Conflicto de negocio"));
    }

    @Test
    void erroresDeSeguridad_mantienenSusCodigos() throws Exception {
        mvc.perform(get("/prueba/suspendida")).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("Cuenta suspendida"));
        mvc.perform(get("/prueba/sin-sesion")).andExpect(status().isUnauthorized());
        mvc.perform(get("/prueba/prohibido")).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("No tienes permisos para realizar esta acción"));
    }

    @Test
    void errorInesperado_es500GenericoSinDetallesInternos() throws Exception {
        mvc.perform(get("/prueba/roto"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Ocurrió un error interno inesperado. Por favor intenta nuevamente."))
                .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("secreto"))));
    }

    @Test
    void clienteQueNoAceptaJson_es406SinCuerpo() throws Exception {
        mvc.perform(get("/prueba/objeto").accept(MediaType.IMAGE_PNG))
                .andExpect(status().isNotAcceptable());
    }
}
