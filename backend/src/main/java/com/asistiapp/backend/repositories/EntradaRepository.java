package com.asistiapp.backend.repositories;

import com.asistiapp.backend.models.entities.Entrada;
import com.asistiapp.backend.models.enums.EstadoEntrada;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface EntradaRepository extends JpaRepository<Entrada, Long> {

    /** Búsqueda por código QR. Usada en validación (CU-018). */
    Optional<Entrada> findByCodigoQr(String codigoQr);

    boolean existsByCodigoQr(String codigoQr);

    List<Entrada> findByEstado(EstadoEntrada estado);

    /** Todas las entradas de una tanda específica. */
    List<Entrada> findByTandaId(Long tandaId);
    /** Entradas generadas por una orden de pago — para la pantalla de resultado del pago. */
    List<Entrada> findByIdTransaccionPago(Long idTransaccionPago);

    /**
     * Todas las entradas de un evento (navegando por la relación Tanda → Evento).
     * Útil para reportes del Organizador.
     */
    @Query("SELECT e FROM Entrada e WHERE e.tanda.evento.id = :eventoId")
    List<Entrada> findByEventoId(@Param("eventoId") Long eventoId);

    /** Cantidad de entradas vendidas para un evento. Las anuladas (8.6) ya no cuentan. */
    @Query("SELECT COUNT(e) FROM Entrada e WHERE e.tanda.evento.id = :eventoId "
            + "AND e.estado <> com.asistiapp.backend.models.enums.EstadoEntrada.Anulada")
    long countByEventoId(@Param("eventoId") Long eventoId);

    /** Cuántas entradas ya compró un email para un evento — para limitar la compra por persona. Una anulada libera su lugar. */
    @Query("SELECT COUNT(e) FROM Entrada e WHERE e.tanda.evento.id = :eventoId AND LOWER(e.emailComprador) = LOWER(:email) "
            + "AND e.estado <> com.asistiapp.backend.models.enums.EstadoEntrada.Anulada")
    long countByEventoIdAndEmailComprador(@Param("eventoId") Long eventoId, @Param("email") String email);

    /** Entradas que vendió un Staff Vendedor — para controlar su tope. Una anulada libera su lugar. */
    @Query("SELECT COUNT(e) FROM Entrada e WHERE e.idStaffVendedor = :idStaffVendedor "
            + "AND e.estado <> com.asistiapp.backend.models.enums.EstadoEntrada.Anulada")
    long countByIdStaffVendedor(@Param("idStaffVendedor") Long idStaffVendedor);

    /** Por vendedor: [idStaffVendedor, cantidad vendida, total que suman sus entradas]. Sin las anuladas. */
    @Query("SELECT e.idStaffVendedor, COUNT(e), COALESCE(SUM(COALESCE(e.precioVenta, e.tanda.precio)), 0) FROM Entrada e "
            + "WHERE e.idStaffVendedor IN :ids AND e.estado <> com.asistiapp.backend.models.enums.EstadoEntrada.Anulada "
            + "GROUP BY e.idStaffVendedor")
    List<Object[]> resumenPorVendedor(@Param("ids") List<Long> ids);

    /**
     * Suma de ingresos de las entradas del sistema (métricas globales del Admin, CU-027). Las cortesías
     * del Organizador no cobraron nada y no cuentan; el pago externo sí (cobrado, aunque fuera de la plataforma).
     */
    @Query("SELECT COALESCE(SUM(COALESCE(e.precioVenta, e.tanda.precio)), 0) FROM Entrada e "
            + "WHERE e.estado <> com.asistiapp.backend.models.enums.EstadoEntrada.Anulada "
            + "AND (e.tipoEmision IS NULL OR e.tipoEmision <> com.asistiapp.backend.models.enums.TipoEmision.Cortesia)")
    Double sumaIngresosTotales();

    /** Entradas vigentes (no anuladas) de todo el sistema, para las métricas globales. */
    @Query("SELECT COUNT(e) FROM Entrada e WHERE e.estado <> com.asistiapp.backend.models.enums.EstadoEntrada.Anulada")
    long countVigentes();

    /**
     * Compras online con precio a las que todavía hay que devolverles el dinero (8.6): las entradas anuladas y, si el
     * evento se canceló, todas. Las manuales y las emitidas por el Organizador no pasaron por Mercado Pago.
     */
    @Query("SELECT e FROM Entrada e WHERE e.tanda.evento.id = :eventoId AND e.idTransaccionPago IS NOT NULL "
            + "AND e.reembolsadaEn IS NULL AND COALESCE(e.precioVenta, e.tanda.precio) > 0 "
            + "AND (e.estado = com.asistiapp.backend.models.enums.EstadoEntrada.Anulada "
            + "OR e.tanda.evento.estado = com.asistiapp.backend.models.enums.EstadoEvento.Cancelado)")
    List<Entrada> findPendientesDeReembolso(@Param("eventoId") Long eventoId);

    /**
     * Registra el ingreso solo si la entrada sigue sin usar: 1 si este pedido la marcó, 0 si mientras tanto la usó
     * otro dispositivo o la anularon. Comprobar y marcar en un mismo UPDATE impide que un QR deje entrar dos veces.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Entrada e SET e.estado = com.asistiapp.backend.models.enums.EstadoEntrada.Usada, "
            + "e.fechaUso = :fechaUso, e.idStaffQrValidador = :idStaffQr "
            + "WHERE e.id = :id AND e.estado = com.asistiapp.backend.models.enums.EstadoEntrada.Pagada")
    int marcarComoUsada(@Param("id") Long id, @Param("idStaffQr") Long idStaffQr,
                        @Param("fechaUso") LocalDateTime fechaUso);

    /** Toma el turno para reembolsar una entrada: 1 si lo logró, 0 si otro pedido ya la reembolsó o la está reembolsando. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Entrada e SET e.reembolsoEnCurso = true WHERE e.id = :id AND e.reembolsoEnCurso = false AND e.reembolsadaEn IS NULL")
    int reservarReembolso(@Param("id") Long id);

    /** Suelta el turno cuando Mercado Pago no pudo devolver el dinero, para poder reintentar. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Entrada e SET e.reembolsoEnCurso = false WHERE e.id = :id")
    void liberarReembolso(@Param("id") Long id);
}
