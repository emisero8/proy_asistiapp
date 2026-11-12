package com.asistiapp.backend.repositories;

import com.asistiapp.backend.models.entities.TransaccionPago;
import com.asistiapp.backend.models.enums.EstadoTransaccion;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public interface TransaccionPagoRepository extends JpaRepository<TransaccionPago, Long> {

    Optional<TransaccionPago> findByExternalReference(String externalReference);

    boolean existsByExternalReference(String externalReference);

    /** Para el job de vencimiento: órdenes abandonadas (nunca se pagaron ni se avisó nada). */
    List<TransaccionPago> findByEstadoAndFechaVencimientoBefore(EstadoTransaccion estado, LocalDateTime antes);

    /**
     * Órdenes de entradas de este evento que siguen abiertas: `Pendiente` y todavía dentro de su
     * ventana de pago. Un comprador puede estar en la pantalla de MercadoPago pagándolas ahora mismo.
     */
    @Query("SELECT COUNT(t) FROM TransaccionPago t WHERE t.estado = :estado AND t.fechaVencimiento > :ahora "
            + "AND t.idTanda IN (SELECT ta.id FROM Tanda ta WHERE ta.evento.id = :eventoId)")
    long countOrdenesAbiertasDelEvento(@Param("eventoId") Long eventoId,
                                       @Param("estado") EstadoTransaccion estado,
                                       @Param("ahora") LocalDateTime ahora);

    /**
     * Con bloqueo pesimista de la fila: dos notificaciones simultáneas del mismo pago
     * (MercadoPago reintenta) se serializan, y la segunda ve la orden ya resuelta.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM TransaccionPago t WHERE t.externalReference = :ref")
    Optional<TransaccionPago> findByExternalReferenceForUpdate(@Param("ref") String externalReference);
}
