package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.ForbiddenActionException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.dtos.metricas.EventoMetricasResponseDTO;
import com.asistiapp.backend.models.dtos.metricas.ResumenOrganizadorResponseDTO;
import com.asistiapp.backend.models.dtos.metricas.TandaMetricasDTO;
import com.asistiapp.backend.models.entities.Entrada;
import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.entities.MovimientoCredito;
import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.models.enums.EstadoEvento;
import com.asistiapp.backend.models.enums.TipoMovimiento;
import com.asistiapp.backend.models.entities.Tanda;
import com.asistiapp.backend.models.enums.EstadoEntrada;
import com.asistiapp.backend.models.enums.TipoEmision;
import com.asistiapp.backend.repositories.EntradaRepository;
import com.asistiapp.backend.repositories.EventoRepository;
import com.asistiapp.backend.repositories.MovimientoCreditoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
    private final MovimientoCreditoRepository movimientoCreditoRepository;

    /**
     * Resumen del Dashboard del Organizador, calculado en el servidor (una sola llamada en vez de
     * una por evento). Ventas e ingresos salen de los eventos publicados, igual que obtenerMetricas.
     */
    @Transactional(readOnly = true)
    public ResumenOrganizadorResponseDTO obtenerResumen(Organizador organizador) {
        Long idOrganizador = organizador.getId();
        List<Evento> eventos = eventoRepository.findByIdOrganizador(idOrganizador);
        List<Evento> publicados = eventos.stream().filter(e -> e.getEstado() == EstadoEvento.Publicado).toList();

        int entradasVendidas = 0;
        int entradasValidadas = 0;
        double ingresosTotales = 0;
        for (Evento evento : publicados) {
            EventoMetricasResponseDTO m = obtenerMetricas(evento.getId(), idOrganizador);
            entradasVendidas += m.getEntradasVendidas();
            entradasValidadas += m.getEntradasValidadas();
            ingresosTotales += m.getIngresosTotales();
        }

        // Créditos consumidos neto: publicar y las entradas de tandas suman, las devoluciones restan
        int creditosConsumidos = 0;
        for (MovimientoCredito mov : movimientoCreditoRepository.findByIdOrganizadorOrderByFechaMovimientoDesc(idOrganizador)) {
            TipoMovimiento tipo = mov.getTipoMovimiento();
            if (tipo == TipoMovimiento.Consumo_Publicacion || tipo == TipoMovimiento.Consumo_Tanda
                    || tipo == TipoMovimiento.Devolucion_Tanda) {
                creditosConsumidos -= mov.getMonto();
            }
        }

        // Próximo evento publicado que todavía no empezó
        LocalDate hoy = LocalDate.now();
        ResumenOrganizadorResponseDTO.ProximoEvento proximo = publicados.stream()
                .filter(e -> e.getFechaEvento() != null && !e.getFechaEvento().isBefore(hoy) && !e.yaComenzo())
                .min(Comparator.comparing(Evento::getFechaEvento))
                .map(e -> new ResumenOrganizadorResponseDTO.ProximoEvento(e.getId(), e.getNombre(), e.getFechaEvento()))
                .orElse(null);

        return ResumenOrganizadorResponseDTO.builder()
                .eventosPublicados(publicados.size())
                .eventosBorrador((int) eventos.stream().filter(e -> e.getEstado() == EstadoEvento.Borrador).count())
                .entradasVendidas(entradasVendidas)
                .entradasValidadas(entradasValidadas)
                .ingresosTotales(ingresosTotales)
                .creditosConsumidos(creditosConsumidos)
                .saldoCreditos(organizador.getSaldoCreditos())
                .proximoEvento(proximo)
                .build();
    }

    @Transactional(readOnly = true)
    public EventoMetricasResponseDTO obtenerMetricas(Long idEvento, Long idOrganizador) {
        Evento evento = eventoRepository.findById(idEvento)
                .orElseThrow(() -> new ResourceNotFoundException("Evento no encontrado con id: " + idEvento));

        if (!evento.getIdOrganizador().equals(idOrganizador)) {
            throw new ForbiddenActionException("No tenés permiso para ver las métricas de este evento");
        }

        // Las anuladas (8.6) ya no son ventas: ni cuentan ni suman ingresos. Siguen ocupando cupo en la tanda.
        List<Entrada> todas = entradaRepository.findByEventoId(idEvento);
        List<Entrada> entradas = todas.stream().filter(e -> e.getEstado() != EstadoEntrada.Anulada).toList();
        Map<Long, Long> anuladasPorTanda = todas.stream()
                .filter(e -> e.getEstado() == EstadoEntrada.Anulada)
                .collect(Collectors.groupingBy(e -> e.getTanda().getId(), Collectors.counting()));
        int entradasValidadas = (int) entradas.stream()
                .filter(e -> e.getEstado() == EstadoEntrada.Usada)
                .count();

        // Las cortesías ocupan cupo pero no cobraron nada: no suman a los ingresos.
        // (El pago externo sí: se cobró, aunque fuera de la plataforma.)
        // Cada entrada suma el precio con el que salió, no el actual de la tanda.
        Map<Long, Double> ingresosPorTanda = entradas.stream()
                .filter(e -> e.getTipoEmision() != TipoEmision.Cortesia)
                .collect(Collectors.groupingBy(e -> e.getTanda().getId(), Collectors.summingDouble(Entrada::precio)));

        int cupoTotal = 0;
        int cupoDisponible = 0;
        double ingresosTotales = 0;
        List<TandaMetricasDTO> tandasMetricas = evento.getTandas().stream()
                .map(t -> toTandaMetricasDTO(t, ingresosPorTanda.getOrDefault(t.getId(), 0.0),
                        anuladasPorTanda.getOrDefault(t.getId(), 0L).intValue()))
                .toList();

        for (Tanda tanda : evento.getTandas()) {
            cupoTotal += tanda.getCupoMaximo();
            cupoDisponible += tanda.getCupoDisponible();
        }
        for (TandaMetricasDTO t : tandasMetricas) {
            ingresosTotales += t.getIngresos();
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

    private TandaMetricasDTO toTandaMetricasDTO(Tanda tanda, double ingresos, int anuladas) {
        int vendidas = tanda.getCupoMaximo() - tanda.getCupoDisponible() - anuladas;
        return TandaMetricasDTO.builder()
                .idTanda(tanda.getId())
                .nombre(tanda.getNombre())
                .cupoMaximo(tanda.getCupoMaximo())
                .cupoDisponible(tanda.getCupoDisponible())
                .vendidas(vendidas)
                .ingresos(ingresos)
                .build();
    }
}
