package com.asistiapp.backend.repositories;

import com.asistiapp.backend.models.entities.Entrada;
import com.asistiapp.backend.models.enums.EstadoEntrada;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EntradaRepository extends JpaRepository<Entrada, Long> {

    /** Búsqueda por código QR. Usada en validación (CU-018). */
    Optional<Entrada> findByCodigoQr(String codigoQr);

    boolean existsByCodigoQr(String codigoQr);

    List<Entrada> findByEstado(EstadoEntrada estado);

    /** Todas las entradas de una tanda específica. */
    List<Entrada> findByTandaId(Long tandaId);

    /**
     * Todas las entradas de un evento (navegando por la relación Tanda → Evento).
     * Útil para reportes del Organizador.
     */
    @Query("SELECT e FROM Entrada e WHERE e.tanda.evento.id = :eventoId")
    List<Entrada> findByEventoId(@Param("eventoId") Long eventoId);

    /** Cantidad de entradas vendidas para un evento. */
    @Query("SELECT COUNT(e) FROM Entrada e WHERE e.tanda.evento.id = :eventoId")
    long countByEventoId(@Param("eventoId") Long eventoId);

    /** Suma de ingresos de TODAS las entradas del sistema (métricas globales del Admin, CU-027). */
    @Query("SELECT COALESCE(SUM(e.tanda.precio), 0) FROM Entrada e")
    Double sumaIngresosTotales();
}
