package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.ForbiddenActionException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.entities.Notificacion;
import com.asistiapp.backend.models.entities.Usuario;
import com.asistiapp.backend.models.enums.EstadoUsuario;
import com.asistiapp.backend.models.enums.OrigenNotificacion;
import com.asistiapp.backend.repositories.NotificacionRepository;
import com.asistiapp.backend.repositories.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificacionServiceTest {

    @Mock
    private NotificacionRepository notificacionRepository;
    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private NotificacionService notificacionService;

    private Usuario usuario(Long id) {
        Usuario u = new Usuario();
        u.setId(id);
        u.setEstado(EstadoUsuario.Activo);
        return u;
    }

    @Test
    void crear_guardaNotificacionDeOrigenSistema() {
        notificacionService.crear(10L, "Título", "Mensaje", "Evento", 5L);

        ArgumentCaptor<Notificacion> captor = ArgumentCaptor.forClass(Notificacion.class);
        verify(notificacionRepository).save(captor.capture());
        Notificacion guardada = captor.getValue();
        assertThat(guardada.getIdUsuarioDestino()).isEqualTo(10L);
        assertThat(guardada.getOrigen()).isEqualTo(OrigenNotificacion.Sistema);
        assertThat(guardada.getTipoEntidadRelacionada()).isEqualTo("Evento");
        assertThat(guardada.getIdEntidadRelacionada()).isEqualTo(5L);
    }

    @Test
    void crearGlobal_materializaUnaFilaPorUsuarioActivo() {
        when(usuarioRepository.findByEstado(EstadoUsuario.Activo))
                .thenReturn(List.of(usuario(1L), usuario(2L), usuario(3L)));

        int enviadas = notificacionService.crearGlobal("Mantenimiento", "El sistema estará caído a la medianoche");

        assertThat(enviadas).isEqualTo(3);
        ArgumentCaptor<List<Notificacion>> captor = ArgumentCaptor.forClass(List.class);
        verify(notificacionRepository).saveAll(captor.capture());
        List<Notificacion> lote = captor.getValue();
        assertThat(lote).hasSize(3);
        assertThat(lote).allSatisfy(n -> {
            assertThat(n.getOrigen()).isEqualTo(OrigenNotificacion.Admin);
            assertThat(n.getTitulo()).isEqualTo("Mantenimiento");
        });
        assertThat(lote.stream().map(Notificacion::getIdUsuarioDestino)).containsExactly(1L, 2L, 3L);
    }

    @Test
    void marcarLeida_notificacionAjena_lanzaForbidden() {
        Notificacion n = new Notificacion();
        n.setId(100L);
        n.setIdUsuarioDestino(999L);
        when(notificacionRepository.findById(100L)).thenReturn(Optional.of(n));

        assertThatThrownBy(() -> notificacionService.marcarLeida(100L, 1L))
                .isInstanceOf(ForbiddenActionException.class);
        verify(notificacionRepository, never()).save(any());
    }

    @Test
    void marcarLeida_inexistente_lanzaResourceNotFound() {
        when(notificacionRepository.findById(100L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificacionService.marcarLeida(100L, 1L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void marcarLeida_propia_laMarca() {
        Notificacion n = new Notificacion();
        n.setId(100L);
        n.setIdUsuarioDestino(1L);
        n.setLeida(false);
        when(notificacionRepository.findById(100L)).thenReturn(Optional.of(n));

        notificacionService.marcarLeida(100L, 1L);

        assertThat(n.isLeida()).isTrue();
        verify(notificacionRepository).save(n);
    }

    @Test
    void marcarTodasLeidas_marcaSoloLasPendientesDelUsuario() {
        Notificacion n1 = new Notificacion();
        n1.setLeida(false);
        Notificacion n2 = new Notificacion();
        n2.setLeida(false);
        when(notificacionRepository.findByIdUsuarioDestinoAndLeidaFalse(1L)).thenReturn(List.of(n1, n2));

        notificacionService.marcarTodasLeidas(1L);

        assertThat(n1.isLeida()).isTrue();
        assertThat(n2.isLeida()).isTrue();
        verify(notificacionRepository).saveAll(anyList());
    }

    @Test
    void contarNoLeidas_delegaEnElRepositorio() {
        when(notificacionRepository.countByIdUsuarioDestinoAndLeidaFalse(1L)).thenReturn(4L);

        assertThat(notificacionService.contarNoLeidas(1L)).isEqualTo(4L);
    }
}
