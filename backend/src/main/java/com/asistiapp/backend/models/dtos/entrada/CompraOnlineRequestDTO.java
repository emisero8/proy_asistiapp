package com.asistiapp.backend.models.dtos.entrada;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

/**
 * DTO para iniciar una compra online (CU-017).
 * El comprador indica la tanda que quiere y sus datos de contacto.
 * El pago se procesa a través de MercadoPago (simulado).
 */
@Getter
@Setter
public class CompraOnlineRequestDTO {

    @NotNull(message = "El ID de la tanda es obligatorio")
    @Positive(message = "El ID de la tanda debe ser un número positivo")
    private Long idTanda;

    @NotBlank(message = "El nombre del comprador es obligatorio")
    private String nombreComprador;

    @NotBlank(message = "El email del comprador es obligatorio")
    @Email(message = "El email del comprador debe tener un formato válido")
    private String emailComprador;
}
