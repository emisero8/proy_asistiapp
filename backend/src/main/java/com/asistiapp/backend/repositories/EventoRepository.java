package com.asistiapp.backend.repositories;

import com.asistiapp.backend.models.entities.Evento;
import com.asistiapp.backend.models.enums.EstadoEvento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EventoRepository extends JpaRepository<Evento, Long> {

    List<Evento> findByIdOrganizador(Long idOrganizador);

    List<Evento> findByEstado(EstadoEvento estado);

    List<Evento> findByIdOrganizadorAndEstado(Long idOrganizador, EstadoEvento estado);

    Optional<Evento> findByUrlPublica(String urlPublica);
}
