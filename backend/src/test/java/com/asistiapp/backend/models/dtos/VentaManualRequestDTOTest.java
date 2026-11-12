package com.asistiapp.backend.models.dtos;

import com.asistiapp.backend.models.dtos.entrada.VentaManualRequestDTO;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class VentaManualRequestDTOTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private VentaManualRequestDTO dto(Integer cantidad) {
        VentaManualRequestDTO dto = new VentaManualRequestDTO();
        dto.setIdTanda(1L);
        dto.setNombreComprador("Cliente");
        dto.setEmailComprador("cliente@example.com");
        dto.setCantidad(cantidad);
        return dto;
    }

    @Test
    void sinInformarCantidad_vendeUna() {
        VentaManualRequestDTO dto = new VentaManualRequestDTO();
        assertThat(dto.getCantidad()).isEqualTo(1);
    }

    @Test
    void cantidadEntre1y20_esValida() {
        assertThat(validator.validate(dto(1))).isEmpty();
        assertThat(validator.validate(dto(20))).isEmpty();
    }

    @Test
    void cantidadFueraDeRango_oNula_esInvalida() {
        assertThat(validator.validate(dto(0))).hasSize(1);
        assertThat(validator.validate(dto(-3))).hasSize(1);
        assertThat(validator.validate(dto(21))).hasSize(1);
        assertThat(validator.validate(dto(null))).hasSize(1);
    }
}
