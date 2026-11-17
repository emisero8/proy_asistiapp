package com.asistiapp.backend.models.dtos.perfil;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PerfilResponseDTO {

    private Long id;
    private String nombre;
    private String email;
    private String fotoPerfilUrl;

    /** Tope de entradas por comprador que fijó el Organizador; null = no fijó uno y rige el de la plataforma (8.9). */
    private Integer maxEntradasPorComprador;
    /** El tope de la plataforma, para mostrar qué rige cuando el Organizador no fijó el suyo. */
    private Integer maxEntradasPorCompradorPlataforma;

    /** Contacto del arrepentimiento (8.8): WhatsApp solo con dígitos y/o email; null si no cargó. */
    private String contactoWhatsapp;
    private String contactoEmail;
}
