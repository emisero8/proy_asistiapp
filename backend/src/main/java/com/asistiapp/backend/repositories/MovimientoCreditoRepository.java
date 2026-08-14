package com.asistiapp.backend.repositories;

import com.asistiapp.backend.models.entities.MovimientoCredito;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MovimientoCreditoRepository extends JpaRepository<MovimientoCredito, Long> {

    List<MovimientoCredito> findByIdOrganizadorOrderByFechaMovimientoDesc(Long idOrganizador);
}
