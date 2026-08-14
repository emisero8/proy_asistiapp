package com.asistiapp.backend.repositories;

import com.asistiapp.backend.models.entities.StaffQR;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StaffQRRepository extends JpaRepository<StaffQR, Long> {

    List<StaffQR> findByIdEvento(Long idEvento);

    List<StaffQR> findByIdEventoIn(List<Long> idEventos);

    Optional<StaffQR> findByEmail(String email);
}
