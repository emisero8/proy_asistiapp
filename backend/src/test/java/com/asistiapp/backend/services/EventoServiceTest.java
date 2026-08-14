package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.ForbiddenActionException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.dtos.evento.EventoRequestDTO;
import com.asistiapp.backend.models.dtos.evento.EventoResponseDTO;
import com.asistiapp.backend.models.entities.Entrada;
import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.entities.MovimientoCredito;
import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.models.entities.Tanda;
import com.asistiapp.backend.models.enums.EstadoEvento;
import com.asistiapp.backend.repositories.EntradaRepository;
import com.asistiapp.backend.repositories.EventoRepository;
import com.asistiapp.backend.repositories.OrganizadorRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * EventoService concentra el chequeo de propiedad (IDOR: un Organizador no
 * puede tocar eventos ajenos) y la puerta de créditos al publicar — las dos
 * cosas donde un bug es directamente un problema de seguridad o de plata.
 */
@ExtendWith(MockitoExtension.class)
class EventoServiceTest {

    private static final Long ID_ORGANIZADOR = 1L;
    private static final Long ID_OTRO_ORGANIZADOR = 2L;

    @Mock
    private EventoRepository eventoRepository;
    @Mock
    private OrganizadorRepository organizadorRepository;
    @Mock
    private EntradaRepository entradaRepository;
    @Mock
    private CreditoLedgerService creditoLedgerService;
    @Mock
    private ConfiguracionService configuracionService;
    @Mock
    private EmailService emailService;

    @InjectMocks
    private EventoService eventoService;

    private Evento evento;
    private Organizador organizador;

    @BeforeEach
    void setUp() {
        evento = new Evento();
        evento.setId(100L);
        evento.setIdOrganizador(ID_ORGANIZADOR);
        evento.setNombre("Fiesta de Prueba");
        evento.setEstado(EstadoEvento.Borrador);

        organizador = new Organizador();
        organizador.setId(ID_ORGANIZADOR);
        organizador.setSaldoCreditos(3);
    }

    // ─────────────────────────────────────────────
    // Propiedad (IDOR)
    // ─────────────────────────────────────────────

    @Test
    void obtenerEvento_deOtroOrganizador_lanzaForbiddenActionException() {
        when(eventoRepository.findById(evento.getId())).thenReturn(Optional.of(evento));

        assertThatThrownBy(() -> eventoService.obtenerEvento(evento.getId(), ID_OTRO_ORGANIZADOR))
                .isInstanceOf(ForbiddenActionException.class);
    }

    @Test
    void actualizarEvento_deOtroOrganizador_lanzaForbiddenActionException() {
        when(eventoRepository.findById(evento.getId())).thenReturn(Optional.of(evento));

        assertThatThrownBy(() -> eventoService.actualizarEvento(evento.getId(), requestDto(), ID_OTRO_ORGANIZADOR))
                .isInstanceOf(ForbiddenActionException.class);

        verify(eventoRepository, never()).save(any());
    }

    @Test
    void publicarEvento_deOtroOrganizador_lanzaForbiddenActionExceptionYNoTocaCreditos() {
        when(eventoRepository.findById(evento.getId())).thenReturn(Optional.of(evento));

        assertThatThrownBy(() -> eventoService.publicarEvento(evento.getId(), ID_OTRO_ORGANIZADOR))
                .isInstanceOf(ForbiddenActionException.class);

        verifyNoInteractions(creditoLedgerService);
    }

    @Test
    void cancelarEvento_deOtroOrganizador_lanzaForbiddenActionException() {
        when(eventoRepository.findById(evento.getId())).thenReturn(Optional.of(evento));

        assertThatThrownBy(() -> eventoService.cancelarEvento(evento.getId(), ID_OTRO_ORGANIZADOR))
                .isInstanceOf(ForbiddenActionException.class);
    }

    @Test
    void evento_inexistente_lanzaResourceNotFoundException() {
        when(eventoRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> eventoService.obtenerEvento(999L, ID_ORGANIZADOR))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─────────────────────────────────────────────
    // crearEvento
    // ─────────────────────────────────────────────

    @Test
    void crearEvento_organizadorInexistente_lanzaResourceNotFoundException() {
        when(organizadorRepository.findById(ID_ORGANIZADOR)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> eventoService.crearEvento(requestDto(), ID_ORGANIZADOR))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(eventoRepository, never()).save(any());
    }

    @Test
    void crearEvento_exitoso_guardaConElOrganizadorCorrecto() {
        when(organizadorRepository.findById(ID_ORGANIZADOR)).thenReturn(Optional.of(organizador));
        when(eventoRepository.save(any(Evento.class))).thenAnswer(inv -> inv.getArgument(0));

        eventoService.crearEvento(requestDto(), ID_ORGANIZADOR);

        verify(eventoRepository).save(argThat(e ->
                e.getIdOrganizador().equals(ID_ORGANIZADOR) && e.getNombre().equals("Fiesta de Prueba")));
    }

    // ─────────────────────────────────────────────
    // actualizarEvento — solo en Borrador
    // ─────────────────────────────────────────────

    @Test
    void actualizarEvento_eventoPublicado_lanzaBusinessRuleException() {
        evento.setEstado(EstadoEvento.Publicado);
        when(eventoRepository.findById(evento.getId())).thenReturn(Optional.of(evento));

        assertThatThrownBy(() -> eventoService.actualizarEvento(evento.getId(), requestDto(), ID_ORGANIZADOR))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Borrador");
    }

    // ─────────────────────────────────────────────
    // publicarEvento — la puerta de créditos
    // ─────────────────────────────────────────────

    @Test
    void publicarEvento_sinTandas_lanzaBusinessRuleExceptionYNoDescuentaCreditos() {
        when(eventoRepository.findById(evento.getId())).thenReturn(Optional.of(evento));

        assertThatThrownBy(() -> eventoService.publicarEvento(evento.getId(), ID_ORGANIZADOR))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("tanda");

        verifyNoInteractions(creditoLedgerService, organizadorRepository);
    }

    @Test
    void publicarEvento_eventoYaPublicado_lanzaBusinessRuleException() {
        evento.setEstado(EstadoEvento.Publicado);
        when(eventoRepository.findById(evento.getId())).thenReturn(Optional.of(evento));

        assertThatThrownBy(() -> eventoService.publicarEvento(evento.getId(), ID_ORGANIZADOR))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Borrador");
    }

    @Test
    void publicarEvento_saldoInsuficiente_lanzaBusinessRuleExceptionYNoCambiaEstado() {
        agregarTandaAlEvento();
        organizador.setSaldoCreditos(0);
        when(eventoRepository.findById(evento.getId())).thenReturn(Optional.of(evento));
        when(organizadorRepository.findById(ID_ORGANIZADOR)).thenReturn(Optional.of(organizador));
        when(configuracionService.obtenerEntero(eq("creditos_por_publicacion"), anyInt())).thenReturn(1);

        assertThatThrownBy(() -> eventoService.publicarEvento(evento.getId(), ID_ORGANIZADOR))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("insuficiente");

        assertThat(evento.getEstado()).isEqualTo(EstadoEvento.Borrador);
        verifyNoInteractions(creditoLedgerService);
        verify(eventoRepository, never()).save(any());
    }

    @Test
    void publicarEvento_exitoso_descuentaCreditosYPublicaConUrlPublica() {
        agregarTandaAlEvento();
        when(eventoRepository.findById(evento.getId())).thenReturn(Optional.of(evento));
        when(organizadorRepository.findById(ID_ORGANIZADOR)).thenReturn(Optional.of(organizador));
        when(configuracionService.obtenerEntero(eq("creditos_por_publicacion"), anyInt())).thenReturn(2);
        when(creditoLedgerService.registrarConsumoPublicacion(organizador, 2, evento.getId()))
                .thenReturn(new MovimientoCredito());
        when(eventoRepository.save(any(Evento.class))).thenAnswer(inv -> inv.getArgument(0));

        EventoResponseDTO response = eventoService.publicarEvento(evento.getId(), ID_ORGANIZADOR);

        assertThat(response.getEstado()).isEqualTo(EstadoEvento.Publicado);
        assertThat(response.getUrlPublica()).isNotBlank();
        assertThat(response.getFechaPublicacion()).isNotNull();
        verify(creditoLedgerService).registrarConsumoPublicacion(organizador, 2, evento.getId());
    }

    @Test
    void publicarEvento_respetaElCostoConfiguradoPorElAdmin() {
        agregarTandaAlEvento();
        when(eventoRepository.findById(evento.getId())).thenReturn(Optional.of(evento));
        when(organizadorRepository.findById(ID_ORGANIZADOR)).thenReturn(Optional.of(organizador));
        // Admin configuró 3 créditos en vez del default de 1
        when(configuracionService.obtenerEntero(eq("creditos_por_publicacion"), anyInt())).thenReturn(3);
        when(creditoLedgerService.registrarConsumoPublicacion(any(), anyInt(), any()))
                .thenReturn(new MovimientoCredito());
        when(eventoRepository.save(any(Evento.class))).thenAnswer(inv -> inv.getArgument(0));

        eventoService.publicarEvento(evento.getId(), ID_ORGANIZADOR);

        verify(creditoLedgerService).registrarConsumoPublicacion(organizador, 3, evento.getId());
    }

    // ─────────────────────────────────────────────
    // cancelarEvento
    // ─────────────────────────────────────────────

    @Test
    void cancelarEvento_yaCancelado_lanzaBusinessRuleException() {
        evento.setEstado(EstadoEvento.Cancelado);
        when(eventoRepository.findById(evento.getId())).thenReturn(Optional.of(evento));

        assertThatThrownBy(() -> eventoService.cancelarEvento(evento.getId(), ID_ORGANIZADOR))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void cancelarEvento_desdePublicado_esPermitidoYNoDevuelveCreditos() {
        evento.setEstado(EstadoEvento.Publicado);
        when(eventoRepository.findById(evento.getId())).thenReturn(Optional.of(evento));
        when(eventoRepository.save(any(Evento.class))).thenAnswer(inv -> inv.getArgument(0));

        EventoResponseDTO response = eventoService.cancelarEvento(evento.getId(), ID_ORGANIZADOR);

        assertThat(response.getEstado()).isEqualTo(EstadoEvento.Cancelado);
        assertThat(response.getFechaCancelacion()).isNotNull();
        verifyNoInteractions(creditoLedgerService); // cancelar no reembolsa créditos
    }

    @Test
    void cancelarEvento_conEntradasVendidas_notificaACadaComprador() {
        evento.setEstado(EstadoEvento.Publicado);
        when(eventoRepository.findById(evento.getId())).thenReturn(Optional.of(evento));
        when(eventoRepository.save(any(Evento.class))).thenAnswer(inv -> inv.getArgument(0));

        Entrada entrada1 = new Entrada();
        entrada1.setNombreComprador("Comprador Uno");
        entrada1.setEmailComprador("uno@test.com");
        Entrada entrada2 = new Entrada();
        entrada2.setNombreComprador("Comprador Dos");
        entrada2.setEmailComprador("dos@test.com");
        when(entradaRepository.findByEventoId(evento.getId())).thenReturn(List.of(entrada1, entrada2));

        eventoService.cancelarEvento(evento.getId(), ID_ORGANIZADOR);

        verify(emailService).enviarNotificacionCancelacion("uno@test.com", "Comprador Uno", evento.getNombre());
        verify(emailService).enviarNotificacionCancelacion("dos@test.com", "Comprador Dos", evento.getNombre());
    }

    // ─────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────

    private void agregarTandaAlEvento() {
        Tanda tanda = new Tanda();
        tanda.setId(10L);
        tanda.setEvento(evento);
        tanda.setNombre("General");
        tanda.setPrecio(1000.0);
        tanda.setCupoMaximo(50);
        tanda.setCupoDisponible(50);
        evento.getTandas().add(tanda);
    }

    private EventoRequestDTO requestDto() {
        EventoRequestDTO dto = new EventoRequestDTO();
        dto.setNombre("Fiesta de Prueba");
        dto.setDescripcion("Descripción de prueba");
        dto.setFechaEvento(LocalDate.now().plusDays(30));
        dto.setHoraEvento(LocalTime.of(22, 0));
        dto.setLugar("Club de Prueba");
        return dto;
    }
}
