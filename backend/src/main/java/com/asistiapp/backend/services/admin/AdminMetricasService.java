package com.asistiapp.backend.services.admin;

import com.asistiapp.backend.models.dtos.metricas.AdminMetricasResponseDTO;
import com.asistiapp.backend.models.enums.EstadoEvento;
import com.asistiapp.backend.models.enums.EstadoUsuario;
import com.asistiapp.backend.models.enums.RolUsuario;
import com.asistiapp.backend.repositories.EntradaRepository;
import com.asistiapp.backend.repositories.EventoRepository;
import com.asistiapp.backend.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** KPIs globales del sistema para el dashboard del Administrador (CU-027). */
@Service
@RequiredArgsConstructor
public class AdminMetricasService {

    private final EventoRepository eventoRepository;
    private final EntradaRepository entradaRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional(readOnly = true)
    public AdminMetricasResponseDTO obtenerMetricasGlobales() {
        long eventosActivos = eventoRepository.findByEstado(EstadoEvento.Publicado).size();
        long eventosTotales = eventoRepository.count();
        long entradasVendidas = entradaRepository.count();
        double ingresosTotales = entradaRepository.sumaIngresosTotales();
        long organizadoresActivos = usuarioRepository.findByRol(RolUsuario.Organizador).stream()
                .filter(u -> u.getEstado() == EstadoUsuario.Activo)
                .count();

        return AdminMetricasResponseDTO.builder()
                .eventosActivos(eventosActivos)
                .eventosTotales(eventosTotales)
                .entradasVendidas(entradasVendidas)
                .ingresosTotales(ingresosTotales)
                .organizadoresActivos(organizadoresActivos)
                .build();
    }
}
