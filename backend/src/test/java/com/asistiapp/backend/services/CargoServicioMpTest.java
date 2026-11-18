package com.asistiapp.backend.services;

import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.models.enums.PlazoLiberacionMp;
import com.asistiapp.backend.models.enums.ZonaComisionMp;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.RoundingMode;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * El cargo por procesamiento se cobra con dinero real: se prueba contra valores calculados a mano y se comprueba
 * la propiedad que lo define (el Organizador recibe el precio de la entrada). Los mismos casos están en
 * `frontend/src/lib/comisionesMp.test.ts`.
 */
class CargoServicioMpTest {

    @ParameterizedTest(name = "{0} {1} sobre ${2} → ${3}")
    @CsvSource({
            "AlInstante, General, 10000, 823.79",
            "AlInstante, BuenosAiresEntreRiosChubut, 10000, 867.91",
            "Dias10, General, 10000, 560.99",
            "Dias10, BuenosAiresEntreRiosChubut, 10000, 590.76",
            "Dias18, General, 10000, 427.74",
            "Dias18, BuenosAiresEntreRiosChubut, 10000, 450.15",
            "Dias35, General, 10000, 183.60",
            "Dias35, BuenosAiresEntreRiosChubut, 10000, 192.39",
            "AlInstante, General, 4500, 370.70",
            "Dias35, General, 4500, 82.62",
            "AlInstante, General, 1, 0.08",
    })
    void cargoUnitario_esLaComisionConIvaCalculadaSobreElTotal(PlazoLiberacionMp plazo, ZonaComisionMp zona,
                                                               double precio, String esperado) {
        assertThat(CargoServicioMp.cargoUnitario(precio, plazo, zona)).isEqualByComparingTo(esperado);
    }

    @ParameterizedTest
    @CsvSource({"AlInstante, General", "Dias10, BuenosAiresEntreRiosChubut", "Dias35, General"})
    void conElCargo_elOrganizadorRecibeElPrecioDeLaEntradaDespuesDeLaComision(PlazoLiberacionMp plazo, ZonaComisionMp zona) {
        BigDecimal precio = BigDecimal.valueOf(10000);
        BigDecimal cobrado = precio.add(CargoServicioMp.cargoUnitario(10000, plazo, zona));
        BigDecimal comisionMp = cobrado.multiply(CargoServicioMp.tasaConIva(plazo, zona));
        BigDecimal neto = cobrado.subtract(comisionMp).setScale(2, RoundingMode.HALF_UP);

        // Por el redondeo al centavo del cargo, el neto puede diferir del precio en menos de un centavo.
        assertThat(neto.subtract(precio).abs()).isLessThanOrEqualTo(new BigDecimal("0.01"));
    }

    @Test
    void tasaConIva_sumaElIvaDel21PorCientoALaComision() {
        assertThat(CargoServicioMp.tasaConIva(PlazoLiberacionMp.AlInstante, ZonaComisionMp.General))
                .isEqualByComparingTo("0.076109");
        assertThat(CargoServicioMp.tasaConIva(PlazoLiberacionMp.Dias35, ZonaComisionMp.BuenosAiresEntreRiosChubut))
                .isEqualByComparingTo("0.018876");
    }

    @Test
    void porcentajeRecargo_esElRecargoEfectivoSobreElPrecio() {
        assertThat(CargoServicioMp.porcentajeRecargo(PlazoLiberacionMp.AlInstante, ZonaComisionMp.General))
                .isEqualByComparingTo("8.24");
        assertThat(CargoServicioMp.porcentajeRecargo(PlazoLiberacionMp.Dias35, ZonaComisionMp.General))
                .isEqualByComparingTo("1.84");
    }

    @Test
    void precioCeroONegativo_noLlevaCargo() {
        assertThat(CargoServicioMp.cargoUnitario(0, PlazoLiberacionMp.AlInstante, ZonaComisionMp.General)).isZero();
        assertThat(CargoServicioMp.cargoUnitario(-5, PlazoLiberacionMp.AlInstante, ZonaComisionMp.General)).isZero();
    }

    @Test
    void organizadorQueAbsorbeLaComision_noLeSumaNadaAlComprador() {
        Organizador organizador = new Organizador();
        organizador.setPlazoLiberacionMp(PlazoLiberacionMp.AlInstante);

        assertThat(CargoServicioMp.cargoUnitarioPara(organizador, 10000)).isZero();
        assertThat(CargoServicioMp.porcentajeRecargoPara(organizador)).isNull();
        assertThat(CargoServicioMp.cargoUnitarioPara(null, 10000)).isZero();
    }

    @Test
    void organizadorQueTrasladaSinPlazoNiZonaElegidos_usaAlInstanteYTasaGeneral() {
        Organizador organizador = new Organizador();
        organizador.setTrasladarCargoMp(true);

        assertThat(CargoServicioMp.cargoUnitarioPara(organizador, 10000)).isEqualByComparingTo("823.79");
        assertThat(CargoServicioMp.porcentajeRecargoPara(organizador)).isEqualByComparingTo("8.24");
    }
}
