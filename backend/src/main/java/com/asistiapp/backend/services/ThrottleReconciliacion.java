package com.asistiapp.backend.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;

/**
 * Limita cada cuánto se consulta a MercadoPago por UNA misma orden cuando el comprador mira el
 * estado de su pago.
 *
 * Consultar el estado de una orden `Pendiente` dispara una búsqueda real en la API de MercadoPago
 * (reconciliación). Eso se protegía con el límite de peticiones por IP, que es una herramienta
 * torpe para esto: los compradores de un mismo wifi comparten IP y se pisan entre sí. Acá el límite
 * va por orden: aunque un comprador (o alguien con su referencia) consulte cada segundo, a MP se
 * le pregunta como mucho una vez por intervalo. El resto de las consultas se responde igual, solo
 * con el estado que ya tenemos en la base (que el webhook mantiene al día).
 *
 * Solo se registran órdenes que existen y están Pendientes (el controlador lo verifica antes), así
 * que el mapa no crece con referencias inventadas; además se purga lo vencido.
 */
@Component
public class ThrottleReconciliacion {

    private static final int TAMANO_PARA_PURGAR = 1000;

    private final long intervaloMs;
    private final LongSupplier reloj;
    private final Map<String, Long> ultimaConsulta = new ConcurrentHashMap<>();

    @Autowired
    public ThrottleReconciliacion(
            @Value("${app.mercadopago.intervalo-reconciliacion-segundos:10}") long intervaloSegundos) {
        this(intervaloSegundos * 1000, System::currentTimeMillis);
    }

    ThrottleReconciliacion(long intervaloMs, LongSupplier reloj) {
        this.intervaloMs = Math.max(0, intervaloMs);
        this.reloj = reloj;
    }

    /** true si ya pasó el intervalo desde la última consulta de esta orden (y registra esta). */
    public boolean permitir(String externalReference) {
        long ahora = reloj.getAsLong();
        boolean[] permitido = {false};
        ultimaConsulta.compute(externalReference, (ref, ultima) -> {
            if (ultima == null || ahora - ultima >= intervaloMs) {
                permitido[0] = true;
                return ahora;
            }
            return ultima;
        });
        if (permitido[0] && ultimaConsulta.size() > TAMANO_PARA_PURGAR) {
            purgar(ahora);
        }
        return permitido[0];
    }

    private void purgar(long ahora) {
        for (Iterator<Long> it = ultimaConsulta.values().iterator(); it.hasNext(); ) {
            if (ahora - it.next() >= intervaloMs) {
                it.remove();
            }
        }
    }
}
