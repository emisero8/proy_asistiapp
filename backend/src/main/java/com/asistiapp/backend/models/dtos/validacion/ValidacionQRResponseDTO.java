package com.asistiapp.backend.models.dtos.validacion;

import com.asistiapp.backend.models.enums.EstadoEntrada;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * DTO de respuesta tras la validación de un QR (CU-018).
 *
 * Incluye el resultado de la validación y los datos de la entrada
 * para que el Staff QR vea en pantalla quién es el comprador.
 */
@Getter
@Setter
@Builder
public class ValidacionQRResponseDTO {

    /** true = entrada válida y marcada como Usada. false = rechazada. */
    private boolean valido;

    /** Mensaje legible para mostrar en la pantalla del staff. */
    private String mensaje;

    /** Datos de la entrada — solo presentes si la validación fue exitosa. */
    private Long idEntrada;
    private String nombreComprador;
    private String emailComprador;
    private String nombreEvento;
    private String nombreTanda;
    private EstadoEntrada estadoAnterior;
    private LocalDateTime fechaUso;
}
