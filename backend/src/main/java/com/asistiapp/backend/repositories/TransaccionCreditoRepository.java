package com.asistiapp.backend.repositories;

import com.asistiapp.backend.models.entities.TransaccionCredito;
import com.asistiapp.backend.models.enums.EstadoTransaccion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TransaccionCreditoRepository extends JpaRepository<TransaccionCredito, Long> {

    boolean existsByIdOrganizadorAndEstado(Long idOrganizador, EstadoTransaccion estado);

    void deleteByIdOrganizador(Long idOrganizador);
}
