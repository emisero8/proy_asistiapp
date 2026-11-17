import type { TandaResponseDTO } from "./types";

export type EstadoVentaTanda = "disponible" | "agotada" | "no_abierta" | "cerrada";

type TandaConVigencia = Pick<TandaResponseDTO, "cupoDisponible" | "fechaInicioVigencia" | "fechaFinVigencia">;

/**
 * Misma regla que `VentaService.validarTandaDisponible` del backend (vigencia propia de la tanda
 * y cupo), para no ofrecer en pantalla una tanda que el backend va a rechazar al confirmar.
 * Las fechas de vigencia vienen sin zona (`LocalDateTime`), así que se comparan en hora local.
 */
export function estadoVentaTanda(tanda: TandaConVigencia, ahora: Date = new Date()): EstadoVentaTanda {
  if (tanda.fechaInicioVigencia && ahora < new Date(tanda.fechaInicioVigencia)) return "no_abierta";
  if (tanda.fechaFinVigencia && ahora > new Date(tanda.fechaFinVigencia)) return "cerrada";
  if (tanda.cupoDisponible <= 0) return "agotada";
  return "disponible";
}

export function etiquetaEstadoTanda(estado: EstadoVentaTanda, cupoDisponible: number): string {
  switch (estado) {
    case "disponible":
      return `${cupoDisponible} disponibles`;
    case "agotada":
      return "Agotada";
    case "no_abierta":
      return "Venta aún no abierta";
    case "cerrada":
      return "Venta cerrada";
  }
}
