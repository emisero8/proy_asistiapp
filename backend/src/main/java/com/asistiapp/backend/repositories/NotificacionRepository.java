package com.asistiapp.backend.repositories;

import com.asistiapp.backend.models.entities.Notificacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificacionRepository extends JpaRepository<Notificacion, Long> {

    List<Notificacion> findByIdUsuarioDestinoOrderByFechaCreacionDesc(Long idUsuarioDestino);

    List<Notificacion> findByIdUsuarioDestinoAndLeidaFalse(Long idUsuarioDestino);

    long countByIdUsuarioDestinoAndLeidaFalse(Long idUsuarioDestino);

    void deleteByIdUsuarioDestino(Long idUsuarioDestino);
}
