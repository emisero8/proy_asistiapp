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
        assertThat(entrada.getEstado()).isEqualTo(EstadoEntrada.Pagada);
        verify(entradaRepository, never()).save(any());
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
        verify(entradaRepository, never()).save(any()); // ya estaba usada, no hay nada que persistir de nuevo
    }

    @Test
    void validarQR_entradaValida_laMarcaComoUsadaYRegistraElStaffValidador() {
        when(entradaRepository.findByCodigoQr(entrada.getCodigoQr())).thenReturn(Optional.of(entrada));

        ValidacionQRRequestDTO dto = new ValidacionQRRequestDTO();
        dto.setCodigoQr(entrada.getCodigoQr());

        ValidacionQRResponseDTO response = staffQRService.validarQR(dto, staffQR);

        assertThat(response.isValido()).isTrue();
        assertThat(entrada.getEstado()).isEqualTo(EstadoEntrada.Usada);
        assertThat(entrada.getIdStaffQrValidador()).isEqualTo(5L);
        assertThat(entrada.getFechaUso()).isNotNull();
        verify(entradaRepository).save(entrada);
    }

    @Test
    void consultarEstadoQR_noModificaLaEntrada() {
        when(entradaRepository.findByCodigoQr(entrada.getCodigoQr())).thenReturn(Optional.of(entrada));

        ValidacionQRResponseDTO response = staffQRService.consultarEstadoQR(entrada.getCodigoQr(), staffQR);

        assertThat(response.isValido()).isTrue();
        assertThat(entrada.getEstado()).isEqualTo(EstadoEntrada.Pagada); // sin cambios
        verify(entradaRepository, never()).save(any());
    }
}
