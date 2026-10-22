package com.asistiapp.backend.models.dtos.admin.notificacion;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AnuncioEnviadoResponseDTO {
    private int enviadas;
}
