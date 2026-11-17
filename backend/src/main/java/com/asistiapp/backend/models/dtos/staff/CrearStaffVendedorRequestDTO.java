package com.asistiapp.backend.models.dtos.staff;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CrearStaffVendedorRequestDTO {

    @NotBlank(message = "El nombre es obligatorio")
    private String nombre;

    @NotBlank(message = "El email es obligatorio")
    @Email(message = "El email debe tener un formato válido")
    private String email;

    @NotNull(message = "Tenés que asignar el vendedor a un evento")
    private Long idEvento;

    @NotNull(message = "Tenés que fijar un tope de entradas para el vendedor")
    @Min(value = 1, message = "El tope de entradas tiene que ser al menos 1")
    private Integer topeEntradas;
}
