package com.asistiapp.backend.repositories;

import com.asistiapp.backend.models.entities.StaffVendedor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StaffVendedorRepository extends JpaRepository<StaffVendedor, Long> {

    List<StaffVendedor> findByIdOrganizador(Long idOrganizador);

    Optional<StaffVendedor> findByEmail(String email);
}

