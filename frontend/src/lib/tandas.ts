import { formatFechaHoraCorta } from "./format";
import type { TandaResponseDTO } from "./types";

/**
 * Estado de venta de una tanda, calculado en el frontend **espejando** la validación del backend
 * (`VentaService.validarTandaDisponible`): una tanda solo es comprable si estamos dentro de su
 * ventana de vigencia (si tiene una configurada) y le queda cupo. Esto es solo para aviso
 * temprano/claridad en la UI — la validación de verdad (la que corta) sigue siendo la del backend.
 *
 * El chequeo de "evento ya finalizado" es a nivel evento (no de tanda) y se maneja aparte en la
 * pantalla, igual que en el backend.
 */
export type EstadoVentaTanda = "abierta" | "proximamente" | "cerrada" | "agotada";

export function estadoVentaTanda(tanda: TandaResponseDTO, ahora: Date = new Date()): EstadoVentaTanda {
  if (tanda.fechaInicioVigencia && ahora < new Date(tanda.fechaInicioVigencia)) return "proximamente";
  if (tanda.fechaFinVigencia && ahora > new Date(tanda.fechaFinVigencia)) return "cerrada";
  if (tanda.cupoDisponible <= 0) return "agotada";
  return "abierta";
}

/** Igual que `Evento.HORAS_HASTA_FINALIZAR` del backend: hasta dónde puede quedar abierta la venta. */
const HORAS_HASTA_FINALIZAR = 12;

/**
 * Fecha y hora de cierre a partir del día elegido en "Venta hasta". El día del evento significa "hasta que
 * termine" (puede caer en la madrugada siguiente); cualquier día anterior, hasta el final de ese día.
 */
export function cierreDeVenta(hasta: string, fechaEvento: string, horaEvento: string): string {
  if (hasta !== fechaEvento || !horaEvento) return `${hasta}T23:59:59`;
  const fin = new Date(`${fechaEvento}T${horaEvento.slice(0, 5)}:00`);
  fin.setHours(fin.getHours() + HORAS_HASTA_FINALIZAR);
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${fin.getFullYear()}-${dos(fin.getMonth() + 1)}-${dos(fin.getDate())}T${dos(fin.getHours())}:${dos(fin.getMinutes())}:00`;
}

/** Texto de la ventana de venta de una tanda, o `null` si no tiene vigencia configurada. */
export function ventanaVentaTexto(tanda: TandaResponseDTO): string | null {
  const { fechaInicioVigencia: ini, fechaFinVigencia: fin } = tanda;
  if (ini && fin) return `Venta: ${formatFechaHoraCorta(ini)} – ${formatFechaHoraCorta(fin)}`;
  if (fin) return `Cierra ${formatFechaHoraCorta(fin)}`;
  if (ini) return `Abre ${formatFechaHoraCorta(ini)}`;
  return null;
}

/** Mensaje global cuando ninguna tanda del evento se puede comprar (y el evento no finalizó). */
export function mensajeSinVenta(tandas: TandaResponseDTO[], ahora: Date = new Date()): string {
  const estados = tandas.map((t) => estadoVentaTanda(t, ahora));
  if (estados.length > 0 && estados.every((e) => e === "proximamente")) return "La venta de entradas para este evento todavía no abrió.";
  if (estados.length > 0 && estados.every((e) => e === "cerrada")) return "La venta de entradas para este evento ya cerró.";
  if (estados.length > 0 && estados.every((e) => e === "agotada")) return "Las entradas para este evento están agotadas.";
  return "Por ahora no hay entradas a la venta para este evento.";
}
