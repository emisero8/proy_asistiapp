package com.asistiapp.backend.models.dtos.entrada;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

/**
 * DTO para la venta manual de una entrada por parte del Staff Vendedor (CU-019).
 * Bypasea MercadoPago: la entrada se genera y marca como Pagada de forma inmediata.
 */
@Getter
@Setter
public class VentaManualRequestDTO {

    @NotNull(message = "El ID de la tanda es obligatorio")
    @Positive(message = "El ID de la tanda debe ser un número positivo")
    private Long idTanda;

    @NotBlank(message = "El nombre del comprador es obligatorio")
    private String nombreComprador;

    @NotBlank(message = "El email del comprador es obligatorio")
    @Email(message = "El email del comprador debe tener un formato válido")
    private String emailComprador;
}
