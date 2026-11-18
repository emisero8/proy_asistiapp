package com.asistiapp.backend.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.asistiapp.backend.models.dtos.auth.RegisterRequestDTO;
import com.asistiapp.backend.models.dtos.entrada.CompraOnlineRequestDTO;
import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.models.entities.TerminosLegales;
import com.asistiapp.backend.repositories.OrganizadorRepository;
import com.asistiapp.backend.repositories.UsuarioRepository;
import com.asistiapp.backend.security.JwtUtils;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

/** 8.7: sin aceptar los términos y la política de privacidad no se registra un Organizador ni se compra. */
class AceptacionTerminosTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private RegisterRequestDTO registro(Boolean acepta) {
        RegisterRequestDTO d = new RegisterRequestDTO();
        d.setNombre("Ana");
        d.setEmail("ana@test.com");
        d.setPassword("12345678");
        d.setAceptaTerminos(acepta);
        return d;
    }

    private CompraOnlineRequestDTO compra(Boolean acepta) {
        CompraOnlineRequestDTO d = new CompraOnlineRequestDTO();
        d.setIdTanda(1L);
        d.setCantidad(1);
        d.setNombreComprador("Beto");
        d.setEmailComprador("beto@test.com");
        d.setAceptaTerminos(acepta);
        return d;
    }

    @Test
    void elRegistroSinAceptarLosTerminosEsInvalido() {
        assertThat(validator.validate(registro(null))).hasSize(1);
        assertThat(validator.validate(registro(false))).hasSize(1);
        assertThat(validator.validate(registro(true))).isEmpty();
    }

    @Test
    void laCompraSinAceptarLosTerminosEsInvalida() {
        assertThat(validator.validate(compra(null))).hasSize(1);
        assertThat(validator.validate(compra(false))).hasSize(1);
        assertThat(validator.validate(compra(true))).isEmpty();
    }

    @Test
    void alRegistrarseQuedaGuardadoCuandoYConQueVersionAcepto() {
        UsuarioRepository usuarios = mock(UsuarioRepository.class);
        OrganizadorRepository organizadores = mock(OrganizadorRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        ConfiguracionService config = mock(ConfiguracionService.class);
        JwtUtils jwt = mock(JwtUtils.class);
        when(encoder.encode(any())).thenReturn("hash");
        when(organizadores.save(any(Organizador.class))).thenAnswer(i -> i.getArgument(0));
        when(config.obtenerEntero(any(), Mockito.anyInt())).thenReturn(5);
        AuthService service = new AuthService(usuarios, organizadores, encoder, mock(AuthenticationManager.class),
                jwt, mock(CreditoLedgerService.class), config);

        service.register(registro(true));

        ArgumentCaptor<Organizador> guardado = ArgumentCaptor.forClass(Organizador.class);
        Mockito.verify(organizadores).save(guardado.capture());
        assertThat(guardado.getValue().getTerminosVersion()).isEqualTo(TerminosLegales.VERSION);
        assertThat(guardado.getValue().getTerminosAceptadosEn()).isNotNull();
    }
}
