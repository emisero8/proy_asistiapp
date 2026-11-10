/**
 * MercadoPago solo devuelve al comprador al sitio (auto_return / botón "Volver") cuando
 * el frontend es HTTPS público. En local (http) la pantalla de "pago aprobado" queda sin
 * salida, así que ahí el checkout se abre en una pestaña nueva y la original se queda
 * esperando el resultado en /pago/resultado.
 */
export function pagoEnPestanaNueva(protocolo: string = window.location.protocol): boolean {
  return protocolo === "http:";
}

interface OrdenDePago {
  ordenId: string;
  urlPago: string;
}

interface Navegador {
  abrirPestana: () => Window | null;
  redirigir: (url: string) => void;
}

const navegadorReal: Navegador = {
  abrirPestana: () => window.open("", "_blank"),
  redirigir: (url) => {
    window.location.href = url;
  },
};

/**
 * Crea la orden y manda al comprador a MercadoPago. Devuelve `enPestanaNueva: true` si el
 * pago quedó en otra pestaña (el llamador tiene que llevar esta a /pago/resultado); con
 * `false` la página actual ya está navegando a MercadoPago.
 *
 * La pestaña se abre ANTES de llamar al backend: abrirla después de un await ya no cuenta
 * como respuesta directa al click y el navegador la bloquea como pop-up.
 */
export async function iniciarPago<T extends OrdenDePago>(
  crearOrden: () => Promise<T>,
  enPestanaNueva: boolean = pagoEnPestanaNueva(),
  navegador: Navegador = navegadorReal,
): Promise<{ orden: T; enPestanaNueva: boolean }> {
  const pestana = enPestanaNueva ? navegador.abrirPestana() : null;

  let orden: T;
  try {
    orden = await crearOrden();
  } catch (e) {
    pestana?.close();
    throw e;
  }

  if (pestana) {
    pestana.opener = null;
    pestana.location.href = orden.urlPago;
    return { orden, enPestanaNueva: true };
  }

  // HTTPS, o el navegador bloqueó la pestaña igual: redirección de siempre.
  navegador.redirigir(orden.urlPago);
  return { orden, enPestanaNueva: false };
}

/** Ruta de la pantalla que espera/muestra el resultado de una orden. */
export function rutaResultadoPago(ordenId: string, tipo: "entradas" | "creditos"): string {
  return `/pago/resultado?ref=${encodeURIComponent(ordenId)}&tipo=${tipo}`;
}
