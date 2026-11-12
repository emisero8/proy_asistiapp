import { ApiError } from "./api";

/**
 * MercadoPago solo devuelve al comprador al sitio (auto_return / botón "Volver") cuando
 * el frontend es HTTPS público. En local (http) la pantalla de "pago aprobado" queda sin
 * salida, así que ahí el checkout se abre en una pestaña nueva y la original se queda
 * esperando el resultado en /pago/resultado.
 */
export function pagoEnPestanaNueva(protocolo: string = window.location.protocol): boolean {
  return protocolo === "http:";
}

/**
 * El navegador bloqueó la pestaña de pago (pop-up). Se corta ANTES de crear la orden: caer a la
 * redirección de siempre dejaría al comprador varado en la pantalla de MercadoPago, que en local
 * (http) no tiene botón para volver, y con una orden pendiente que nadie va a pagar.
 */
export class PestanaBloqueadaError extends Error {
  constructor() {
    super(
      "Tu navegador bloqueó la ventana de pago. Permití las ventanas emergentes para este sitio e intentá de nuevo.",
    );
    this.name = "PestanaBloqueadaError";
  }
}

/** Mensaje para mostrar cuando falla el inicio del pago: los errores propios se muestran, el resto se generaliza. */
export function mensajeDeErrorDePago(e: unknown, porDefecto: string): string {
  return e instanceof ApiError || e instanceof PestanaBloqueadaError ? e.message : porDefecto;
}

/** Mientras se crea la orden la pestaña estaría en blanco; se le avisa qué está pasando. */
function escribirMensajeDeEspera(pestana: Window): void {
  try {
    pestana.document.title = "MercadoPago";
    const texto = pestana.document.createElement("p");
    texto.textContent = "Redirigiendo a MercadoPago…";
    texto.style.cssText = "font-family:system-ui,sans-serif;text-align:center;margin-top:30vh;color:#555";
    pestana.document.body.appendChild(texto);
  } catch {
    // Es solo cosmético: si el navegador no deja escribir en la pestaña, se queda en blanco como antes.
  }
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
 * como respuesta directa al click y el navegador la bloquea como pop-up. Si aun así se bloquea,
 * lanza PestanaBloqueadaError sin crear la orden.
 */
export async function iniciarPago<T extends OrdenDePago>(
  crearOrden: () => Promise<T>,
  enPestanaNueva: boolean = pagoEnPestanaNueva(),
  navegador: Navegador = navegadorReal,
): Promise<{ orden: T; enPestanaNueva: boolean }> {
  const pestana = enPestanaNueva ? navegador.abrirPestana() : null;
  if (enPestanaNueva && !pestana) {
    throw new PestanaBloqueadaError();
  }
  if (pestana) {
    escribirMensajeDeEspera(pestana);
  }

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

  // HTTPS: la página actual va directo a MercadoPago, que después vuelve solo al sitio.
  navegador.redirigir(orden.urlPago);
  return { orden, enPestanaNueva: false };
}

/** Ruta de la pantalla que espera/muestra el resultado de una orden. */
export function rutaResultadoPago(ordenId: string, tipo: "entradas" | "creditos"): string {
  return `/pago/resultado?ref=${encodeURIComponent(ordenId)}&tipo=${tipo}`;
}
