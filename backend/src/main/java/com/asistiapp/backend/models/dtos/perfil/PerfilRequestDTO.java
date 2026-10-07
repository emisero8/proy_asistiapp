package com.asistiapp.backend.models.dtos.perfil;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Datos editables del perfil del Organizador. La foto llega como URL ya subida a Cloudinary. */
@Getter
@Setter
@NoArgsConstructor
public class PerfilRequestDTO {

    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 150, message = "El nombre no puede superar los 150 caracteres")
    private String nombre;

    @Size(max = 500, message = "La URL de la foto no puede superar los 500 caracteres")
    private String fotoPerfilUrl;
}
