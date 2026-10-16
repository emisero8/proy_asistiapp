package com.asistiapp.backend.models.dtos.entrada;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

/**
 * DTO para iniciar una compra online (CU-017).
 * El comprador indica la tanda que quiere y sus datos de contacto.
 * El pago se procesa a través de MercadoPago Checkout Pro.
 */
@Getter
@Setter
public class CompraOnlineRequestDTO {

    @NotNull(message = "El ID de la tanda es obligatorio")
    @Positive(message = "El ID de la tanda debe ser un número positivo")
    private Long idTanda;

    @NotNull(message = "La cantidad de entradas es obligatoria")
    @Min(value = 1, message = "Tenés que comprar al menos 1 entrada")
    @Max(value = 20, message = "No se pueden comprar más de 20 entradas por orden")
    private Integer cantidad = 1;

    @NotBlank(message = "El nombre del comprador es obligatorio")
    private String nombreComprador;

    @NotBlank(message = "El email del comprador es obligatorio")
    @Email(message = "El email del comprador debe tener un formato válido")
    private String emailComprador;
}
