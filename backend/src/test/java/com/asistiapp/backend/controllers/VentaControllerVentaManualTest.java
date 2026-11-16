package com.asistiapp.backend.controllers;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.models.dtos.entrada.EntradaResponseDTO;
import com.asistiapp.backend.models.dtos.entrada.VentaManualRequestDTO;
import com.asistiapp.backend.models.entities.StaffVendedor;
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
 * Venta manual del POS (CU-019): después de confirmada la venta, el comprador recibe en el
 * mail que dio sus entradas con el QR — el mismo mail que le llega en la compra online.
 * La venta ya está confirmada cuando se manda, así que un problema con el mail no puede
 * hacerla fallar: el vendedor reintentaría y se duplicaría.
 */
@ExtendWith(MockitoExtension.class)
class VentaControllerVentaManualTest {

    private static final long ID_STAFF = 9L;

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

    private VentaManualRequestDTO pedido(int cantidad) {
        VentaManualRequestDTO dto = new VentaManualRequestDTO();
        dto.setIdTanda(4L);
        dto.setCantidad(cantidad);
        dto.setNombreComprador("Ana Compradora");
        dto.setEmailComprador("ana@mail.com");
        return dto;
    }

    private EntradaResponseDTO entrada(long id, String codigoQr) {
        return EntradaResponseDTO.builder()
                .id(id)
                .nombreEvento("Festival de Prueba")
                .nombreTanda("General")
                .codigoQr(codigoQr)
                .nombreComprador("Ana Compradora")
                .emailComprador("ana@mail.com")
                .build();
    }

    private void staffAutenticado() {
        StaffVendedor staff = mock(StaffVendedor.class);
        when(staff.getId()).thenReturn(ID_STAFF);
        when(securityUtils.getStaffVendedorAutenticado()).thenReturn(staff);
    }

    @Test
    void ventaManual_mandaUnSoloMailConTodosLosQrAlComprador() {
        staffAutenticado();
        VentaManualRequestDTO dto = pedido(2);
        List<EntradaResponseDTO> generadas = List.of(entrada(10, "QR-AAA"), entrada(11, "QR-BBB"));
        when(ventaService.realizarVentaManual(dto, ID_STAFF)).thenReturn(generadas);

        ResponseEntity<List<EntradaResponseDTO>> respuesta = controller.ventaManual(dto);

        assertThat(respuesta.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(respuesta.getBody()).isEqualTo(generadas);
        verify(emailService).enviarConfirmacionCompra(
                "ana@mail.com", "Ana Compradora", "Festival de Prueba", "General", List.of("QR-AAA", "QR-BBB"));
    }

    @Test
    void ventaManual_siElMailFalla_laVentaIgualSeConfirma() {
        staffAutenticado();
        VentaManualRequestDTO dto = pedido(1);
        List<EntradaResponseDTO> generadas = List.of(entrada(10, "QR-AAA"));
        when(ventaService.realizarVentaManual(dto, ID_STAFF)).thenReturn(generadas);
        doThrow(new IllegalStateException("cola de mails llena"))
                .when(emailService).enviarConfirmacionCompra(anyString(), anyString(), anyString(), anyString(), anyList());

        ResponseEntity<List<EntradaResponseDTO>> respuesta = controller.ventaManual(dto);

        assertThat(respuesta.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(respuesta.getBody()).isEqualTo(generadas);
    }

    @Test
    void ventaManual_siLaVentaFalla_noSeMandaNingunMail() {
        staffAutenticado();
        VentaManualRequestDTO dto = pedido(1);
        when(ventaService.realizarVentaManual(any(), anyLong()))
                .thenThrow(new BusinessRuleException("Tanda agotada — no hay cupo disponible"));

        assertThatThrownBy(() -> controller.ventaManual(dto)).isInstanceOf(BusinessRuleException.class);

        verifyNoInteractions(emailService);
    }
}
