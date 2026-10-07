package com.asistiapp.backend.models.dtos.perfil;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PerfilResponseDTO {

    private Long id;
    private String nombre;
    private String email;
    private String fotoPerfilUrl;
}
