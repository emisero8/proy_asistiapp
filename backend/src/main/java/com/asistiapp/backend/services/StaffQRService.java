package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.ForbiddenActionException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.dtos.validacion.ValidacionQRRequestDTO;
import com.asistiapp.backend.models.dtos.validacion.ValidacionQRResponseDTO;
import com.asistiapp.backend.models.entities.Entrada;
import com.asistiapp.backend.models.entities.StaffQR;
import com.asistiapp.backend.models.enums.EstadoEntrada;
import com.asistiapp.backend.models.enums.EstadoEvento;
import com.asistiapp.backend.repositories.EntradaRepository;
import com.asistiapp.backend.security.audit.Auditable;
import com.asistiapp.backend.security.audit.AuditoriaContexto;
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
 *     - En un único UPDATE condicionado a que siga "Pagada": si dos
 *       dispositivos escanean el mismo QR a la vez, solo uno la marca.
 *       (@Transactional solo no alcanza: ambos podrían leerla sin usar.)
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
    @Auditable(accion = "INGRESO_VALIDADO", entidad = "Entrada")
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

        AuditoriaContexto.objetivo(entrada.getId(), "Entrada de " + entrada.getNombreComprador());
        AuditoriaContexto.detalle("Evento: " + nombreEvento + " (#" + idEventoEntrada + ") · Tanda: " + nombreTanda);

        // ── Pasos 2b y 3: ni anulada (8.6) ni ya usada ───────────────────
        if (entrada.getEstado() != EstadoEntrada.Pagada) {
            return rechazarPorEstado(entrada, nombreEvento, nombreTanda);
        }

        // ── Paso 3b: Verificar que el evento no esté cancelado ───────────
        if (entrada.getTanda().getEvento().getEstado() == EstadoEvento.Cancelado) {
            AuditoriaContexto.accion("INGRESO_RECHAZADO");
            AuditoriaContexto.detalle("Rechazada: el evento está cancelado.");
            log.warn("Intento de usar una entrada de un evento cancelado. QR={}, entrada={}",
                    dto.getCodigoQr(), entrada.getId());
            return ValidacionQRResponseDTO.builder()
                    .valido(false)
                    .mensaje("❌ EVENTO CANCELADO — La entrada no sirve para ingresar")
                    .idEntrada(entrada.getId())
                    .nombreComprador(entrada.getNombreComprador())
                    .emailComprador(entrada.getEmailComprador())
                    .nombreEvento(nombreEvento)
                    .nombreTanda(nombreTanda)
                    .estadoAnterior(entrada.getEstado())
                    .build();
        }

        // ── Paso 3c: Verificar que el evento no haya finalizado ──────────
        if (entrada.getTanda().getEvento().yaFinalizo()) {
            AuditoriaContexto.accion("INGRESO_RECHAZADO");
            AuditoriaContexto.detalle("Rechazada: el evento ya finalizó.");
            log.warn("Intento de usar una entrada de un evento finalizado. QR={}, entrada={}",
                    dto.getCodigoQr(), entrada.getId());
            return ValidacionQRResponseDTO.builder()
                    .valido(false)
                    .mensaje("❌ EVENTO FINALIZADO — La entrada ya no sirve para ingresar")
                    .idEntrada(entrada.getId())
                    .nombreComprador(entrada.getNombreComprador())
                    .emailComprador(entrada.getEmailComprador())
                    .nombreEvento(nombreEvento)
                    .nombreTanda(nombreTanda)
                    .estadoAnterior(entrada.getEstado())
                    .build();
        }

        // ── Paso 4: Entrada válida — marcar como Usada ───────────────────
        EstadoEntrada estadoAnterior = entrada.getEstado();
        LocalDateTime ahora = LocalDateTime.now();

        if (entradaRepository.marcarComoUsada(entrada.getId(), staffQR.getId(), ahora) == 0) {
            // Cambió entre la lectura y la marca: se vuelve a leer para decir qué pasó.
            Entrada actual = entradaRepository.findById(entrada.getId()).orElseThrow(
                    () -> new ResourceNotFoundException("La entrada ya no existe"));
            return rechazarPorEstado(actual, nombreEvento, nombreTanda);
        }
        AuditoriaContexto.cambio("Estado", estadoAnterior, EstadoEntrada.Usada);

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

    /** Respuesta para una entrada que no se puede usar porque está anulada o porque ya se usó. */
    private ValidacionQRResponseDTO rechazarPorEstado(Entrada entrada, String nombreEvento, String nombreTanda) {
        boolean anulada = entrada.getEstado() == EstadoEntrada.Anulada;
        AuditoriaContexto.accion("INGRESO_RECHAZADO");
        AuditoriaContexto.detalle(anulada
                ? "Rechazada: la entrada está anulada."
                : "Rechazada: ya se había usado el " + AuditoriaContexto.texto(entrada.getFechaUso()) + ".");
        log.warn("Intento de usar una entrada {}. QR={}, entrada={}",
                anulada ? "anulada" : "ya utilizada", entrada.getCodigoQr(), entrada.getId());
        return ValidacionQRResponseDTO.builder()
                .valido(false)
                .mensaje(anulada
                        ? "❌ ENTRADA ANULADA — El organizador la dejó sin efecto"
                        : "❌ ENTRADA YA UTILIZADA — Esta entrada fue usada el " + entrada.getFechaUso())
                .idEntrada(entrada.getId())
                .nombreComprador(entrada.getNombreComprador())
                .emailComprador(entrada.getEmailComprador())
                .nombreEvento(nombreEvento)
                .nombreTanda(nombreTanda)
                .estadoAnterior(entrada.getEstado())
                .fechaUso(anulada ? null : entrada.getFechaUso())
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

        boolean pagada = entrada.getEstado() == EstadoEntrada.Pagada;
        boolean finalizado = entrada.getTanda().getEvento().yaFinalizo();
        boolean cancelado = entrada.getTanda().getEvento().getEstado() == EstadoEvento.Cancelado;
        boolean esValida = pagada && !cancelado && !finalizado;
        String mensaje = esValida
                ? "✅ Entrada disponible para validar"
                : entrada.getEstado() == EstadoEntrada.Anulada
                        ? "❌ Entrada anulada por el organizador"
                        : pagada
                                ? cancelado ? "❌ El evento está cancelado" : "❌ El evento ya finalizó"
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
