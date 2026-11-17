package com.asistiapp.backend.repositories;

import com.asistiapp.backend.models.entities.CuentaMercadoPago;
import com.asistiapp.backend.models.enums.EstadoCuentaMp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CuentaMercadoPagoRepository extends JpaRepository<CuentaMercadoPago, Long> {

    Optional<CuentaMercadoPago> findByIdOrganizador(Long idOrganizador);

    /** Cuentas cuyo token vence antes de la fecha dada: son las que hay que renovar. */
    List<CuentaMercadoPago> findByEstadoAndExpiraEnBefore(EstadoCuentaMp estado, LocalDateTime fecha);
}
