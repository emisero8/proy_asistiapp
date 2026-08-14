package com.asistiapp.backend.services.admin;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.dtos.evento.EventoRequestDTO;
import com.asistiapp.backend.models.dtos.evento.EventoResponseDTO;
import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.enums.EstadoEvento;
import com.asistiapp.backend.repositories.EntradaRepository;
import com.asistiapp.backend.repositories.EventoRepository;
import com.asistiapp.backend.services.EventoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * AdminEventoService es deliberadamente el "override" de EventoService: acá
 * NO hay chequeo de propiedad (el Admin puede tocar cualquier evento) — lo
 * único que sí debe seguir bloqueado es borrar un evento con entradas
 * vendidas, porque eso destruye historial de compra real.
 */
@ExtendWith(MockitoExtension.class)
class AdminEventoServiceTest {

    @Mock
    private EventoRepository eventoRepository;
    @Mock
    private EntradaRepository entradaRepository;
    @Mock
    private EventoService eventoService;

    @InjectMocks
    private AdminEventoService adminEventoService;

    private Evento evento;

    @BeforeEach
    void setUp() {
        evento = new Evento();
        evento.setId(50L);
        evento.setIdOrganizador(999L); // pertenece a OTRO organizador — no debería importar
        evento.setNombre("Evento ajeno");
        evento.setEstado(EstadoEvento.Publicado);
    }

    @Test
    void eventoInexistente_lanzaResourceNotFoundException() {
        when(eventoRepository.findById(50L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminEventoService.cancelarEvento(50L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void editarEvento_deCualquierOrganizador_seEditaSinChequeoDePropiedad() {
        when(eventoRepository.findById(50L)).thenReturn(Optional.of(evento));
        when(eventoRepository.save(any(Evento.class))).thenAnswer(inv -> inv.getArgument(0));
        when(eventoService.toResponseDTO(any(Evento.class))).thenAnswer(inv ->
                EventoResponseDTO.builder().nombre(((Evento) inv.getArgument(0)).getNombre()).build());

        EventoRequestDTO dto = new EventoRequestDTO();
        dto.setNombre("Nombre editado por Admin");
        dto.setFechaEvento(LocalDate.now().plusDays(10));
        dto.setHoraEvento(LocalTime.of(20, 0));
        dto.setLugar("Nuevo lugar");

        EventoResponseDTO response = adminEventoService.editarEvento(50L, dto);

        assertThat(response.getNombre()).isEqualTo("Nombre editado por Admin");
        assertThat(evento.getLugar()).isEqualTo("Nuevo lugar");
    }

    @Test
    void cancelarEvento_yaCancelado_lanzaBusinessRuleException() {
        evento.setEstado(EstadoEvento.Cancelado);
        when(eventoRepository.findById(50L)).thenReturn(Optional.of(evento));

        assertThatThrownBy(() -> adminEventoService.cancelarEvento(50L))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void cancelarEvento_exitoso_cambiaEstadoYRegistraFecha() {
        when(eventoRepository.findById(50L)).thenReturn(Optional.of(evento));
        when(eventoRepository.save(any(Evento.class))).thenAnswer(inv -> inv.getArgument(0));
        when(eventoService.toResponseDTO(any(Evento.class))).thenReturn(EventoResponseDTO.builder().build());

        adminEventoService.cancelarEvento(50L);

        assertThat(evento.getEstado()).isEqualTo(EstadoEvento.Cancelado);
        assertThat(evento.getFechaCancelacion()).isNotNull();
        verify(eventoService).notificarCancelacionACompradores(evento);
    }

    @Test
    void eliminarEvento_conEntradasVendidas_lanzaBusinessRuleExceptionYNoElimina() {
        when(eventoRepository.findById(50L)).thenReturn(Optional.of(evento));
        when(entradaRepository.countByEventoId(50L)).thenReturn(3L);

        assertThatThrownBy(() -> adminEventoService.eliminarEvento(50L))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("entradas vendidas");

        verify(eventoRepository, never()).delete(any());
    }

    @Test
    void eliminarEvento_sinEntradasVendidas_seElimina() {
        when(eventoRepository.findById(50L)).thenReturn(Optional.of(evento));
        when(entradaRepository.countByEventoId(50L)).thenReturn(0L);

        adminEventoService.eliminarEvento(50L);

        verify(eventoRepository).delete(evento);
    }
}
