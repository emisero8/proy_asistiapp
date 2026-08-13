package com.asistiapp.backend.repositories;

import com.asistiapp.backend.models.entities.LogAuditoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LogAuditoriaRepository extends JpaRepository<LogAuditoria, Long> {

    List<LogAuditoria> findByIdAdminOrderByFechaHoraDesc(Long idAdmin);

    List<LogAuditoria> findByEntidadAfectadaAndIdEntidadAfectadaOrderByFechaHoraDesc(
            String entidadAfectada, Long idEntidadAfectada);
}
