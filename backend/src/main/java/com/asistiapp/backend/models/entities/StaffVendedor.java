package com.asistiapp.backend.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Subentidad Staff Vendedor.
 * Tabla: staff_vendedores (PK/FK → usuarios.id)
 * Realiza ventas manuales de entradas sin pasar por MercadoPago (CU-019).
 */
@Entity
@Table(name = "staff_vendedores")
@PrimaryKeyJoinColumn(name = "id_usuario")
@Getter
@Setter
@NoArgsConstructor
public class StaffVendedor extends Usuario {

    /**
     * El Organizador al que pertenece este vendedor.
     */
    @Column(name = "id_organizador", nullable = false)
    private Long idOrganizador;

    /**
     * El evento al que está asignado este vendedor. Solo puede vender entradas
     * de este evento (CU-019). Nullable a nivel de columna por compatibilidad
     * con registros previos a esta regla; el alta nueva siempre lo exige.
     */
    @Column(name = "id_evento")
    private Long idEvento;

    /**
     * Máximo de entradas que este vendedor puede vender en total (8.3). El Organizador lo fija al
     * darlo de alta, así un vendedor no puede vender sin límite. Nullable solo por compatibilidad con
     * vendedores creados antes de la regla (sin tope); el alta nueva siempre lo exige.
     */
    @Column(name = "tope_entradas")
    private Integer topeEntradas;
}
