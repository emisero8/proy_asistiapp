package com.asistiapp.backend.repositories;

import com.asistiapp.backend.models.entities.TransaccionCredito;
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
public interface TransaccionCreditoRepository extends JpaRepository<TransaccionCredito, Long> {

    boolean existsByIdOrganizadorAndEstado(Long idOrganizador, EstadoTransaccion estado);

    Optional<TransaccionCredito> findByExternalReference(String externalReference);

    boolean existsByExternalReference(String externalReference);

    /** Para el job de vencimiento: órdenes abandonadas (nunca se pagaron ni se avisó nada). */
    List<TransaccionCredito> findByEstadoAndFechaVencimientoBefore(EstadoTransaccion estado, LocalDateTime antes);

    /** Historial de compras del Organizador (CU-019): todas sus órdenes, en cualquier estado. */
    List<TransaccionCredito> findByIdOrganizadorOrderByFechaTransaccionDesc(Long idOrganizador);

    /** Con bloqueo pesimista de la fila: ver TransaccionPagoRepository. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM TransaccionCredito t WHERE t.externalReference = :ref")
    Optional<TransaccionCredito> findByExternalReferenceForUpdate(@Param("ref") String externalReference);

    void deleteByIdOrganizador(Long idOrganizador);
}
