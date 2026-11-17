package com.asistiapp.backend.repositories;

import com.asistiapp.backend.models.entities.IntentoVinculacionMp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface IntentoVinculacionMpRepository extends JpaRepository<IntentoVinculacionMp, String> {

    void deleteByIdOrganizador(Long idOrganizador);

    void deleteByCreadoEnBefore(LocalDateTime fecha);
}
