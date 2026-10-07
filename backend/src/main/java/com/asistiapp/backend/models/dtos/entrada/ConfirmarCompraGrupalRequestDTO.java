package com.asistiapp.backend.models.dtos.entrada;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

/**
 * Junta los códigos QR de una compra de varias entradas para mandar un solo mail
 * con todas, en vez de un mail por cada confirmación de pago (CU-017).
 *
 * El codigoQr ya funciona como token de acceso en el resto de la app (ver
 * GET /tickets/by-codigo): acá se usa de la misma forma para validar que el
 * comprador que pide el mail es dueño de cada entrada que pone en la lista.
 */
@Getter
@Setter
public class ConfirmarCompraGrupalRequestDTO {

    @NotEmpty(message = "La lista de códigos QR no puede estar vacía")
    @Size(max = 50, message = "No se pueden confirmar más de 50 entradas juntas")
    private List<@NotBlank String> codigosQr;

    @NotBlank(message = "El nombre del comprador es obligatorio")
    private String nombreComprador;

    @NotBlank(message = "El email del comprador es obligatorio")
    @Email(message = "El email del comprador debe tener un formato válido")
    private String emailComprador;
}
