package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.ForbiddenActionException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.dtos.validacion.ValidacionQRRequestDTO;
import com.asistiapp.backend.models.dtos.validacion.ValidacionQRResponseDTO;
import com.asistiapp.backend.models.entities.Entrada;
import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.entities.StaffQR;
import com.asistiapp.backend.models.entities.Tanda;
import com.asistiapp.backend.models.enums.EstadoEntrada;
import com.asistiapp.backend.models.enums.EstadoEvento;
import com.asistiapp.backend.repositories.EntradaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * CU-018: validación de QR en la puerta. Las tres reglas críticas a cubrir:
 * la entrada tiene que existir, tiene que pertenecer al evento del Staff que
 * escanea, y no se puede volver a usar un QR ya validado (anti-duplicado).
 */
@ExtendWith(MockitoExtension.class)
class StaffQRServiceTest {

    @Mock
    private EntradaRepository entradaRepository;

    @InjectMocks
    private StaffQRService staffQRService;

    private StaffQR staffQR;
    private Entrada entrada;

    @BeforeEach
    void setUp() {
        Evento evento = new Evento();
        evento.setId(100L);
        evento.setNombre("Evento de prueba");

        Tanda tanda = new Tanda();
        tanda.setId(10L);
        tanda.setEvento(evento);
        tanda.setNombre("General");

        entrada = new Entrada();
        entrada.setId(1L);
        entrada.setTanda(tanda);
        entrada.setCodigoQr("QR-ABC123");
        entrada.setNombreComprador("Juan Comprador");
        entrada.setEmailComprador("juan@test.com");
        entrada.setEstado(EstadoEntrada.Pagada);

        staffQR = new StaffQR();
        staffQR.setId(5L);
        staffQR.setIdEvento(100L); // mismo evento que la entrada
    }

    @Test
    void validarQR_codigoNoExiste_lanzaResourceNotFoundException() {
        when(entradaRepository.findByCodigoQr("QR-INEXISTENTE")).thenReturn(Optional.empty());

        ValidacionQRRequestDTO dto = new ValidacionQRRequestDTO();
        dto.setCodigoQr("QR-INEXISTENTE");

        assertThatThrownBy(() -> staffQRService.validarQR(dto, staffQR))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void validarQR_entradaDeOtroEvento_lanzaForbiddenActionException() {
        staffQR.setIdEvento(999L); // asignado a OTRO evento
        when(entradaRepository.findByCodigoQr(entrada.getCodigoQr())).thenReturn(Optional.of(entrada));

        ValidacionQRRequestDTO dto = new ValidacionQRRequestDTO();
        dto.setCodigoQr(entrada.getCodigoQr());

        assertThatThrownBy(() -> staffQRService.validarQR(dto, staffQR))
                .isInstanceOf(ForbiddenActionException.class);

        // No debe haber marcado la entrada como usada al rechazarla
        verificarQueNoSeMarcoElIngreso();
    }

    @Test
    void validarQR_entradaAnulada_devuelveInvalidoYNoLaMarcaComoUsada() {
        // 8.6: una entrada que el Organizador anuló no vale en la puerta.
        entrada.setEstado(EstadoEntrada.Anulada);
        when(entradaRepository.findByCodigoQr(entrada.getCodigoQr())).thenReturn(Optional.of(entrada));

        ValidacionQRRequestDTO dto = new ValidacionQRRequestDTO();
        dto.setCodigoQr(entrada.getCodigoQr());

        ValidacionQRResponseDTO response = staffQRService.validarQR(dto, staffQR);

        assertThat(response.isValido()).isFalse();
        assertThat(response.getMensaje()).contains("ANULADA");
        assertThat(response.getEstadoAnterior()).isEqualTo(EstadoEntrada.Anulada);
        verificarQueNoSeMarcoElIngreso();
    }

    @Test
    void consultarEstadoQR_entradaAnulada_noEsValidaYLoDiceSinDecirQueSeUso() {
        entrada.setEstado(EstadoEntrada.Anulada);
        when(entradaRepository.findByCodigoQr(entrada.getCodigoQr())).thenReturn(Optional.of(entrada));

        ValidacionQRResponseDTO response = staffQRService.consultarEstadoQR(entrada.getCodigoQr(), staffQR);

        assertThat(response.isValido()).isFalse();
        assertThat(response.getMensaje()).contains("anulada").doesNotContain("utilizada");
    }

    private void verificarQueNoSeMarcoElIngreso() {
        verify(entradaRepository, never()).marcarComoUsada(any(), any(), any());
        verify(entradaRepository, never()).save(any());
    }

    /** Deja el evento de la entrada empezado hace las horas indicadas. */
    private void eventoEmpezadoHace(int horas) {
        LocalDateTime inicio = LocalDateTime.now().minusHours(horas);
        Evento evento = entrada.getTanda().getEvento();
        evento.setFechaEvento(inicio.toLocalDate());
        evento.setHoraEvento(inicio.toLocalTime());
    }

    @Test
    void validarQR_conElEventoEnCurso_dejaEntrar() {
        eventoEmpezadoHace(3);
        when(entradaRepository.findByCodigoQr(entrada.getCodigoQr())).thenReturn(Optional.of(entrada));
        ValidacionQRRequestDTO dto = new ValidacionQRRequestDTO();
        dto.setCodigoQr(entrada.getCodigoQr());

        when(entradaRepository.marcarComoUsada(eq(1L), eq(5L), any())).thenReturn(1);

        assertThat(staffQRService.validarQR(dto, staffQR).isValido()).isTrue();
    }

    @Test
    void validarQR_conElEventoFinalizado_rechazaSinMarcarLaEntrada() {
        eventoEmpezadoHace(Evento.HORAS_HASTA_FINALIZAR + 1);
        when(entradaRepository.findByCodigoQr(entrada.getCodigoQr())).thenReturn(Optional.of(entrada));
        ValidacionQRRequestDTO dto = new ValidacionQRRequestDTO();
        dto.setCodigoQr(entrada.getCodigoQr());

        ValidacionQRResponseDTO response = staffQRService.validarQR(dto, staffQR);

        assertThat(response.isValido()).isFalse();
        assertThat(response.getMensaje()).contains("EVENTO FINALIZADO");
        verificarQueNoSeMarcoElIngreso();
        assertThat(staffQRService.consultarEstadoQR(entrada.getCodigoQr(), staffQR).getMensaje()).contains("finalizó");
    }

    @Test
    void validarQR_conElEventoCancelado_rechazaSinMarcarLaEntrada() {
        entrada.getTanda().getEvento().setEstado(EstadoEvento.Cancelado);
        when(entradaRepository.findByCodigoQr(entrada.getCodigoQr())).thenReturn(Optional.of(entrada));
        ValidacionQRRequestDTO dto = new ValidacionQRRequestDTO();
        dto.setCodigoQr(entrada.getCodigoQr());

        ValidacionQRResponseDTO response = staffQRService.validarQR(dto, staffQR);

        assertThat(response.isValido()).isFalse();
        assertThat(response.getMensaje()).contains("EVENTO CANCELADO");
        verificarQueNoSeMarcoElIngreso();
        assertThat(staffQRService.consultarEstadoQR(entrada.getCodigoQr(), staffQR).getMensaje()).contains("cancelado");
    }

    @Test
    void validarQR_entradaYaUsada_devuelveInvalidoSinLanzarExcepcion() {
        entrada.setEstado(EstadoEntrada.Usada);
        entrada.setFechaUso(LocalDateTime.now().minusMinutes(5));
        when(entradaRepository.findByCodigoQr(entrada.getCodigoQr())).thenReturn(Optional.of(entrada));

        ValidacionQRRequestDTO dto = new ValidacionQRRequestDTO();
        dto.setCodigoQr(entrada.getCodigoQr());

        ValidacionQRResponseDTO response = staffQRService.validarQR(dto, staffQR);

        assertThat(response.isValido()).isFalse();
        assertThat(response.getEstadoAnterior()).isEqualTo(EstadoEntrada.Usada);
        verificarQueNoSeMarcoElIngreso(); // ya estaba usada, no se pisa el primer ingreso
    }

    @Test
    void entradaYaUsada_elMensajeMuestraLaFechaLegible() {
        // Este texto lo lee el Staff en la puerta: nada de "2026-11-27T21:16:29.368264".
        entrada.setEstado(EstadoEntrada.Usada);
        entrada.setFechaUso(LocalDateTime.of(2026, 11, 27, 21, 16, 29, 368_264_000));
        when(entradaRepository.findByCodigoQr(entrada.getCodigoQr())).thenReturn(Optional.of(entrada));
        ValidacionQRRequestDTO dto = new ValidacionQRRequestDTO();
        dto.setCodigoQr(entrada.getCodigoQr());

        assertThat(staffQRService.validarQR(dto, staffQR).getMensaje())
                .endsWith("Esta entrada fue usada el 27/11/2026 21:16");
        assertThat(staffQRService.consultarEstadoQR(entrada.getCodigoQr(), staffQR).getMensaje())
                .endsWith("Entrada ya utilizada el 27/11/2026 21:16");
    }

    @Test
    void validarQR_entradaValida_laMarcaComoUsadaYRegistraElStaffValidador() {
        when(entradaRepository.findByCodigoQr(entrada.getCodigoQr())).thenReturn(Optional.of(entrada));
        when(entradaRepository.marcarComoUsada(eq(1L), eq(5L), any())).thenReturn(1);

        ValidacionQRRequestDTO dto = new ValidacionQRRequestDTO();
        dto.setCodigoQr(entrada.getCodigoQr());

        ValidacionQRResponseDTO response = staffQRService.validarQR(dto, staffQR);

        assertThat(response.isValido()).isTrue();
        assertThat(response.getEstadoAnterior()).isEqualTo(EstadoEntrada.Pagada);
        assertThat(response.getFechaUso()).isNotNull();
        verify(entradaRepository).marcarComoUsada(1L, 5L, response.getFechaUso());
    }

    @Test
    void validarQR_siLaAnulanMientrasSeEscanea_laRechazaComoAnulada() {
        // Se leyó "Pagada", pero al marcarla ya no lo estaba: la respuesta cuenta lo que pasó.
        Entrada anulada = new Entrada();
        anulada.setId(1L);
        anulada.setEstado(EstadoEntrada.Anulada);
        when(entradaRepository.findByCodigoQr(entrada.getCodigoQr())).thenReturn(Optional.of(entrada));
        when(entradaRepository.marcarComoUsada(eq(1L), eq(5L), any())).thenReturn(0);
        when(entradaRepository.findById(1L)).thenReturn(Optional.of(anulada));
        ValidacionQRRequestDTO dto = new ValidacionQRRequestDTO();
        dto.setCodigoQr(entrada.getCodigoQr());

        ValidacionQRResponseDTO response = staffQRService.validarQR(dto, staffQR);

        assertThat(response.isValido()).isFalse();
        assertThat(response.getMensaje()).contains("ANULADA");
        assertThat(response.getEstadoAnterior()).isEqualTo(EstadoEntrada.Anulada);
    }

    @Test
    void consultarEstadoQR_noModificaLaEntrada() {
        when(entradaRepository.findByCodigoQr(entrada.getCodigoQr())).thenReturn(Optional.of(entrada));

        ValidacionQRResponseDTO response = staffQRService.consultarEstadoQR(entrada.getCodigoQr(), staffQR);

        assertThat(response.isValido()).isTrue();
        assertThat(entrada.getEstado()).isEqualTo(EstadoEntrada.Pagada); // sin cambios
        verificarQueNoSeMarcoElIngreso();
    }
}
