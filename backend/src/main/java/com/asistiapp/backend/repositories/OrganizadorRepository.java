package com.asistiapp.backend.repositories;

import com.asistiapp.backend.models.entities.Organizador;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OrganizadorRepository extends JpaRepository<Organizador, Long> {

    Optional<Organizador> findByEmail(String email);
}
