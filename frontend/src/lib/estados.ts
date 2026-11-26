import type {
  EstadoEntrada,
  EstadoEvento,
  EstadoPaquete,
  EstadoTransaccion,
  EstadoUsuario,
  EventoResponseDTO,
  RolUsuario,
} from "./types";

/**
 * Mapa único de "estado → tono visual" para toda la app. Antes cada pantalla tenía su
 * propio mapa (o un ternario inline) y el mismo estado salía con colores distintos.
 * Lo consume `<StatusBadge>`; si aparece un estado nuevo en el backend, TypeScript obliga
 * a darle un tono acá.
 */
export type Tono =
  | "neutral"
  | "neutral-strong"
  | "primary"
  | "primary-strong"
  | "highlight"
  | "accent"
  // `live`: estado "en vivo / en venta / activo" — chip lima sutil + punto lima, para conectar
  // el backoffice con la identidad de la plataforma (ver Badge). Distinto de `success` (verde
  // oscuro semántico de "completado": pago aprobado, entrada ya usada).
  | "live"
  | "success"
  | "warning"
  | "danger"
  | "info";

/**
 * "Finalizado" no es un estado guardado: es un evento Publicado que ya terminó
 * (`EventoResponseDTO.finalizado`, lo decide el backend).
 */
export type EstadoEventoVisible = EstadoEvento | "Finalizado";

export const TONO_ESTADO_EVENTO: Record<EstadoEventoVisible, Tono> = {
  Publicado: "live",
  Borrador: "warning",
  Cancelado: "danger",
  Finalizado: "neutral",
};

/** Publicado y ya terminado: queda solo para consulta (sin editar ni cancelar). */
export function eventoCerrado(evento: Pick<EventoResponseDTO, "estado" | "finalizado">): boolean {
  return evento.estado === "Publicado" && evento.finalizado;
}

export function estadoVisibleEvento(evento: Pick<EventoResponseDTO, "estado" | "finalizado">): EstadoEventoVisible {
  return eventoCerrado(evento) ? "Finalizado" : evento.estado;
}

export const TONO_ESTADO_USUARIO: Record<EstadoUsuario, Tono> = {
  Activo: "live",
  Suspendido: "danger",
  Inactivo: "neutral",
};

/**
 * Desde el punto de vista del Organizador: "Pagada" es una entrada vigente (todavía no
 * ingresó) y "Usada" es alguien que ya entró al evento — un resultado positivo, no un aviso.
 */
export const TONO_ESTADO_ENTRADA: Record<EstadoEntrada, Tono> = {
  Pagada: "primary",
  Usada: "success",
  // Anulada por el Organizador (8.6): ya no sirve para entrar.
  Anulada: "danger",
};

export const TONO_ESTADO_TRANSACCION: Record<EstadoTransaccion, Tono> = {
  Pendiente: "warning",
  Aprobada: "success",
  Rechazada: "danger",
  Expirada: "neutral",
  Reembolsada: "info",
};

export const TONO_ESTADO_PAQUETE: Record<EstadoPaquete, Tono> = {
  Activo: "live",
  Deshabilitado: "neutral",
};

/** Nombre legible de cada rol (el backend usa identificadores con guion bajo). */
export const ETIQUETA_ROL: Record<RolUsuario, string> = {
  Administrador: "Administrador",
  Organizador: "Organizador",
  Staff_QR: "Staff QR",
  Staff_Vendedor: "Staff Vendedor",
};

/** Roles: cuatro intensidades (azul sólido / azul suave / neutro fuerte / neutro suave) — no un color por rol. */
export const TONO_ROL: Record<RolUsuario, Tono> = {
  Administrador: "primary-strong",
  Organizador: "primary",
  Staff_QR: "neutral-strong",
  Staff_Vendedor: "neutral",
};
