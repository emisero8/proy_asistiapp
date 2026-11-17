package com.asistiapp.backend.services;

import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.repositories.OrganizadorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cuántas entradas puede tener una misma persona (mismo mail) para un evento.
 * Cada Organizador puede fijar su propio tope (8.9); si no lo hizo, vale el de la
 * plataforma, que el Admin configura con la clave "max_entradas_por_comprador".
 */
@Service
@RequiredArgsConstructor
public class LimiteCompradorService {

    public static final String CLAVE_MAX_ENTRADAS_POR_COMPRADOR = "max_entradas_por_comprador";
    public static final int MAX_ENTRADAS_POR_COMPRADOR_DEFAULT = 6;

    private final ConfiguracionService configuracionService;
    private final OrganizadorRepository organizadorRepository;

    /** El valor de la plataforma, que rige para los Organizadores que no fijaron el suyo. */
    @Transactional(readOnly = true)
    public int limiteGlobal() {
        return configuracionService.obtenerEntero(CLAVE_MAX_ENTRADAS_POR_COMPRADOR, MAX_ENTRADAS_POR_COMPRADOR_DEFAULT);
    }

    /** El tope que rige para los eventos de este Organizador. */
    @Transactional(readOnly = true)
    public int limiteParaOrganizador(Long idOrganizador) {
        if (idOrganizador == null) {
            return limiteGlobal();
        }
        return organizadorRepository.findById(idOrganizador)
                .map(Organizador::getMaxEntradasPorComprador)
                .orElseGet(this::limiteGlobal);
    }
}
