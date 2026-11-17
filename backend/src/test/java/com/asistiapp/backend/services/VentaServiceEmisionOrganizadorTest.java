package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.ForbiddenActionException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.dtos.entrada.EmisionOrganizadorRequestDTO;
import com.asistiapp.backend.models.dtos.entrada.EntradaResponseDTO;
import com.asistiapp.backend.models.entities.Entrada;
import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.entities.Tanda;
import com.asistiapp.backend.models.enums.CanalVenta;
import com.asistiapp.backend.models.enums.EstadoEntrada;
import com.asistiapp.backend.models.enums.EstadoEvento;
import com.asistiapp.backend.models.enums.TipoEmision;
import com.asistiapp.backend.repositories.EntradaRepository;
import com.asistiapp.backend.repositories.EventoRepository;
import com.asistiapp.backend.repositories.TandaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Emisión de entradas por el Organizador (cortesía o pago por fuera de la plataforma).
 * Salen del cupo de una tanda que ya está paga en créditos (los créditos se consumen al crear la
 * tanda), así que no hay otro cobro. Sin tope por comprador y sin ventana de venta: el límite
 * es el cupo. Todo o nada, con el mismo bloqueo anti-sobreventa que las demás ventas.
 */
@ExtendWith(MockitoExtension.class)
class VentaServiceEmisionOrganizadorTest {

    private static final long ID_ORGANIZADOR = 100L;

    @Mock
    private TandaRepository tandaRepository;
    @Mock
    private EntradaRepository entradaRepository;
    @Mock
    private NotificacionService notificacionService;
    @Mock
    private EventoRepository eventoRepository;

    @InjectMocks
    private VentaService ventaService;

    private Evento evento;
    private Tanda tanda;

    @BeforeEach
    void setUp() {
        evento = new Evento();
        evento.setId(1L);
        evento.setNombre("Evento de prueba");
        evento.setEstado(EstadoEvento.Publicado);
        evento.setIdOrganizador(ID_ORGANIZADOR);
        evento.setFechaEvento(LocalDate.now().plusDays(30));
        evento.setHoraEvento(LocalTime.of(21, 0));

        tanda = new Tanda();
        tanda.setId(10L);
        tanda.setEvento(evento);
        tanda.setNombre("General");
        tanda.setPrecio(1000.0);
        tanda.setCupoMaximo(50);
        tanda.setCupoDisponible(5);
    }

    private EmisionOrganizadorRequestDTO pedido(int cantidad, TipoEmision tipo) {
        EmisionOrganizadorRequestDTO dto = new EmisionOrganizadorRequestDTO();
        dto.setIdTanda(tanda.getId());
        dto.setCantidad(cantidad);
        dto.setTipo(tipo);
        dto.setNombreDestinatario("Prensa Diario Sur");
        dto.setEmailDestinatario("prensa@mail.com");
        dto.setMotivo("Cobertura del evento");
        return dto;
    }

    private void tandaConLock() {
        when(tandaRepository.findByIdWithLock(tanda.getId())).thenReturn(Optional.of(tanda));
    }

    private void cupoDescontable(int cantidad) {
        when(tandaRepository.decrementarCupo(tanda.getId(), cantidad)).thenReturn(1);
        when(entradaRepository.existsByCodigoQr(any())).thenReturn(false);
        when(entradaRepository.save(any(Entrada.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void emitir_cortesia_generaTodasLasEntradasConSuTipoMotivoYQuienLasEmitio() {
        tandaConLock();
        cupoDescontable(3);

        List<EntradaResponseDTO> respuesta =
                ventaService.emitirEntradasOrganizador(pedido(3, TipoEmision.Cortesia), ID_ORGANIZADOR);

        assertThat(respuesta).hasSize(3);
        assertThat(respuesta).extracting(EntradaResponseDTO::getCodigoQr).doesNotHaveDuplicates();
        verify(tandaRepository, times(1)).decrementarCupo(tanda.getId(), 3);
        verify(entradaRepository, times(3)).save(argThat(e ->
                e.getCanalVenta() == CanalVenta.Manual
                        && e.getEstado() == EstadoEntrada.Pagada
                        && e.getTipoEmision() == TipoEmision.Cortesia
                        && "Cobertura del evento".equals(e.getMotivoEmision())
                        && e.getIdOrganizadorEmisor().equals(ID_ORGANIZADOR)
                        && e.getIdStaffVendedor() == null
                        && e.getIdTransaccionPago() == null
                        && "Prensa Diario Sur".equals(e.getNombreComprador())
                        && "prensa@mail.com".equals(e.getEmailComprador())));
    }

    @Test
    void emitir_desdeUnaTandaDeSoloEmision_funciona() {
        tanda.setSoloEmision(true);
        tandaConLock();
        cupoDescontable(2);

        assertThat(ventaService.emitirEntradasOrganizador(pedido(2, TipoEmision.Cortesia), ID_ORGANIZADOR)).hasSize(2);
    }

    @Test
    void emitir_pagoExterno_guardaEseTipo() {
        tandaConLock();
        cupoDescontable(1);

        ventaService.emitirEntradasOrganizador(pedido(1, TipoEmision.Pago_Externo), ID_ORGANIZADOR);

        verify(entradaRepository).save(argThat(e -> e.getTipoEmision() == TipoEmision.Pago_Externo));
    }

    @Test
    void emitir_sinMotivo_loGuardaVacio() {
        tandaConLock();
        cupoDescontable(1);
        EmisionOrganizadorRequestDTO dto = pedido(1, TipoEmision.Cortesia);
        dto.setMotivo(null);

        ventaService.emitirEntradasOrganizador(dto, ID_ORGANIZADOR);

        verify(entradaRepository).save(argThat(e -> e.getMotivoEmision() == null));
    }

    @Test
    void emitir_laRespuestaAlOrganizadorIncluyeElTipoYElMotivo() {
        tandaConLock();
        cupoDescontable(1);

        List<EntradaResponseDTO> respuesta =
                ventaService.emitirEntradasOrganizador(pedido(1, TipoEmision.Cortesia), ID_ORGANIZADOR);

        assertThat(respuesta.get(0).getTipoEmision()).isEqualTo(TipoEmision.Cortesia);
        assertThat(respuesta.get(0).getMotivoEmision()).isEqualTo("Cobertura del evento");
    }

    @Test
    void emitir_tandaDeOtroOrganizador_seRechazaYNoSeDescuentaNada() {
        tandaConLock();

        assertThatThrownBy(() -> ventaService.emitirEntradasOrganizador(pedido(1, TipoEmision.Cortesia), 999L))
                .isInstanceOf(ForbiddenActionException.class);

        verify(tandaRepository, never()).decrementarCupo(anyLong(), anyInt());
        verify(entradaRepository, never()).save(any());
    }

    @Test
    void emitir_tandaInexistente_lanzaResourceNotFound() {
        when(tandaRepository.findByIdWithLock(tanda.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> ventaService.emitirEntradasOrganizador(pedido(1, TipoEmision.Cortesia), ID_ORGANIZADOR))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void emitir_eventoNoPublicado_seRechaza() {
        evento.setEstado(EstadoEvento.Borrador);
        tandaConLock();

        assertThatThrownBy(() -> ventaService.emitirEntradasOrganizador(pedido(1, TipoEmision.Cortesia), ID_ORGANIZADOR))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("no está disponible");

        verify(entradaRepository, never()).save(any());
    }

    @Test
    void emitir_eventoYaFinalizado_seRechaza() {
        evento.setFechaEvento(LocalDate.now().minusDays(1));
        tandaConLock();

        assertThatThrownBy(() -> ventaService.emitirEntradasOrganizador(pedido(1, TipoEmision.Cortesia), ID_ORGANIZADOR))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("ya finalizó");
    }

    @Test
    void emitir_masEntradasQueElCupo_noGeneraNinguna() {
        tandaConLock(); // cupo 5

        assertThatThrownBy(() -> ventaService.emitirEntradasOrganizador(pedido(6, TipoEmision.Cortesia), ID_ORGANIZADOR))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Solo quedan 5");

        verify(tandaRepository, never()).decrementarCupo(anyLong(), anyInt());
        verify(entradaRepository, never()).save(any());
    }

    @Test
    void emitir_siElCupoSeAgotaEnElInterin_noGeneraNinguna() {
        tandaConLock();
        when(tandaRepository.decrementarCupo(tanda.getId(), 3)).thenReturn(0);

        assertThatThrownBy(() -> ventaService.emitirEntradasOrganizador(pedido(3, TipoEmision.Cortesia), ID_ORGANIZADOR))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("No hay cupo para 3 entradas");

        verify(entradaRepository, never()).save(any());
    }

    @Test
    void emitir_noAplicaElTopePorComprador() {
        tandaConLock();
        cupoDescontable(5);

        // El mismo contacto puede recibir todas: el límite del Organizador es el cupo de la tanda.
        List<EntradaResponseDTO> respuesta =
                ventaService.emitirEntradasOrganizador(pedido(5, TipoEmision.Cortesia), ID_ORGANIZADOR);

        assertThat(respuesta).hasSize(5);
        verify(entradaRepository, never()).countByEventoIdAndEmailComprador(any(), any());
    }

    @Test
    void emitir_noDependeDeLaVentanaDeVentaDeLaTanda() {
        tanda.setFechaFinVigencia(LocalDateTime.now().minusDays(2)); // la venta online ya cerró
        tandaConLock();
        cupoDescontable(1);

        assertThat(ventaService.emitirEntradasOrganizador(pedido(1, TipoEmision.Cortesia), ID_ORGANIZADOR)).hasSize(1);
    }

    @Test
    void emitir_noAvisaAlOrganizadorDeSuPropiaEmision() {
        tandaConLock();
        cupoDescontable(5); // además agota la tanda

        ventaService.emitirEntradasOrganizador(pedido(5, TipoEmision.Cortesia), ID_ORGANIZADOR);

        verifyNoInteractions(notificacionService);
    }

    @Test
    void listarEntradasPorEvento_deUnEventoAjeno_seRechaza() {
        // Antes cualquier Organizador podía listar las entradas (con el QR y el mail de cada comprador)
        // de un evento de otro con solo conocer su id.
        when(eventoRepository.findById(1L)).thenReturn(Optional.of(evento));

        assertThatThrownBy(() -> ventaService.listarEntradasPorEvento(1L, 999L))
                .isInstanceOf(ForbiddenActionException.class);

        verify(entradaRepository, never()).findByEventoId(anyLong());
    }

    @Test
    void listarEntradasPorEvento_eventoInexistente_lanzaResourceNotFound() {
        when(eventoRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> ventaService.listarEntradasPorEvento(1L, ID_ORGANIZADOR))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void elMotivoSeLeMuestraAlOrganizadorPeroNoAlComprador() {
        Entrada e = entradaEmitida();
        when(eventoRepository.findById(1L)).thenReturn(Optional.of(evento));
        when(entradaRepository.findByEventoId(1L)).thenReturn(List.of(e));
        when(entradaRepository.findByCodigoQr("QR-X")).thenReturn(Optional.of(e));

        assertThat(ventaService.listarEntradasPorEvento(1L, ID_ORGANIZADOR).get(0).getMotivoEmision())
                .isEqualTo("Cobertura del evento");
        // La consulta pública por código la usa quien tiene la entrada: la nota interna no se le muestra.
        assertThat(ventaService.obtenerEntradaPorCodigoQr("QR-X").getMotivoEmision()).isNull();
    }

    private Entrada entradaEmitida() {
        Entrada e = new Entrada();
        e.setId(7L);
        e.setTanda(tanda);
        e.setCodigoQr("QR-X");
        e.setNombreComprador("Prensa Diario Sur");
        e.setEmailComprador("prensa@mail.com");
        e.setEstado(EstadoEntrada.Pagada);
        e.setCanalVenta(CanalVenta.Manual);
        e.setTipoEmision(TipoEmision.Cortesia);
        e.setMotivoEmision("Cobertura del evento");
        e.setIdOrganizadorEmisor(ID_ORGANIZADOR);
        return e;
    }
}
