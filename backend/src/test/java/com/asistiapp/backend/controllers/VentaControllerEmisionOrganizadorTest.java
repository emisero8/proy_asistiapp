package com.asistiapp.backend.controllers;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.models.dtos.entrada.EmisionOrganizadorRequestDTO;
import com.asistiapp.backend.models.dtos.entrada.EntradaResponseDTO;
import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.models.enums.TipoEmision;
import com.asistiapp.backend.security.SecurityUtils;
import com.asistiapp.backend.services.EmailService;
import com.asistiapp.backend.services.PagoWebhookService;
import com.asistiapp.backend.services.VentaService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Emisión de entradas del Organizador: el mail al destinatario es opcional (a veces el Organizador
 * entrega el QR por WhatsApp). La emisión ya está confirmada cuando se manda, así que un problema
 * con el mail no puede hacerla fallar: el Organizador reintentaría y se duplicaría.
 */
@ExtendWith(MockitoExtension.class)
class VentaControllerEmisionOrganizadorTest {

    private static final long ID_ORGANIZADOR = 100L;

    @Mock
    private VentaService ventaService;
    @Mock
    private SecurityUtils securityUtils;
    @Mock
    private PagoWebhookService pagoWebhookService;
    @Mock
    private EmailService emailService;

    private VentaController controller;

    @BeforeEach
    void setUp() {
        controller = new VentaController(ventaService, securityUtils, pagoWebhookService, emailService);
    }

    private EmisionOrganizadorRequestDTO pedido(boolean enviarMail) {
        EmisionOrganizadorRequestDTO dto = new EmisionOrganizadorRequestDTO();
        dto.setIdTanda(4L);
        dto.setCantidad(2);
        dto.setTipo(TipoEmision.Cortesia);
        dto.setNombreDestinatario("Ana Invitada");
        dto.setEmailDestinatario("ana@mail.com");
        dto.setEnviarMail(enviarMail);
        return dto;
    }

    private EntradaResponseDTO entrada(long id, String codigoQr) {
        return EntradaResponseDTO.builder()
                .id(id)
                .nombreEvento("Festival de Prueba")
                .nombreTanda("General")
                .codigoQr(codigoQr)
                .build();
    }

    private void organizadorAutenticado() {
        Organizador organizador = mock(Organizador.class);
        when(organizador.getId()).thenReturn(ID_ORGANIZADOR);
        when(securityUtils.getOrganizadorAutenticado()).thenReturn(organizador);
    }

    @Test
    void emitir_conEnviarMail_mandaUnSoloMailConTodosLosQr() {
        organizadorAutenticado();
        EmisionOrganizadorRequestDTO dto = pedido(true);
        List<EntradaResponseDTO> generadas = List.of(entrada(1, "QR-AAA"), entrada(2, "QR-BBB"));
        when(ventaService.emitirEntradasOrganizador(dto, ID_ORGANIZADOR)).thenReturn(generadas);

        ResponseEntity<List<EntradaResponseDTO>> respuesta = controller.emitirEntradasOrganizador(dto);

        assertThat(respuesta.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(respuesta.getBody()).isEqualTo(generadas);
        verify(emailService).enviarConfirmacionCompra(
                "ana@mail.com", "Ana Invitada", "Festival de Prueba", "General", List.of("QR-AAA", "QR-BBB"));
    }

    @Test
    void emitir_sinEnviarMail_noMandaNingunMail() {
        organizadorAutenticado();
        EmisionOrganizadorRequestDTO dto = pedido(false);
        when(ventaService.emitirEntradasOrganizador(dto, ID_ORGANIZADOR)).thenReturn(List.of(entrada(1, "QR-AAA")));

        ResponseEntity<List<EntradaResponseDTO>> respuesta = controller.emitirEntradasOrganizador(dto);

        assertThat(respuesta.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        verifyNoInteractions(emailService);
    }

    @Test
    void emitir_siElMailFalla_laEmisionIgualSeConfirma() {
        organizadorAutenticado();
        EmisionOrganizadorRequestDTO dto = pedido(true);
        List<EntradaResponseDTO> generadas = List.of(entrada(1, "QR-AAA"));
        when(ventaService.emitirEntradasOrganizador(dto, ID_ORGANIZADOR)).thenReturn(generadas);
        doThrow(new IllegalStateException("cola de mails llena"))
                .when(emailService).enviarConfirmacionCompra(anyString(), anyString(), anyString(), anyString(), anyList());

        ResponseEntity<List<EntradaResponseDTO>> respuesta = controller.emitirEntradasOrganizador(dto);

        assertThat(respuesta.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(respuesta.getBody()).isEqualTo(generadas);
    }

    @Test
    void emitir_siLaEmisionFalla_noSeMandaNingunMail() {
        organizadorAutenticado();
        when(ventaService.emitirEntradasOrganizador(any(), anyLong()))
                .thenThrow(new BusinessRuleException("Solo quedan 1 entradas en la tanda"));

        assertThatThrownBy(() -> controller.emitirEntradasOrganizador(pedido(true)))
                .isInstanceOf(BusinessRuleException.class);

        verifyNoInteractions(emailService);
    }
}
