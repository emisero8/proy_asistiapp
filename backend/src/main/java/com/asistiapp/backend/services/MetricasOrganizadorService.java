package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.ForbiddenActionException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.dtos.metricas.EventoMetricasResponseDTO;
import com.asistiapp.backend.models.dtos.metricas.TandaMetricasDTO;
import com.asistiapp.backend.models.entities.Entrada;
import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.entities.Tanda;
import com.asistiapp.backend.models.enums.EstadoEntrada;
import com.asistiapp.backend.repositories.EntradaRepository;
import com.asistiapp.backend.repositories.EventoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Dashboard en tiempo real del Organizador para un evento propio (CU-012).
 * Se calcula sobre datos ya existentes — cupo_disponible de cada Tanda ya
 * refleja las ventas confirmadas, así que no hace falta ninguna tabla nueva.
 */
@Service
@RequiredArgsConstructor
public class MetricasOrganizadorService {

    private final EventoRepository eventoRepository;
    private final EntradaRepository entradaRepository;

    @Transactional(readOnly = true)
    public EventoMetricasResponseDTO obtenerMetricas(Long idEvento, Long idOrganizador) {
        Evento evento = eventoRepository.findById(idEvento)
                .orElseThrow(() -> new ResourceNotFoundException("Evento no encontrado con id: " + idEvento));

        if (!evento.getIdOrganizador().equals(idOrganizador)) {
            throw new ForbiddenActionException("No tenés permiso para ver las métricas de este evento");
        }

        List<Entrada> entradas = entradaRepository.findByEventoId(idEvento);
        int entradasValidadas = (int) entradas.stream()
                .filter(e -> e.getEstado() == EstadoEntrada.Usada)
                .count();

        int cupoTotal = 0;
        int cupoDisponible = 0;
        double ingresosTotales = 0;
        List<TandaMetricasDTO> tandasMetricas = evento.getTandas().stream()
                .map(this::toTandaMetricasDTO)
                .toList();

        for (Tanda tanda : evento.getTandas()) {
            cupoTotal += tanda.getCupoMaximo();
            cupoDisponible += tanda.getCupoDisponible();
            int vendidasTanda = tanda.getCupoMaximo() - tanda.getCupoDisponible();
            ingresosTotales += vendidasTanda * tanda.getPrecio();
        }

        return EventoMetricasResponseDTO.builder()
                .idEvento(evento.getId())
                .nombreEvento(evento.getNombre())
                .entradasVendidas(entradas.size())
                .entradasValidadas(entradasValidadas)
                .ingresosTotales(ingresosTotales)
                .cupoTotal(cupoTotal)
                .cupoDisponible(cupoDisponible)
                .tandas(tandasMetricas)
                .build();
    }

    private TandaMetricasDTO toTandaMetricasDTO(Tanda tanda) {
        int vendidas = tanda.getCupoMaximo() - tanda.getCupoDisponible();
        return TandaMetricasDTO.builder()
                .idTanda(tanda.getId())
                .nombre(tanda.getNombre())
                .cupoMaximo(tanda.getCupoMaximo())
                .cupoDisponible(tanda.getCupoDisponible())
                .vendidas(vendidas)
                .ingresos(vendidas * tanda.getPrecio())
                .build();
    }
}
