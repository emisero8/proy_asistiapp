package com.asistiapp.backend.services;

import com.asistiapp.backend.repositories.ConfiguracionSistemaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Lectura de configuraciones globales (CU-028) para lógica de negocio —
 * ej. EventoService/AuthService leen acá los montos de créditos en vez de
 * usar constantes fijas en código. Si la clave no fue configurada todavía
 * por el Admin, se usa el valor por defecto (el sistema sigue funcionando
 * sin requerir seed de datos).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ConfiguracionService {

    private final ConfiguracionSistemaRepository configuracionSistemaRepository;

    @Transactional(readOnly = true)
    public int obtenerEntero(String clave, int valorPorDefecto) {
        return configuracionSistemaRepository.findByClave(clave)
                .map(config -> {
                    try {
                        return Integer.parseInt(config.getValor());
                    } catch (NumberFormatException e) {
                        log.warn("Configuración '{}' tiene un valor no numérico ('{}'), usando default={}",
                                clave, config.getValor(), valorPorDefecto);
                        return valorPorDefecto;
                    }
                })
                .orElse(valorPorDefecto);
    }
}
