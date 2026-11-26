package com.asistiapp.backend.services;

import com.asistiapp.backend.exceptions.BusinessRuleException;
import com.asistiapp.backend.exceptions.ResourceNotFoundException;
import com.asistiapp.backend.models.dtos.perfil.CambiarPasswordRequestDTO;
import com.asistiapp.backend.models.dtos.perfil.PerfilRequestDTO;
import com.asistiapp.backend.models.dtos.perfil.PerfilResponseDTO;
import com.asistiapp.backend.models.entities.Usuario;
import com.asistiapp.backend.models.entities.Organizador;
import com.asistiapp.backend.models.enums.PlazoLiberacionMp;
import com.asistiapp.backend.models.enums.ZonaComisionMp;
import com.asistiapp.backend.repositories.OrganizadorRepository;
import com.asistiapp.backend.repositories.UsuarioRepository;
import com.asistiapp.backend.security.audit.Auditable;
import com.asistiapp.backend.security.audit.AuditoriaContexto;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Perfil del Organizador: nombre, foto de perfil y cambio de contraseña.
 *
 * La foto solo puede apuntar a una imagen de nuestro propio Cloudinary, así nadie
 * puede guardar como foto de perfil un link externo arbitrario.
 */
@Service
@RequiredArgsConstructor
public class PerfilService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final ImagenService imagenService;
    private final OrganizadorRepository organizadorRepository;
    private final LimiteCompradorService limiteCompradorService;

    @Transactional(readOnly = true)
    public PerfilResponseDTO obtenerPerfil(Long idUsuario) {
        return toResponseDTO(getUsuarioOrThrow(idUsuario));
    }

    @Transactional
    @Auditable(accion = "EDITAR_PERFIL", entidad = "Organizador")
    public PerfilResponseDTO actualizarPerfil(Long idUsuario, PerfilRequestDTO dto) {
        Usuario usuario = getUsuarioOrThrow(idUsuario);
        String fotoAnterior = usuario.getFotoPerfilUrl();
        String foto = dto.getFotoPerfilUrl() == null || dto.getFotoPerfilUrl().isBlank()
                ? null
                : dto.getFotoPerfilUrl().trim();
        if (foto != null) {
            validarFotoDeNuestroCloudinary(foto);
        }
        AuditoriaContexto.objetivo(usuario.getId(), dto.getNombre().trim());
        AuditoriaContexto.cambio("Nombre", usuario.getNombre(), dto.getNombre().trim());
        if (!java.util.Objects.equals(fotoAnterior, foto)) {
            AuditoriaContexto.detalle(foto == null ? "Foto de perfil: quitada" : "Foto de perfil: modificada");
        }
        if (java.util.Objects.equals(usuario.getNombre(), dto.getNombre().trim()) && java.util.Objects.equals(fotoAnterior, foto)) {
            AuditoriaContexto.detalle("Se guardó sin cambios.");
        }
        usuario.setNombre(dto.getNombre().trim());
        usuario.setFotoPerfilUrl(foto);
        PerfilResponseDTO response = toResponseDTO(usuarioRepository.save(usuario));

        // Se cambió o se quitó la foto: la anterior ya no la referencia nadie, se libera el espacio.
        if (fotoAnterior != null && !fotoAnterior.equals(foto)) {
            imagenService.eliminarSiEsNuestra(fotoAnterior);
        }
        return response;
    }

    /** El Organizador fija cuántas entradas puede tener una misma persona para sus eventos; null vuelve al de la plataforma. */
    @Transactional
    @Auditable(accion = "CAMBIAR_TOPE_COMPRADOR", entidad = "Organizador")
    public PerfilResponseDTO cambiarTopeComprador(Long idUsuario, Integer tope) {
        if (tope != null && (tope < 1 || tope > 100)) {
            throw new BusinessRuleException("El tope de entradas por comprador tiene que estar entre 1 y 100");
        }
        Organizador organizador = organizadorRepository.findById(idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Organizador no encontrado"));
        AuditoriaContexto.objetivo(organizador.getId(), organizador.getNombre());
        AuditoriaContexto.cambio("Entradas por comprador",
                textoTope(organizador.getMaxEntradasPorComprador()), textoTope(tope));
        organizador.setMaxEntradasPorComprador(tope);
        organizadorRepository.save(organizador);
        return toResponseDTO(organizador);
    }

    /**
     * El Organizador carga a dónde deriva el botón de arrepentimiento (8.8). El WhatsApp se guarda solo con
     * dígitos (código de país incluido) para armar el link wa.me; vacío en ambos borra el contacto.
     */
    @Transactional
    @Auditable(accion = "CAMBIAR_CONTACTO", entidad = "Organizador")
    public PerfilResponseDTO cambiarContacto(Long idUsuario, String whatsapp, String email) {
        String wa = whatsapp == null ? "" : whatsapp.replaceAll("[\\s+()\\-.]", "");
        if (!wa.isEmpty() && !wa.matches("\\d{8,15}")) {
            throw new BusinessRuleException("El WhatsApp tiene que ser un número con código de país (entre 8 y 15 dígitos)");
        }
        String mail = email == null ? "" : email.trim().toLowerCase();
        if (!mail.isEmpty() && !mail.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+")) {
            throw new BusinessRuleException("El email de contacto no es válido");
        }
        Organizador organizador = organizadorRepository.findById(idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Organizador no encontrado"));
        AuditoriaContexto.objetivo(organizador.getId(), organizador.getNombre());
        AuditoriaContexto.cambio("WhatsApp de contacto", organizador.getContactoWhatsapp(), wa.isEmpty() ? null : wa);
        AuditoriaContexto.cambio("Email de contacto", organizador.getContactoEmail(), mail.isEmpty() ? null : mail);
        organizador.setContactoWhatsapp(wa.isEmpty() ? null : wa);
        organizador.setContactoEmail(mail.isEmpty() ? null : mail);
        organizadorRepository.save(organizador);
        return toResponseDTO(organizador);
    }

    /**
     * Quién paga la comisión de Mercado Pago de las entradas. Se guardan el plazo y la zona aunque el Organizador
     * la absorba, para no perderlos si la traslada más adelante. Las órdenes ya creadas no cambian: cada una
     * guarda su propio cargo.
     */
    @Transactional
    @Auditable(accion = "CAMBIAR_COMISION_MP", entidad = "Organizador")
    public PerfilResponseDTO cambiarComisionMp(Long idUsuario, boolean trasladarAlComprador,
                                               PlazoLiberacionMp plazo, ZonaComisionMp zona) {
        if (plazo == null || zona == null) {
            throw new BusinessRuleException("Elegí el plazo de liberación y la zona de tu cuenta de Mercado Pago");
        }
        Organizador organizador = organizadorRepository.findById(idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Organizador no encontrado"));
        AuditoriaContexto.objetivo(organizador.getId(), organizador.getNombre());
        AuditoriaContexto.cambio("Comisión de Mercado Pago",
                organizador.isTrasladarCargoMp() ? "la paga el comprador" : "la absorbe el organizador",
                trasladarAlComprador ? "la paga el comprador" : "la absorbe el organizador");
        AuditoriaContexto.cambio("Plazo de liberación", textoPlazo(CargoServicioMp.plazoDe(organizador)), textoPlazo(plazo));
        AuditoriaContexto.cambio("Zona", textoZona(CargoServicioMp.zonaDe(organizador)), textoZona(zona));
        organizador.setTrasladarCargoMp(trasladarAlComprador);
        organizador.setPlazoLiberacionMp(plazo);
        organizador.setZonaComisionMp(zona);
        organizadorRepository.save(organizador);
        return toResponseDTO(organizador);
    }

    @Transactional
    @Auditable(accion = "CAMBIAR_PASSWORD_PROPIA", entidad = "Organizador")
    public void cambiarPassword(Long idUsuario, CambiarPasswordRequestDTO dto) {
        Usuario usuario = getUsuarioOrThrow(idUsuario);
        if (!passwordEncoder.matches(dto.getPasswordActual(), usuario.getPasswordHash())) {
            throw new BusinessRuleException("La contraseña actual no es correcta");
        }
        if (passwordEncoder.matches(dto.getPasswordNueva(), usuario.getPasswordHash())) {
            throw new BusinessRuleException("La nueva contraseña debe ser distinta a la actual");
        }
        usuario.setPasswordHash(passwordEncoder.encode(dto.getPasswordNueva()));
        usuarioRepository.save(usuario);
        AuditoriaContexto.objetivo(usuario.getId(), usuario.getNombre());
        AuditoriaContexto.detalle("Cambió su propia contraseña.");
    }

    private static String textoPlazo(PlazoLiberacionMp plazo) {
        return switch (plazo) {
            case AlInstante -> "al instante";
            case Dias10 -> "10 días";
            case Dias18 -> "18 días";
            case Dias35 -> "35 días";
        };
    }

    private static String textoZona(ZonaComisionMp zona) {
        return zona == ZonaComisionMp.General ? "general" : "Buenos Aires / Entre Ríos / Chubut";
    }

    private static String textoTope(Integer tope) {
        return tope == null ? "el de la plataforma" : String.valueOf(tope);
    }

    private void validarFotoDeNuestroCloudinary(String url) {
        if (!imagenService.esDeNuestroCloudinary(url)) {
            throw new BusinessRuleException("La foto de perfil debe subirse desde la aplicación");
        }
    }

    private Usuario getUsuarioOrThrow(Long id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
    }

    private PerfilResponseDTO toResponseDTO(Usuario usuario) {
        Organizador org = organizadorRepository.findById(usuario.getId()).orElse(null);
        PlazoLiberacionMp plazo = org == null ? PlazoLiberacionMp.AlInstante : CargoServicioMp.plazoDe(org);
        ZonaComisionMp zona = org == null ? ZonaComisionMp.General : CargoServicioMp.zonaDe(org);
        return PerfilResponseDTO.builder()
                .id(usuario.getId())
                .nombre(usuario.getNombre())
                .email(usuario.getEmail())
                .fotoPerfilUrl(usuario.getFotoPerfilUrl())
                .maxEntradasPorComprador(org == null ? null : org.getMaxEntradasPorComprador())
                .contactoWhatsapp(org == null ? null : org.getContactoWhatsapp())
                .contactoEmail(org == null ? null : org.getContactoEmail())
                .maxEntradasPorCompradorPlataforma(limiteCompradorService.limiteGlobal())
                .trasladarCargoMp(org != null && org.isTrasladarCargoMp())
                .plazoLiberacionMp(plazo)
                .zonaComisionMp(zona)
                .porcentajeCargoComprador(CargoServicioMp.porcentajeRecargo(plazo, zona).doubleValue())
                .build();
    }
}
