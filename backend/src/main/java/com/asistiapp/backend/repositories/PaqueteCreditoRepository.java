package com.asistiapp.backend.repositories;

import com.asistiapp.backend.models.entities.PaqueteCredito;
import com.asistiapp.backend.models.enums.EstadoPaquete;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaqueteCreditoRepository extends JpaRepository<PaqueteCredito, Long> {

    /** Solo los paquetes activos son visibles para los Organizadores. */
    List<PaqueteCredito> findByEstado(EstadoPaquete estado);
}
