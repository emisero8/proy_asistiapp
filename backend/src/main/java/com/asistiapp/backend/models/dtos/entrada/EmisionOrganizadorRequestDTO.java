package com.asistiapp.backend.models.dtos.entrada;

import com.asistiapp.backend.models.enums.TipoEmision;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Pedido del Organizador para emitir él mismo entradas de una de sus tandas (cortesía o pago por
 * fuera de la plataforma). Se generan todas o ninguna. No tiene tope por comprador: el límite es el
 * cupo de la tanda, que ya está pago en créditos.
 */
@Getter
@Setter
public class EmisionOrganizadorRequestDTO {

    @NotNull(message = "El ID de la tanda es obligatorio")
    @Positive(message = "El ID de la tanda debe ser un número positivo")
    private Long idTanda;

    @NotNull(message = "La cantidad de entradas es obligatoria")
    @Min(value = 1, message = "Tenés que emitir al menos 1 entrada")
    @Max(value = 100, message = "No se pueden emitir más de 100 entradas por operación")
    private Integer cantidad = 1;

    @NotNull(message = "El tipo de emisión es obligatorio")
    private TipoEmision tipo;

    @NotBlank(message = "El nombre del destinatario es obligatorio")
    @Size(max = 200, message = "El nombre del destinatario no puede superar los 200 caracteres")
    private String nombreDestinatario;

    @NotBlank(message = "El email del destinatario es obligatorio")
    @Email(message = "El email del destinatario debe tener un formato válido")
    @Size(max = 200, message = "El email del destinatario no puede superar los 200 caracteres")
    private String emailDestinatario;

    /** Nota interna del Organizador (por qué se emitió). No la ve quien recibe la entrada. */
    @Size(max = 200, message = "El motivo no puede superar los 200 caracteres")
    private String motivo;

    /** Si es true se le manda al destinatario el mail con las entradas; si no, el Organizador las entrega por su cuenta. */
    private boolean enviarMail;
}
