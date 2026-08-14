package com.asistiapp.backend.repositories;

import com.asistiapp.backend.models.entities.TransaccionCredito;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TransaccionCreditoRepository extends JpaRepository<TransaccionCredito, Long> {
}
