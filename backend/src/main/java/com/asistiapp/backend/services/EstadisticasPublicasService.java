package com.asistiapp.backend.services;

import com.asistiapp.backend.models.dtos.publico.EstadisticasPublicasResponseDTO;
import com.asistiapp.backend.models.enums.EstadoEvento;
import com.asistiapp.backend.models.enums.EstadoUsuario;
import com.asistiapp.backend.models.enums.RolUsuario;
import com.asistiapp.backend.repositories.EntradaRepository;
import com.asistiapp.backend.repositories.EventoRepository;
import com.asistiapp.backend.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Estadísticas agregadas de la plataforma para la landing pública (sin auth).
 * Mismo origen de datos que AdminMetricasService, pero recortado a lo que
 * es seguro mostrar a un visitante anónimo — nunca ingresos ni datos por usuario.
 */
@Service
@RequiredArgsConstructor
public class EstadisticasPublicasService {

    private final EventoRepository eventoRepository;
    private final EntradaRepository entradaRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional(readOnly = true)
    public EstadisticasPublicasResponseDTO obtenerEstadisticas() {
        long organizadoresActivos = usuarioRepository.findByRol(RolUsuario.Organizador).stream()
                .filter(u -> u.getEstado() == EstadoUsuario.Activo)
                .count();
        long eventosPublicados = eventoRepository.findByEstado(EstadoEvento.Publicado).size();
        long entradasVendidas = entradaRepository.count();

        return EstadisticasPublicasResponseDTO.builder()
                .organizadoresActivos(organizadoresActivos)
                .eventosPublicados(eventosPublicados)
                .entradasVendidas(entradasVendidas)
                .build();
    }
}
