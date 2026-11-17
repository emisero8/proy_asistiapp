package com.asistiapp.backend.repositories;

import com.asistiapp.backend.models.entities.Entrada;
import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.entities.Tanda;
import com.asistiapp.backend.models.enums.CanalVenta;
import com.asistiapp.backend.models.enums.EstadoEntrada;
import com.asistiapp.backend.models.enums.EstadoEvento;
import com.asistiapp.backend.models.enums.TipoEmision;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Los ingresos globales del Admin suman el precio de las entradas, pero una cortesía no cobró nada:
 * no cuenta. El pago externo sí (cobrado, aunque fuera de la plataforma). Contra H2, con la consulta real.
 * La base se comparte con otros tests, así que se mide la diferencia, no el valor absoluto.
 */
@SpringBootTest
@ActiveProfiles("test")
class EntradaRepositoryIngresosTest {

    @Autowired
    private EventoRepository eventoRepository;
    @Autowired
    private TandaRepository tandaRepository;
    @Autowired
    private EntradaRepository entradaRepository;

    private Tanda tandaDe1000() {
        Evento evento = new Evento();
        evento.setNombre("Evento de ingresos");
        evento.setDescripcion("x");
        evento.setLugar("Lugar");
        evento.setIdOrganizador(1L);
        evento.setEstado(EstadoEvento.Publicado);
        evento.setFechaEvento(LocalDate.now().plusDays(30));
        evento.setHoraEvento(LocalTime.of(21, 0));
        evento = eventoRepository.save(evento);

        Tanda tanda = new Tanda();
        tanda.setEvento(evento);
        tanda.setNombre("General");
        tanda.setPrecio(1000.0);
        tanda.setCupoMaximo(10);
        tanda.setCupoDisponible(10);
        return tandaRepository.save(tanda);
    }

    private void entrada(Tanda tanda, String qr, TipoEmision tipo) {
        Entrada e = new Entrada();
        e.setTanda(tanda);
        e.setCodigoQr(qr);
        e.setNombreComprador("Comprador");
        e.setEmailComprador("c@mail.com");
        e.setEstado(EstadoEntrada.Pagada);
        e.setCanalVenta(CanalVenta.Manual);
        e.setTipoEmision(tipo);
        entradaRepository.save(e);
    }

    @Test
    void sumaIngresosTotales_noContaLasCortesiasPeroSiElPagoExterno() {
        double antes = entradaRepository.sumaIngresosTotales();
        Tanda tanda = tandaDe1000();

        entrada(tanda, "QR-ING-NORMAL", null);
        entrada(tanda, "QR-ING-EXTERNO", TipoEmision.Pago_Externo);
        entrada(tanda, "QR-ING-CORTESIA-1", TipoEmision.Cortesia);
        entrada(tanda, "QR-ING-CORTESIA-2", TipoEmision.Cortesia);

        assertThat(entradaRepository.sumaIngresosTotales() - antes).isEqualTo(2000.0);
    }
}
