package com.asistiapp.backend.security.audit;

import com.asistiapp.backend.security.SecurityUtils;
import com.asistiapp.backend.services.AuditoriaService;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.reflect.MethodSignature;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
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
    @Mock private JoinPoint joinPoint;
    @Mock private MethodSignature firma;

    private AuditoriaAspect aspecto;

    @BeforeEach
    void setUp() {
        aspecto = new AuditoriaAspect(auditoriaService, securityUtils);
    }

    private String detalleAuditado(String nombreMetodo, String[] nombresParametros, Object... args) throws Exception {
        when(securityUtils.getIdUsuarioAutenticado()).thenReturn(1L);
        when(joinPoint.getSignature()).thenReturn(firma);
        Method metodo = ServicioDeEjemplo.class.getMethod(nombreMetodo, Long.class, String.class);
        when(firma.getMethod()).thenReturn(metodo);
        when(firma.getParameterNames()).thenReturn(nombresParametros);
        when(joinPoint.getArgs()).thenReturn(args);

        aspecto.auditar(joinPoint, metodo.getAnnotation(Auditable.class), null);

        ArgumentCaptor<String> detalle = ArgumentCaptor.forClass(String.class);
        verify(auditoriaService).registrar(eq(1L), any(), any(), any(), detalle.capture());
        return detalle.getValue();
    }

    @Test
    void parametroAnotadoConDatoSensibleSeEnmascara() throws Exception {
        // Nombres neutros a propósito: así solo puede enmascarar la anotación.
        String detalle = detalleAuditado("anotado", new String[]{"id", "valor"}, 7L, CONTRASENA);

        assertThat(detalle).isEqualTo("anotado([7, ***])").doesNotContain(CONTRASENA);
    }

    @Test
    void parametroConNombreSensibleSeEnmascaraAunSinAnotacion() throws Exception {
        String detalle = detalleAuditado("porNombre", new String[]{"idUsuario", "nuevaPassword"}, 7L, CONTRASENA);

        assertThat(detalle).isEqualTo("porNombre([7, ***])").doesNotContain(CONTRASENA);
    }

    @Test
    void losParametrosComunesSiQuedanEnElDetalle() throws Exception {
        String detalle = detalleAuditado("sinSensibles", new String[]{"idUsuario", "motivo"}, 7L, "pedido del usuario");

        assertThat(detalle).isEqualTo("sinSensibles([7, pedido del usuario])");
    }

    @Test
    void sinNombresDeParametroDisponiblesIgualSeRespetaLaAnotacion() throws Exception {
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
}
