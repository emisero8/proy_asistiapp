package com.asistiapp.backend.security;

import com.asistiapp.backend.models.entities.Usuario;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

/**
 * Utilidades para generación, validación y extracción de claims de JWT.
 * Usa la API de jjwt 0.12.x.
 *
 * El token incluye los siguientes claims además del estándar (sub, iat, exp):
 *  - "rol"  : nombre del RolUsuario (ej. "Organizador")
 *  - "id"   : ID del usuario en la BD
 */
@Component
public class JwtUtils {

    @Value("${app.jwt.secret}")
    private String secretKey;

    @Value("${app.jwt.expiration-ms}")
    private long expirationMs;

    // ─────────────────────────────────────────────
    // Generación
    // ─────────────────────────────────────────────

    /**
     * Genera un JWT firmado con HMAC-SHA256 para el usuario dado.
     *
     * @param usuario entidad Usuario (necesitamos id y rol además del email)
     * @return token JWT como String
     */
    public String generateToken(Usuario usuario) {
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("rol", usuario.getRol().name());
        extraClaims.put("id", usuario.getId());

        return Jwts.builder()
                .claims(extraClaims)
                .subject(usuario.getEmail())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    // ─────────────────────────────────────────────
    // Extracción de claims
    // ─────────────────────────────────────────────

    /** Extrae el email (subject) del token. */
    public String extractEmail(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    /** Extrae el rol del token. */
    public String extractRol(String token) {
        return extractClaim(token, claims -> claims.get("rol", String.class));
    }

    /** Extrae el ID del usuario del token. */
    public Long extractId(String token) {
        return extractClaim(token, claims -> claims.get("id", Long.class));
    }

    // ─────────────────────────────────────────────
    // Validación
    // ─────────────────────────────────────────────

    /**
     * Verifica que el token sea válido para el UserDetails dado:
     * firma correcta, no expirado y email coincidente.
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String email = extractEmail(token);
        return email.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    // ─────────────────────────────────────────────
    // Helpers privados
    // ─────────────────────────────────────────────

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = secretKey.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
