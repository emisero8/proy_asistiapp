package com.asistiapp.backend.models.dtos.evento;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** URL pública de una imagen subida a Cloudinary, lista para guardarse en imagenPortadaUrl. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ImagenSubidaResponseDTO {

    private String url;
}
