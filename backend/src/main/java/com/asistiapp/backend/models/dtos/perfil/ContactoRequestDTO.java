package com.asistiapp.backend.models.dtos.perfil;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Contacto del Organizador para el botón de arrepentimiento (8.8). Vacío en ambos = borrarlo. */
@Getter
@Setter
@NoArgsConstructor
public class ContactoRequestDTO {

    @Size(max = 30, message = "El WhatsApp es demasiado largo")
    private String contactoWhatsapp;

    @Size(max = 200, message = "El email es demasiado largo")
    private String contactoEmail;
}
