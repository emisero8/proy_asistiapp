package com.asistiapp.backend.security.audit;

import com.asistiapp.backend.models.entities.Usuario;
import com.asistiapp.backend.models.enums.RolUsuario;
import com.asistiapp.backend.repositories.UsuarioRepository;
import com.asistiapp.backend.security.SecurityUtils;
import com.asistiapp.backend.services.AuditoriaService;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.reflect.MethodSignature;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.lang.reflect.Method;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AuditoriaAspectTest {

    private static final String CONTRASENA = "S3cr3t-Nueva-Clave!";

    /** Servicio de mentira con las dos formas de proteger un parámetro y un método sin nada sensible. */
    static class ServicioDeEjemplo {
        @Auditable(accion = "A", entidad = "Usuario")
        public void anotado(Long idUsuario, @DatoSensible String valor) {
        }

        @Auditable(accion = "B", entidad = "Usuario")
        public void porNombre(Long idUsuario, String nuevaPassword) {
        }

        @Auditable(accion = "C", entidad = "Usuario")
        public void sinSensibles(Long idUsuario, String motivo) {
        }
    }

    @Mock private AuditoriaService auditoriaService;
    @Mock private SecurityUtils securityUtils;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private ProceedingJoinPoint joinPoint;
    @Mock private MethodSignature firma;

    private AuditoriaAspect aspecto;

    @BeforeEach
    void setUp() {
        aspecto = new AuditoriaAspect(auditoriaService, securityUtils, usuarioRepository);
        Usuario admin = new Usuario();
        admin.setId(1L);
        admin.setNombre("Ana Gómez");
        admin.setRol(RolUsuario.Administrador);
        when(securityUtils.getUsuarioAutenticado()).thenReturn(admin);
    }

    private Method prepararMetodo(String nombreMetodo, String[] nombresParametros, Object... args) throws Exception {
        when(joinPoint.getSignature()).thenReturn(firma);
        Method metodo = ServicioDeEjemplo.class.getMethod(nombreMetodo, Long.class, String.class);
        when(firma.getMethod()).thenReturn(metodo);
        when(firma.getParameterNames()).thenReturn(nombresParametros);
        when(joinPoint.getArgs()).thenReturn(args);
        return metodo;
    }

    /** Corre el método sin que describa nada (red del formato viejo) y devuelve el detalle. */
    private String detalleAuditado(String nombreMetodo, String[] nombresParametros, Object... args) throws Throwable {
        Method metodo = prepararMetodo(nombreMetodo, nombresParametros, args);
        when(joinPoint.proceed()).thenReturn(null);

        aspecto.auditar(joinPoint, metodo.getAnnotation(Auditable.class));

        ArgumentCaptor<String> detalle = ArgumentCaptor.forClass(String.class);
        verify(auditoriaService).registrar(eq(1L), eq("Ana Gómez"), eq(RolUsuario.Administrador), any(), any(), any(), isNull(), detalle.capture());
        return detalle.getValue();
    }

    // ---- Red para métodos que no describen su acción (formato viejo, con enmascarado) ----

    @Test
    void parametroAnotadoConDatoSensibleSeEnmascara() throws Throwable {
        // Nombres neutros a propósito: así solo puede enmascarar la anotación.
        String detalle = detalleAuditado("anotado", new String[]{"id", "valor"}, 7L, CONTRASENA);

        assertThat(detalle).isEqualTo("anotado([7, ***])").doesNotContain(CONTRASENA);
    }

    @Test
    void parametroConNombreSensibleSeEnmascaraAunSinAnotacion() throws Throwable {
        String detalle = detalleAuditado("porNombre", new String[]{"idUsuario", "nuevaPassword"}, 7L, CONTRASENA);

        assertThat(detalle).isEqualTo("porNombre([7, ***])").doesNotContain(CONTRASENA);
    }

    @Test
    void losParametrosComunesSiQuedanEnElDetalle() throws Throwable {
        String detalle = detalleAuditado("sinSensibles", new String[]{"idUsuario", "motivo"}, 7L, "pedido del usuario");

        assertThat(detalle).isEqualTo("sinSensibles([7, pedido del usuario])");
    }

    @Test
    void sinNombresDeParametroDisponiblesIgualSeRespetaLaAnotacion() throws Throwable {
        String detalle = detalleAuditado("anotado", null, 7L, CONTRASENA);

        assertThat(detalle).doesNotContain(CONTRASENA);
    }

    @Test
    void reconoceLosNombresSensibles() {
        assertThat(AuditoriaAspect.esNombreSensible("nuevaPassword")).isTrue();
        assertThat(AuditoriaAspect.esNombreSensible("contrasena")).isTrue();
        assertThat(AuditoriaAspect.esNombreSensible("accessToken")).isTrue();
        assertThat(AuditoriaAspect.esNombreSensible("apiSecret")).isTrue();
        assertThat(AuditoriaAspect.esNombreSensible("claveSecreta")).isTrue();
        assertThat(AuditoriaAspect.esNombreSensible("idUsuario")).isFalse();
        assertThat(AuditoriaAspect.esNombreSensible("titulo")).isFalse();
        assertThat(AuditoriaAspect.esNombreSensible(null)).isFalse();
    }

    // ---- Métodos que describen su acción con AuditoriaContexto ----

    @Test
    void usaElObjetivoYElDetalleQueDescribioElMetodo() throws Throwable {
        Method metodo = prepararMetodo("sinSensibles", new String[]{"idUsuario", "motivo"}, 99L, "x");
        when(joinPoint.proceed()).thenAnswer(inv -> {
            AuditoriaContexto.objetivo(6L, "Juan Pérez");
            AuditoriaContexto.detalle("Organizador · juan@ejemplo.com");
            AuditoriaContexto.cambio("Estado", "Activo", "Suspendido");
            return null;
        });

        aspecto.auditar(joinPoint, metodo.getAnnotation(Auditable.class));

        verify(auditoriaService).registrar(1L, "Ana Gómez", RolUsuario.Administrador, "C", "Usuario", 6L, "Juan Pérez",
                "Organizador · juan@ejemplo.com\nEstado: Activo → Suspendido");
    }

    @Test
    void unaAccionGlobalPuedeNoTenerId() throws Throwable {
        Method metodo = prepararMetodo("sinSensibles", new String[]{"idUsuario", "motivo"}, 5L, "x");
        when(joinPoint.proceed()).thenAnswer(inv -> {
            AuditoriaContexto.objetivo(null, "Todos los usuarios activos");
            return null;
        });

        aspecto.auditar(joinPoint, metodo.getAnnotation(Auditable.class));

        // El id 5 de los argumentos NO se usa: el método dijo que no hay una entidad puntual.
        verify(auditoriaService).registrar(eq(1L), eq("Ana Gómez"), eq(RolUsuario.Administrador), eq("C"), eq("Usuario"), isNull(),
                eq("Todos los usuarios activos"), anyString());
    }

    @Test
    void siElMetodoFallaNoSeRegistraNadaYElContextoSeCierra() throws Throwable {
        Method metodo = prepararMetodo("sinSensibles", new String[]{"idUsuario", "motivo"}, 7L, "x");
        when(joinPoint.proceed()).thenAnswer(inv -> {
            AuditoriaContexto.objetivo(7L, "Juan");
            throw new IllegalStateException("regla de negocio");
        });

        assertThatThrownBy(() -> aspecto.auditar(joinPoint, metodo.getAnnotation(Auditable.class)))
                .isInstanceOf(IllegalStateException.class);

        verify(auditoriaService, never()).registrar(anyLong(), any(), any(), any(), any(), any(), any(), any());
        assertThat(AuditoriaContexto.activo()).isFalse();
    }

    @Test
    void fueraDeUnMetodoAuditadoElContextoNoHaceNada() {
        assertThat(AuditoriaContexto.activo()).isFalse();
        AuditoriaContexto.objetivo(1L, "x");
        AuditoriaContexto.detalle("y");
        assertThat(AuditoriaContexto.actual()).isNull();
    }

    // ---- Emisor, anidamiento y acción ----

    @Test
    void unMetodoAuditadoAnidadoNoGeneraUnaSegundaFila() throws Throwable {
        Method metodo = prepararMetodo("sinSensibles", new String[]{"idUsuario", "motivo"}, 7L, "x");
        // El de afuera (Admin) llama a otro método auditado (el de EventoService) dentro de su ejecución.
        when(joinPoint.proceed()).thenAnswer(afuera -> {
            AuditoriaContexto.objetivo(3L, "Evento del Admin");
            ProceedingJoinPoint adentro = org.mockito.Mockito.mock(ProceedingJoinPoint.class);
            when(adentro.proceed()).thenAnswer(inv -> {
                AuditoriaContexto.objetivo(99L, "Lo describe el de adentro");
                AuditoriaContexto.detalle("línea del de adentro");
                return null;
            });
            aspecto.auditar(adentro, metodo.getAnnotation(Auditable.class));
            AuditoriaContexto.detalle("línea del de afuera");
            return null;
        });

        aspecto.auditar(joinPoint, metodo.getAnnotation(Auditable.class));

        // Una sola fila, con lo que describió el de afuera (lo del de adentro se descarta).
        verify(auditoriaService, org.mockito.Mockito.times(1))
                .registrar(anyLong(), any(), any(), any(), any(), any(), any(), any());
        verify(auditoriaService).registrar(1L, "Ana Gómez", RolUsuario.Administrador, "C", "Usuario", 3L,
                "Evento del Admin", "línea del de afuera");
    }

    @Test
    void elEmisorFijadoAManoReemplazaAlLogueado() throws Throwable {
        Method metodo = prepararMetodo("sinSensibles", new String[]{"idUsuario", "motivo"}, 7L, "x");
        Usuario organizador = new Usuario();
        organizador.setId(7L);
        organizador.setNombre("Facundo");
        organizador.setRol(RolUsuario.Organizador);
        when(usuarioRepository.findById(7L)).thenReturn(Optional.of(organizador));
        when(joinPoint.proceed()).thenAnswer(inv -> {
            AuditoriaContexto.emisor(7L);
            AuditoriaContexto.objetivo(1L, "Cuenta de Mercado Pago");
            return null;
        });

        aspecto.auditar(joinPoint, metodo.getAnnotation(Auditable.class));

        verify(auditoriaService).registrar(eq(7L), eq("Facundo"), eq(RolUsuario.Organizador), eq("C"), any(), eq(1L),
                eq("Cuenta de Mercado Pago"), any());
    }

    @Test
    void elMetodoPuedeCambiarElCodigoDeAccion() throws Throwable {
        Method metodo = prepararMetodo("sinSensibles", new String[]{"idUsuario", "motivo"}, 7L, "x");
        when(joinPoint.proceed()).thenAnswer(inv -> {
            AuditoriaContexto.objetivo(5L, "Entrada de Juan");
            AuditoriaContexto.accion("INGRESO_RECHAZADO");
            return null;
        });

        aspecto.auditar(joinPoint, metodo.getAnnotation(Auditable.class));

        verify(auditoriaService).registrar(anyLong(), any(), any(), eq("INGRESO_RECHAZADO"), any(), any(), any(), any());
    }

    @Test
    void sinUsuarioLogueadoNiEmisorNoRegistraPeroNoRompeLaAccion() throws Throwable {
        Method metodo = prepararMetodo("sinSensibles", new String[]{"idUsuario", "motivo"}, 7L, "x");
        when(securityUtils.getUsuarioAutenticado()).thenThrow(new IllegalStateException("sin sesión"));
        when(joinPoint.proceed()).thenReturn("resultado");

        Object resultado = aspecto.auditar(joinPoint, metodo.getAnnotation(Auditable.class));

        assertThat(resultado).isEqualTo("resultado");
        verify(auditoriaService, never()).registrar(anyLong(), any(), any(), any(), any(), any(), any(), any());
    }

    // ---- Formato de los cambios ----

    @Test
    void cambiosSoloListaLoQueCambioConFormatoLegible() throws Throwable {
        Method metodo = prepararMetodo("sinSensibles", new String[]{"idUsuario", "motivo"}, 7L, "x");
        Map<String, Object> antes = new LinkedHashMap<>();
        antes.put("Nombre", "Fiesta");
        antes.put("Fecha", LocalDate.of(2026, 12, 10));
        antes.put("Descripción", "corta");
        antes.put("Inicio de venta", LocalDateTime.of(2026, 12, 1, 9, 0));
        Map<String, Object> despues = new LinkedHashMap<>(antes);
        despues.put("Fecha", LocalDate.of(2026, 12, 12));
        despues.put("Descripción", "x".repeat(AuditoriaContexto.LARGO_MAXIMO_VALOR + 1));
        when(joinPoint.proceed()).thenAnswer(inv -> {
            AuditoriaContexto.objetivo(7L, "Fiesta");
            AuditoriaContexto.cambios(antes, despues);
            return null;
        });

        aspecto.auditar(joinPoint, metodo.getAnnotation(Auditable.class));

        verify(auditoriaService).registrar(anyLong(), any(), any(), any(), any(), any(), any(),
                eq("Fecha: 10/12/2026 → 12/12/2026\nDescripción: modificado"));
    }

    @Test
    void cambiosSinDiferenciasLoDice() throws Throwable {
        Method metodo = prepararMetodo("sinSensibles", new String[]{"idUsuario", "motivo"}, 7L, "x");
        Map<String, Object> igual = Map.of("Nombre", "Fiesta");
        when(joinPoint.proceed()).thenAnswer(inv -> {
            AuditoriaContexto.objetivo(7L, "Fiesta");
            AuditoriaContexto.cambios(igual, igual);
            return null;
        });

        aspecto.auditar(joinPoint, metodo.getAnnotation(Auditable.class));

        verify(auditoriaService).registrar(anyLong(), any(), any(), any(), any(), any(), any(), eq("Se guardó sin cambios."));
    }

    @Test
    void formateaPesosComoLaApp() {
        assertThat(AuditoriaContexto.pesos(12000.0)).isEqualTo("$12.000");
        assertThat(AuditoriaContexto.pesos(1234.5)).isEqualTo("$1.234,50");
        assertThat(AuditoriaContexto.pesos(null)).isNull();
    }
}
