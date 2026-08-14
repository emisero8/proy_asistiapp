package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.models.entities.MovimientoCredito;
import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.models.enums.TipoMovimiento;
import com.asistiapp.backend.repositories.MovimientoCreditoRepository;
import com.asistiapp.backend.repositories.OrganizadorRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * CreditoLedgerService es el ÚNICO punto de mutación de saldo_creditos
 * (AuthService, EventoService y CreditoService pasan todos por acá) —
 * si esto tiene un bug, el saldo de TODOS los organizadores queda mal.
 */
@ExtendWith(MockitoExtension.class)
class CreditoLedgerServiceTest {

    @Mock
    private OrganizadorRepository organizadorRepository;
    @Mock
    private MovimientoCreditoRepository movimientoCreditoRepository;

    @InjectMocks
    private CreditoLedgerService creditoLedgerService;

    private Organizador organizador;

    @BeforeEach
    void setUp() {
        organizador = new Organizador();
        organizador.setId(1L);
        organizador.setSaldoCreditos(10);
        // lenient: el test de saldo insuficiente corta antes de llegar a guardar nada
        lenient().when(movimientoCreditoRepository.save(any(MovimientoCredito.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void registrarBienvenida_sumaSaldoYRegistraMovimientoPositivo() {
        MovimientoCredito movimiento = creditoLedgerService.registrarBienvenida(organizador, 5);

        assertThat(organizador.getSaldoCreditos()).isEqualTo(15);
        assertThat(movimiento.getTipoMovimiento()).isEqualTo(TipoMovimiento.Bienvenida);
        assertThat(movimiento.getMonto()).isEqualTo(5);
        assertThat(movimiento.getSaldoResultante()).isEqualTo(15);
        assertThat(movimiento.getIdTransaccionCredito()).isNull();
        assertThat(movimiento.getIdEvento()).isNull();
        verify(organizadorRepository).save(organizador);
    }

    @Test
    void registrarRecarga_sumaSaldoYVinculaLaTransaccion() {
        MovimientoCredito movimiento = creditoLedgerService.registrarRecarga(organizador, 20, 777L);

        assertThat(organizador.getSaldoCreditos()).isEqualTo(30);
        assertThat(movimiento.getTipoMovimiento()).isEqualTo(TipoMovimiento.Recarga);
        assertThat(movimiento.getMonto()).isEqualTo(20);
        assertThat(movimiento.getIdTransaccionCredito()).isEqualTo(777L);
    }

    @Test
    void registrarConsumoPublicacion_restaSaldoYVinculaElEvento() {
        MovimientoCredito movimiento = creditoLedgerService.registrarConsumoPublicacion(organizador, 3, 555L);

        assertThat(organizador.getSaldoCreditos()).isEqualTo(7);
        assertThat(movimiento.getTipoMovimiento()).isEqualTo(TipoMovimiento.Consumo_Publicacion);
        assertThat(movimiento.getMonto()).isEqualTo(-3); // signado: negativo en consumo
        assertThat(movimiento.getSaldoResultante()).isEqualTo(7);
        assertThat(movimiento.getIdEvento()).isEqualTo(555L);
    }

    @Test
    void registrarConsumoPublicacion_saldoInsuficiente_lanzaBusinessRuleExceptionYNoMutaNada() {
        organizador.setSaldoCreditos(2);

        assertThatThrownBy(() -> creditoLedgerService.registrarConsumoPublicacion(organizador, 3, 555L))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("insuficiente");

        // El saldo NO debe quedar en negativo ni haberse persistido nada
        assertThat(organizador.getSaldoCreditos()).isEqualTo(2);
        verifyNoInteractions(organizadorRepository);
        verifyNoInteractions(movimientoCreditoRepository);
    }

    @Test
    void registrarConsumoPublicacion_saldoExactoEnCero_esPermitido() {
        organizador.setSaldoCreditos(3);

        MovimientoCredito movimiento = creditoLedgerService.registrarConsumoPublicacion(organizador, 3, 555L);

        assertThat(organizador.getSaldoCreditos()).isZero();
        assertThat(movimiento.getSaldoResultante()).isZero();
    }
}
