package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.ForbiddenActionException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.dtos.validacion.ValidacionQRRequestDTO;
import com.asistiapp.backend.models.dtos.validacion.ValidacionQRResponseDTO;
import com.asistiapp.backend.models.entities.Entrada;
import com.asistiapp.backend.models.entities.StaffQR;
import com.asistiapp.backend.models.enums.EstadoEntrada;
import com.asistiapp.backend.repositories.EntradaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Servicio de validación de entradas QR en puerta (CU-018).
 *
 * ═══════════════════════════════════════════════════
 * REGLAS DE NEGOCIO CRÍTICAS (CU-018):
 * ═══════════════════════════════════════════════════
 *  1. El código QR debe existir en la BD.
 *  2. El evento de la entrada debe coincidir con el evento
 *     asignado al StaffQR que realiza la validación.
 *     → Previene que un staff de un evento valide entradas de otro evento.
 *  3. La entrada NO debe estar en estado "Usada".
 *     → Previene el ingreso duplicado con el mismo QR.
 *  4. Si todo es válido:
 *     - Cambiar estado a "Usada".
 *     - Registrar fecha_uso (timestamp actual).
 *     - Registrar id_staff_qr_validador.
 *     - Todo bajo @Transactional para garantizar atomicidad.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StaffQRService {

    private final EntradaRepository entradaRepository;

    /**
     * Valida un código QR y marca la entrada como Usada si es válida.
     *
     * @param dto         código QR escaneado por el staff
     * @param staffQR     el StaffQR autenticado (con su idEvento asignado)
     * @return resultado de la validación con datos del comprador
     */
    @Transactional
    public ValidacionQRResponseDTO validarQR(ValidacionQRRequestDTO dto, StaffQR staffQR) {
        // ── Paso 1: Buscar la entrada por código QR ──────────────────────
        Entrada entrada = entradaRepository.findByCodigoQr(dto.getCodigoQr())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No se encontró ninguna entrada con el código QR: " + dto.getCodigoQr()));

        String nombreEvento = entrada.getTanda().getEvento().getNombre();
        String nombreTanda  = entrada.getTanda().getNombre();

        // ── Paso 2: Verificar que la entrada corresponde al evento del Staff ──
        Long idEventoEntrada = entrada.getTanda().getEvento().getId();
        if (!idEventoEntrada.equals(staffQR.getIdEvento())) {
            log.warn("Intento de validación de QR de otro evento. Staff={}, eventoStaff={}, eventoEntrada={}",
                    staffQR.getId(), staffQR.getIdEvento(), idEventoEntrada);
            throw new ForbiddenActionException(
                    "Esta entrada pertenece a un evento diferente al que tenés asignado");
        }

        // ── Paso 3: Verificar que la entrada NO esté ya Usada ────────────
        if (entrada.getEstado() == EstadoEntrada.Usada) {
            log.warn("Intento de re-uso de entrada ya utilizada. QR={}, entrada={}",
                    dto.getCodigoQr(), entrada.getId());
            return ValidacionQRResponseDTO.builder()
                    .valido(false)
                    .mensaje("❌ ENTRADA YA UTILIZADA — Esta entrada fue usada el " +
                             entrada.getFechaUso())
                    .idEntrada(entrada.getId())
                    .nombreComprador(entrada.getNombreComprador())
                    .emailComprador(entrada.getEmailComprador())
                    .nombreEvento(nombreEvento)
                    .nombreTanda(nombreTanda)
                    .estadoAnterior(EstadoEntrada.Usada)
                    .fechaUso(entrada.getFechaUso())
                    .build();
        }

        // ── Paso 4: Entrada válida — marcar como Usada ───────────────────
        EstadoEntrada estadoAnterior = entrada.getEstado();
        LocalDateTime ahora = LocalDateTime.now();

        entrada.setEstado(EstadoEntrada.Usada);
        entrada.setFechaUso(ahora);
        entrada.setIdStaffQrValidador(staffQR.getId());

        entradaRepository.save(entrada);

        log.info("QR validado exitosamente: entrada={}, evento={}, staff={}, comprador={}",
                entrada.getId(), nombreEvento, staffQR.getId(), entrada.getNombreComprador());

        return ValidacionQRResponseDTO.builder()
                .valido(true)
                .mensaje("✅ ENTRADA VÁLIDA — ¡Bienvenido/a " + entrada.getNombreComprador() + "!")
                .idEntrada(entrada.getId())
                .nombreComprador(entrada.getNombreComprador())
                .emailComprador(entrada.getEmailComprador())
                .nombreEvento(nombreEvento)
                .nombreTanda(nombreTanda)
                .estadoAnterior(estadoAnterior)
                .fechaUso(ahora)
                .build();
    }

    /**
     * Consulta el estado actual de una entrada por código QR sin modificarla.
     * Útil para que el staff verifique un QR antes de escanearlo oficialmente.
     *
     * @param codigoQr   código QR a consultar
     * @param staffQR    el StaffQR autenticado
     * @return datos de la entrada
     */
    @Transactional(readOnly = true)
    public ValidacionQRResponseDTO consultarEstadoQR(String codigoQr, StaffQR staffQR) {
        Entrada entrada = entradaRepository.findByCodigoQr(codigoQr)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No se encontró ninguna entrada con el código QR: " + codigoQr));

        // Verificar que la entrada corresponde al evento asignado
        Long idEventoEntrada = entrada.getTanda().getEvento().getId();
        if (!idEventoEntrada.equals(staffQR.getIdEvento())) {
            throw new ForbiddenActionException(
                    "Esta entrada pertenece a un evento diferente al que tenés asignado");
        }

        boolean esValida = entrada.getEstado() == EstadoEntrada.Pagada;
        String mensaje = esValida
                ? "✅ Entrada disponible para validar"
                : "❌ Entrada ya utilizada el " + entrada.getFechaUso();

        return ValidacionQRResponseDTO.builder()
                .valido(esValida)
                .mensaje(mensaje)
                .idEntrada(entrada.getId())
                .nombreComprador(entrada.getNombreComprador())
                .emailComprador(entrada.getEmailComprador())
                .nombreEvento(entrada.getTanda().getEvento().getNombre())
                .nombreTanda(entrada.getTanda().getNombre())
                .estadoAnterior(entrada.getEstado())
                .fechaUso(entrada.getFechaUso())
                .build();
    }
}
