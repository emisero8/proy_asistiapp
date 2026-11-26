package com.asistiapp.backend.repositories;

import com.asistiapp.backend.models.entities.LogAuditoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LogAuditoriaRepository extends JpaRepository<LogAuditoria, Long>,
        JpaSpecificationExecutor<LogAuditoria> {

    List<LogAuditoria> findByIdEmisorOrderByFechaHoraDesc(Long idEmisor);

    List<LogAuditoria> findByEntidadAfectadaAndIdEntidadAfectadaOrderByFechaHoraDesc(
            String entidadAfectada, Long idEntidadAfectada);
}
