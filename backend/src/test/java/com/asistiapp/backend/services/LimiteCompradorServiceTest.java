package com.asistiapp.backend.services;

import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.repositories.OrganizadorRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** 8.9 — el tope de entradas por comprador es del Organizador; si no fijó uno, vale el de la plataforma. */
@ExtendWith(MockitoExtension.class)
class LimiteCompradorServiceTest {

    @Mock
    private ConfiguracionService configuracionService;
    @Mock
    private OrganizadorRepository organizadorRepository;
    @InjectMocks
    private LimiteCompradorService service;

    @BeforeEach
    void setUp() {
        lenient().when(configuracionService.obtenerEntero(eq("max_entradas_por_comprador"), anyInt())).thenReturn(6);
    }

    private Organizador organizador(Integer tope) {
        Organizador o = new Organizador();
        o.setId(3L);
        o.setMaxEntradasPorComprador(tope);
        return o;
    }

    @Test
    void organizadorConTopepropio_usaEseTope() {
        when(organizadorRepository.findById(3L)).thenReturn(Optional.of(organizador(2)));

        assertThat(service.limiteParaOrganizador(3L)).isEqualTo(2);
    }

    @Test
    void organizadorSinTopePropio_usaElDeLaPlataforma() {
        when(organizadorRepository.findById(3L)).thenReturn(Optional.of(organizador(null)));

        assertThat(service.limiteParaOrganizador(3L)).isEqualTo(6);
    }

    @Test
    void organizadorInexistente_usaElDeLaPlataforma() {
        when(organizadorRepository.findById(3L)).thenReturn(Optional.empty());

        assertThat(service.limiteParaOrganizador(3L)).isEqualTo(6);
    }

    @Test
    void sinOrganizador_usaElDeLaPlataformaSinConsultarNada() {
        assertThat(service.limiteParaOrganizador(null)).isEqualTo(6);
        verifyNoInteractions(organizadorRepository);
    }

    @Test
    void elDeLaPlataformaCambiaDesdeElAdmin_sePropaga() {
        when(configuracionService.obtenerEntero(eq("max_entradas_por_comprador"), anyInt())).thenReturn(10);

        assertThat(service.limiteGlobal()).isEqualTo(10);
    }
}
