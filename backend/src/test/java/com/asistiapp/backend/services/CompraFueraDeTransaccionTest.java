package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.PasarelaPagoException;
import com.asistiapp.backend.models.dtos.credito.IniciarCompraCreditoRequestDTO;
import com.asistiapp.backend.models.dtos.entrada.CompraOnlineRequestDTO;
import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.models.entities.PaqueteCredito;
import com.asistiapp.backend.models.entities.Tanda;
import com.asistiapp.backend.models.enums.EstadoEvento;
import com.asistiapp.backend.models.enums.EstadoPaquete;
import com.asistiapp.backend.models.enums.EstadoTransaccion;
import com.asistiapp.backend.models.enums.EstadoUsuario;
import com.asistiapp.backend.models.enums.RolUsuario;
import com.asistiapp.backend.repositories.EventoRepository;
import com.asistiapp.backend.repositories.OrganizadorRepository;
import com.asistiapp.backend.repositories.PaqueteCreditoRepository;
import com.asistiapp.backend.repositories.TandaRepository;
import com.asistiapp.backend.repositories.TransaccionCreditoRepository;
import com.asistiapp.backend.repositories.TransaccionPagoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

/**
 * Las llamadas a Mercado Pago van fuera de las transacciones de base: mientras se espera la respuesta
 * no hay que retener una conexión. La orden queda guardada antes de llamar y, si Mercado Pago falla,
 * se marca como Rechazada. Contra H2 y sin mockear las transacciones.
 */
@SpringBootTest(properties = "app.mercadopago.exigir-cuenta-vinculada=false")
@ActiveProfiles("test")
class CompraFueraDeTransaccionTest {

    @Autowired
    private VentaService ventaService;
    @Autowired
    private CreditoService creditoService;
    @Autowired
    private EventoRepository eventoRepository;
    @Autowired
    private TandaRepository tandaRepository;
    @Autowired
    private OrganizadorRepository organizadorRepository;
    @Autowired
    private PaqueteCreditoRepository paqueteCreditoRepository;
    @Autowired
    private TransaccionPagoRepository transaccionPagoRepository;
    @Autowired
    private TransaccionCreditoRepository transaccionCreditoRepository;

    @MockBean
    private MercadoPagoService mercadoPagoService;
    @MockBean
    private CuentaCobroService cuentaCobroService;

    /** Lo que se observa en el momento exacto de cada llamada externa. */
    private final List<Boolean> habiaTransaccion = new ArrayList<>();
    private final List<EstadoTransaccion> estadoGuardadoAlLlamar = new ArrayList<>();

    @BeforeEach
    void preparar() {
        habiaTransaccion.clear();
        estadoGuardadoAlLlamar.clear();
        when(mercadoPagoService.calcularVencimiento()).thenReturn(LocalDateTime.now().plusMinutes(30));
        when(cuentaCobroService.tokenParaCobrar(anyLong())).thenAnswer(i -> {
            habiaTransaccion.add(TransactionSynchronizationManager.isActualTransactionActive());
            return "token-de-prueba";
        });
    }

    @Test
    void compraDeEntradas_llamaAMercadoPagoSinTransaccionYConLaOrdenYaGuardada() {
        when(mercadoPagoService.crearPreferencia(any(), any())).thenAnswer(i -> {
            MercadoPagoService.OrdenACobrar orden = i.getArgument(0);
            habiaTransaccion.add(TransactionSynchronizationManager.isActualTransactionActive());
            transaccionPagoRepository.findByExternalReference(orden.externalReference())
                    .ifPresent(t -> estadoGuardadoAlLlamar.add(t.getEstado()));
            return new MercadoPagoService.PreferenciaCreada("pref", "https://mp.test/init");
        });

        var respuesta = ventaService.iniciarCompraOnline(compraDeEntradas(crearTanda()));

        assertThat(respuesta.getUrlPago()).isEqualTo("https://mp.test/init");
        assertThat(habiaTransaccion).containsExactly(false, false); // token y preferencia
        assertThat(estadoGuardadoAlLlamar).containsExactly(EstadoTransaccion.Pendiente);
    }

    @Test
    void compraDeEntradas_siMercadoPagoFalla_laOrdenQuedaRechazada() {
        List<String> referencias = new ArrayList<>();
        when(mercadoPagoService.crearPreferencia(any(), any())).thenAnswer(i -> {
            referencias.add(i.<MercadoPagoService.OrdenACobrar>getArgument(0).externalReference());
            throw new PasarelaPagoException("Mercado Pago no responde");
        });

        assertThatThrownBy(() -> ventaService.iniciarCompraOnline(compraDeEntradas(crearTanda())))
                .isInstanceOf(PasarelaPagoException.class);

        assertThat(transaccionPagoRepository.findByExternalReference(referencias.get(0)).orElseThrow().getEstado())
                .isEqualTo(EstadoTransaccion.Rechazada);
    }

    @Test
    void compraDeCreditos_llamaAMercadoPagoSinTransaccionYConLaOrdenYaGuardada() {
        when(mercadoPagoService.crearPreferencia(any())).thenAnswer(i -> {
            MercadoPagoService.OrdenACobrar orden = i.getArgument(0);
            habiaTransaccion.add(TransactionSynchronizationManager.isActualTransactionActive());
            transaccionCreditoRepository.findByExternalReference(orden.externalReference())
                    .ifPresent(t -> estadoGuardadoAlLlamar.add(t.getEstado()));
            return new MercadoPagoService.PreferenciaCreada("pref", "https://mp.test/init");
        });

        var respuesta = creditoService.iniciarCompraCredito(compraDeCreditos(), crearOrganizador().getId());

        assertThat(respuesta.getUrlPago()).isEqualTo("https://mp.test/init");
        assertThat(habiaTransaccion).containsExactly(false);
        assertThat(estadoGuardadoAlLlamar).containsExactly(EstadoTransaccion.Pendiente);
    }

    @Test
    void compraDeCreditos_siMercadoPagoFalla_laOrdenQuedaRechazada() {
        List<String> referencias = new ArrayList<>();
        when(mercadoPagoService.crearPreferencia(any())).thenAnswer(i -> {
            referencias.add(i.<MercadoPagoService.OrdenACobrar>getArgument(0).externalReference());
            throw new PasarelaPagoException("Mercado Pago no responde");
        });

        Long idOrganizador = crearOrganizador().getId();
        assertThatThrownBy(() -> creditoService.iniciarCompraCredito(compraDeCreditos(), idOrganizador))
                .isInstanceOf(PasarelaPagoException.class);

        assertThat(transaccionCreditoRepository.findByExternalReference(referencias.get(0)).orElseThrow().getEstado())
                .isEqualTo(EstadoTransaccion.Rechazada);
    }

    private Tanda crearTanda() {
        Evento evento = new Evento();
        evento.setIdOrganizador(crearOrganizador().getId());
        evento.setNombre("Evento fuera de transacción " + System.nanoTime());
        evento.setFechaEvento(LocalDate.now().plusDays(30));
        evento.setHoraEvento(LocalTime.of(21, 0));
        evento.setLugar("Lugar de prueba");
        evento.setEstado(EstadoEvento.Publicado);

        Tanda tanda = new Tanda();
        tanda.setEvento(eventoRepository.save(evento));
        tanda.setNombre("General");
        tanda.setPrecio(1000.0);
        tanda.setCupoMaximo(10);
        tanda.setCupoDisponible(10);
        return tandaRepository.save(tanda);
    }

    private Organizador crearOrganizador() {
        Organizador organizador = new Organizador();
        organizador.setNombre("Organizador de prueba");
        organizador.setEmail("organizador-" + System.nanoTime() + "@test.com");
        organizador.setPasswordHash("hash");
        organizador.setRol(RolUsuario.Organizador);
        organizador.setEstado(EstadoUsuario.Activo);
        organizador.setSaldoCreditos(0);
        return organizadorRepository.save(organizador);
    }

    private CompraOnlineRequestDTO compraDeEntradas(Tanda tanda) {
        CompraOnlineRequestDTO dto = new CompraOnlineRequestDTO();
        dto.setIdTanda(tanda.getId());
        dto.setCantidad(1);
        dto.setNombreComprador("Comprador");
        dto.setEmailComprador("comprador-" + System.nanoTime() + "@test.com");
        return dto;
    }

    private IniciarCompraCreditoRequestDTO compraDeCreditos() {
        PaqueteCredito paquete = new PaqueteCredito();
        paquete.setNombre("Inicial " + System.nanoTime());
        paquete.setCantidadCreditos(10);
        paquete.setPrecio(1000.0);
        paquete.setEstado(EstadoPaquete.Activo);

        IniciarCompraCreditoRequestDTO dto = new IniciarCompraCreditoRequestDTO();
        dto.setIdPaquete(paqueteCreditoRepository.save(paquete).getId());
        return dto;
    }
}
