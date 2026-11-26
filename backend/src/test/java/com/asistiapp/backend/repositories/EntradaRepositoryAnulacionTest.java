package com.asistiapp.backend.repositories;

import com.asistiapp.backend.models.entities.Entrada;
import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.entities.Tanda;
import com.asistiapp.backend.models.enums.CanalVenta;
import com.asistiapp.backend.models.enums.EstadoEntrada;
import com.asistiapp.backend.models.enums.EstadoEvento;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Las consultas de anular y reembolsar (8.6), contra H2 y con la consulta real: una anulada ya no cuenta como
 * vendida, y se reembolsa una sola vez aunque lleguen dos pedidos a la vez.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class EntradaRepositoryAnulacionTest {

    private static final String EMAIL = "comprador@mail.com";

    @Autowired
    private EventoRepository eventoRepository;
    @Autowired
    private TandaRepository tandaRepository;
    @Autowired
    private EntradaRepository entradaRepository;

    private Evento evento;
    private Tanda tanda;

    @BeforeEach
    void setUp() {
        evento = new Evento();
        evento.setNombre("Evento de anulaciones");
        evento.setDescripcion("x");
        evento.setLugar("Lugar");
        evento.setIdOrganizador(1L);
        evento.setEstado(EstadoEvento.Publicado);
        evento.setFechaEvento(LocalDate.now().plusDays(30));
        evento.setHoraEvento(LocalTime.of(21, 0));
        evento = eventoRepository.save(evento);

        tanda = new Tanda();
        tanda.setEvento(evento);
        tanda.setNombre("General");
        tanda.setPrecio(1000.0);
        tanda.setCupoMaximo(10);
        tanda.setCupoDisponible(10);
        tanda = tandaRepository.save(tanda);
    }

    private Entrada entrada(String qr, EstadoEntrada estado, Long idTransaccionPago, Long idStaffVendedor) {
        Entrada e = new Entrada();
        e.setTanda(tanda);
        e.setCodigoQr(qr);
        e.setNombreComprador("Comprador");
        e.setEmailComprador(EMAIL);
        e.setEstado(estado);
        e.setCanalVenta(idTransaccionPago != null ? CanalVenta.Online : CanalVenta.Manual);
        e.setIdTransaccionPago(idTransaccionPago);
        e.setIdStaffVendedor(idStaffVendedor);
        return entradaRepository.save(e);
    }

    @Test
    void lasAnuladasNoCuentanComoVendidasNiParaElTopePorCompradorNiPorVendedor() {
        entrada("QR-AN-1", EstadoEntrada.Pagada, null, 55L);
        entrada("QR-AN-2", EstadoEntrada.Anulada, null, 55L);
        entrada("QR-AN-3", EstadoEntrada.Usada, null, 55L);

        assertThat(entradaRepository.countByEventoId(evento.getId())).isEqualTo(2);
        assertThat(entradaRepository.countByEventoIdAndEmailComprador(evento.getId(), EMAIL)).isEqualTo(2);
        assertThat(entradaRepository.countByIdStaffVendedor(55L)).isEqualTo(2);
        var resumen = entradaRepository.resumenPorVendedor(java.util.List.of(55L)).get(0);
        assertThat(resumen[1]).isEqualTo(2L);
        assertThat(((Number) resumen[2]).doubleValue()).isEqualTo(2000.0);
    }

    @Test
    void cambiarElPrecioDeLaTandaNoCambiaLoQueElVendedorTieneQueRendir() {
        Entrada vendida = entrada("QR-PV-1", EstadoEntrada.Pagada, null, 77L);
        vendida.setPrecioVenta(1000.0);
        entradaRepository.save(vendida);
        tanda.setPrecio(4000.0);
        tandaRepository.save(tanda);

        var resumen = entradaRepository.resumenPorVendedor(java.util.List.of(77L)).get(0);

        assertThat(((Number) resumen[2]).doubleValue()).isEqualTo(1000.0);
    }

    @Test
    void lasAnuladasNoSumanIngresosNiEntradasVigentesGlobales() {
        double ingresosAntes = entradaRepository.sumaIngresosTotales();
        long vigentesAntes = entradaRepository.countVigentes();

        entrada("QR-AN-4", EstadoEntrada.Pagada, null, null);
        entrada("QR-AN-5", EstadoEntrada.Anulada, null, null);

        assertThat(entradaRepository.sumaIngresosTotales() - ingresosAntes).isEqualTo(1000.0);
        assertThat(entradaRepository.countVigentes() - vigentesAntes).isEqualTo(1);
    }

    @Test
    void pendientesDeReembolso_incluyeLasAnuladasOnlineSinReembolsar_yNoLasManualesNiLasYaReembolsadas() {
        Entrada anuladaOnline = entrada("QR-AN-6", EstadoEntrada.Anulada, 11L, null);
        entrada("QR-AN-7", EstadoEntrada.Pagada, 11L, null);               // vigente en un evento activo: no
        entrada("QR-AN-8", EstadoEntrada.Anulada, null, null);              // manual: no pasó por Mercado Pago
        Entrada yaReembolsada = entrada("QR-AN-9", EstadoEntrada.Anulada, 11L, null);
        yaReembolsada.setReembolsadaEn(java.time.LocalDateTime.now());
        entradaRepository.save(yaReembolsada);

        assertThat(entradaRepository.findPendientesDeReembolso(evento.getId()))
                .extracting(Entrada::getId).containsExactly(anuladaOnline.getId());
    }

    @Test
    void pendientesDeReembolso_siElEventoSeCancelo_incluyeTodasLasComprasOnline() {
        entrada("QR-AN-10", EstadoEntrada.Pagada, 11L, null);
        entrada("QR-AN-11", EstadoEntrada.Pagada, null, null); // manual: no
        evento.setEstado(EstadoEvento.Cancelado);
        eventoRepository.save(evento);

        assertThat(entradaRepository.findPendientesDeReembolso(evento.getId())).hasSize(1);
    }

    @Test
    void reservarReembolso_loTomaUnaSolaVez_yLiberarloPermiteReintentar() {
        Entrada e = entrada("QR-AN-12", EstadoEntrada.Anulada, 11L, null);

        assertThat(entradaRepository.reservarReembolso(e.getId())).isEqualTo(1);
        assertThat(entradaRepository.reservarReembolso(e.getId())).isEqualTo(0); // el segundo pedido no lo logra

        entradaRepository.liberarReembolso(e.getId());
        assertThat(entradaRepository.reservarReembolso(e.getId())).isEqualTo(1);
    }

    @Test
    void reservarReembolso_deUnaYaReembolsada_noLoLogra() {
        Entrada e = entrada("QR-AN-13", EstadoEntrada.Anulada, 11L, null);
        e.setReembolsadaEn(java.time.LocalDateTime.now());
        entradaRepository.save(e);

        assertThat(entradaRepository.reservarReembolso(e.getId())).isEqualTo(0);
    }
}
