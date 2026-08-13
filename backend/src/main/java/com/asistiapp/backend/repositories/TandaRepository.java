package com.asistiapp.backend.repositories;

import com.asistiapp.backend.models.entities.Tanda;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TandaRepository extends JpaRepository<Tanda, Long> {

    List<Tanda> findByEventoId(Long eventoId);

    /**
     * Obtiene la Tanda con bloqueo pesimista (PESSIMISTIC_WRITE).
     * OBLIGATORIO usarlo en el servicio de ventas para evitar sobreventa.
     * Bloquea la fila en la BD hasta que termine la transacción.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM Tanda t WHERE t.id = :id")
    Optional<Tanda> findByIdWithLock(@Param("id") Long id);

    /**
     * Decrementa el cupo disponible de forma atómica.
     * Solo ejecuta si cupo_disponible > 0 (previene negativos).
     * Retorna el número de filas afectadas (0 = cupo agotado).
     */
    @Modifying
    @Query("UPDATE Tanda t SET t.cupoDisponible = t.cupoDisponible - 1 " +
           "WHERE t.id = :id AND t.cupoDisponible > 0")
    int decrementarCupo(@Param("id") Long id);
}
