package com.asistiapp.backend.repositories;

import com.asistiapp.backend.models.entities.TransaccionPago;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public interface TransaccionPagoRepository extends JpaRepository<TransaccionPago, Long> {

    Optional<TransaccionPago> findByExternalReference(String externalReference);

    boolean existsByExternalReference(String externalReference);

    /**
     * Con bloqueo pesimista de la fila: dos notificaciones simultáneas del mismo pago
     * (MercadoPago reintenta) se serializan, y la segunda ve la orden ya resuelta.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM TransaccionPago t WHERE t.externalReference = :ref")
    Optional<TransaccionPago> findByExternalReferenceForUpdate(@Param("ref") String externalReference);
}
