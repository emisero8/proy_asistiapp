import {
  Ban,
  CalendarCheck,
  CalendarX,
  CircleCheck,
  CircleX,
  Coins,
  KeyRound,
  Link2,
  type LucideIcon,
  Megaphone,
  Pencil,
  Plus,
  ReceiptText,
  ScanLine,
  Settings,
  ShoppingCart,
  Ticket,
  Trash2,
  Unlink,
  Undo2,
  UserPlus,
} from "lucide-react";
import type { Tono } from "./estados";
import type { LogAuditoriaResponseDTO, RolUsuario } from "./types";

/**
 * Cómo se muestra cada acción auditada:
 * - `grupo`: para agrupar el filtro de acciones.
 * - `etiqueta`: el nombre corto de la columna "Acción" ("Suspendió usuario").
 * - `verbo`: para la frase del dashboard ("Ana suspendió a Juan Pérez").
 * - `tono` + `icono`: rojo lo destructivo o rechazado, verde lo que crea o habilita, azul lo que edita.
 */
export interface InfoAccion {
  grupo: GrupoAccion;
  etiqueta: string;
  verbo: string;
  tono: Tono;
  icono: LucideIcon;
}

export type GrupoAccion =
  | "Usuarios y plataforma"
  | "Eventos"
  | "Tandas"
  | "Staff"
  | "Entradas y ventas"
  | "Ingreso al evento"
  | "Perfil y Mercado Pago";

export const ACCIONES: Record<string, InfoAccion> = {
  // Administrador
  SUSPENDER_USUARIO: { grupo: "Usuarios y plataforma", etiqueta: "Suspendió usuario", verbo: "suspendió a", tono: "danger", icono: Ban },
  ACTIVAR_USUARIO: { grupo: "Usuarios y plataforma", etiqueta: "Reactivó usuario", verbo: "reactivó a", tono: "success", icono: CircleCheck },
  ELIMINAR_USUARIO: { grupo: "Usuarios y plataforma", etiqueta: "Eliminó usuario", verbo: "eliminó a", tono: "danger", icono: Trash2 },
  CAMBIAR_PASSWORD_USUARIO: { grupo: "Usuarios y plataforma", etiqueta: "Cambió contraseña", verbo: "cambió la contraseña de", tono: "warning", icono: KeyRound },
  CREAR_PAQUETE: { grupo: "Usuarios y plataforma", etiqueta: "Creó paquete", verbo: "creó el paquete", tono: "success", icono: Plus },
  ACTUALIZAR_PAQUETE: { grupo: "Usuarios y plataforma", etiqueta: "Editó paquete", verbo: "editó el paquete", tono: "info", icono: Pencil },
  DESHABILITAR_PAQUETE: { grupo: "Usuarios y plataforma", etiqueta: "Deshabilitó paquete", verbo: "deshabilitó el paquete", tono: "warning", icono: Ban },
  HABILITAR_PAQUETE: { grupo: "Usuarios y plataforma", etiqueta: "Habilitó paquete", verbo: "habilitó el paquete", tono: "success", icono: CircleCheck },
  ACTUALIZAR_CONFIGURACION: { grupo: "Usuarios y plataforma", etiqueta: "Cambió configuración", verbo: "cambió la configuración", tono: "info", icono: Settings },
  CREAR_ANUNCIO_GLOBAL: { grupo: "Usuarios y plataforma", etiqueta: "Envió anuncio", verbo: "envió un anuncio a", tono: "primary", icono: Megaphone },
  EDITAR_EVENTO_ADMIN: { grupo: "Eventos", etiqueta: "Editó evento (admin)", verbo: "editó el evento", tono: "info", icono: Pencil },
  CANCELAR_EVENTO_ADMIN: { grupo: "Eventos", etiqueta: "Canceló evento (admin)", verbo: "canceló el evento", tono: "danger", icono: CalendarX },
  ELIMINAR_EVENTO_ADMIN: { grupo: "Eventos", etiqueta: "Eliminó evento (admin)", verbo: "eliminó el evento", tono: "danger", icono: Trash2 },
  CREAR_TANDA_ADMIN: { grupo: "Tandas", etiqueta: "Creó tanda (admin)", verbo: "creó la tanda", tono: "success", icono: Plus },
  EDITAR_TANDA_ADMIN: { grupo: "Tandas", etiqueta: "Editó tanda (admin)", verbo: "editó la tanda", tono: "info", icono: Pencil },
  ELIMINAR_TANDA_ADMIN: { grupo: "Tandas", etiqueta: "Eliminó tanda (admin)", verbo: "eliminó la tanda", tono: "danger", icono: Trash2 },

  // Organizador
  CREAR_EVENTO: { grupo: "Eventos", etiqueta: "Creó evento", verbo: "creó el evento", tono: "success", icono: Plus },
  EDITAR_EVENTO: { grupo: "Eventos", etiqueta: "Editó evento", verbo: "editó el evento", tono: "info", icono: Pencil },
  PUBLICAR_EVENTO: { grupo: "Eventos", etiqueta: "Publicó evento", verbo: "publicó el evento", tono: "success", icono: CalendarCheck },
  CANCELAR_EVENTO: { grupo: "Eventos", etiqueta: "Canceló evento", verbo: "canceló el evento", tono: "danger", icono: CalendarX },
  ELIMINAR_EVENTO: { grupo: "Eventos", etiqueta: "Eliminó borrador", verbo: "eliminó el borrador", tono: "danger", icono: Trash2 },
  CREAR_TANDA: { grupo: "Tandas", etiqueta: "Creó tanda", verbo: "creó la tanda", tono: "success", icono: Plus },
  EDITAR_TANDA: { grupo: "Tandas", etiqueta: "Editó tanda", verbo: "editó la tanda", tono: "info", icono: Pencil },
  ELIMINAR_TANDA: { grupo: "Tandas", etiqueta: "Eliminó tanda", verbo: "eliminó la tanda", tono: "danger", icono: Trash2 },
  CREAR_STAFF_QR: { grupo: "Staff", etiqueta: "Creó Staff QR", verbo: "dio de alta a", tono: "success", icono: UserPlus },
  CREAR_STAFF_VENDEDOR: { grupo: "Staff", etiqueta: "Creó vendedor", verbo: "dio de alta a", tono: "success", icono: UserPlus },
  CAMBIAR_TOPE_VENDEDOR: { grupo: "Staff", etiqueta: "Cambió tope", verbo: "cambió el tope de", tono: "info", icono: Pencil },
  DESACTIVAR_STAFF: { grupo: "Staff", etiqueta: "Desactivó staff", verbo: "desactivó a", tono: "warning", icono: Ban },
  REACTIVAR_STAFF: { grupo: "Staff", etiqueta: "Reactivó staff", verbo: "reactivó a", tono: "success", icono: CircleCheck },
  RESETEAR_PASSWORD_STAFF: { grupo: "Staff", etiqueta: "Reseteó contraseña", verbo: "reseteó la contraseña de", tono: "warning", icono: KeyRound },
  EMITIR_ENTRADAS: { grupo: "Entradas y ventas", etiqueta: "Emitió entradas", verbo: "emitió la", tono: "primary", icono: Ticket },
  ANULAR_ENTRADA: { grupo: "Entradas y ventas", etiqueta: "Anuló entrada", verbo: "anuló la", tono: "danger", icono: CircleX },
  REEMBOLSAR_ENTRADA: { grupo: "Entradas y ventas", etiqueta: "Reembolsó entrada", verbo: "reembolsó la", tono: "warning", icono: Undo2 },
  REEMBOLSAR_EVENTO: { grupo: "Entradas y ventas", etiqueta: "Reembolsó evento", verbo: "reembolsó las compras de", tono: "warning", icono: ReceiptText },
  EDITAR_PERFIL: { grupo: "Perfil y Mercado Pago", etiqueta: "Editó perfil", verbo: "editó el perfil de", tono: "info", icono: Pencil },
  CAMBIAR_TOPE_COMPRADOR: { grupo: "Perfil y Mercado Pago", etiqueta: "Cambió tope por comprador", verbo: "cambió el tope por comprador de", tono: "info", icono: Pencil },
  CAMBIAR_CONTACTO: { grupo: "Perfil y Mercado Pago", etiqueta: "Cambió contacto", verbo: "cambió el contacto de", tono: "info", icono: Pencil },
  CAMBIAR_COMISION_MP: { grupo: "Perfil y Mercado Pago", etiqueta: "Cambió comisión MP", verbo: "cambió la comisión de", tono: "info", icono: Coins },
  CAMBIAR_PASSWORD_PROPIA: { grupo: "Perfil y Mercado Pago", etiqueta: "Cambió su contraseña", verbo: "cambió la contraseña de", tono: "warning", icono: KeyRound },
  VINCULAR_MP: { grupo: "Perfil y Mercado Pago", etiqueta: "Vinculó Mercado Pago", verbo: "vinculó la", tono: "success", icono: Link2 },
  DESVINCULAR_MP: { grupo: "Perfil y Mercado Pago", etiqueta: "Desvinculó Mercado Pago", verbo: "desvinculó la", tono: "warning", icono: Unlink },

  // Staff
  VENTA_MANUAL: { grupo: "Entradas y ventas", etiqueta: "Vendió en puerta", verbo: "vendió la", tono: "success", icono: ShoppingCart },
  INGRESO_VALIDADO: { grupo: "Ingreso al evento", etiqueta: "Ingreso validado", verbo: "validó la", tono: "success", icono: ScanLine },
  INGRESO_RECHAZADO: { grupo: "Ingreso al evento", etiqueta: "Ingreso rechazado", verbo: "rechazó la", tono: "danger", icono: ScanLine },
};

/** Orden de los grupos en el filtro de acciones. */
export const GRUPOS: GrupoAccion[] = [
  "Usuarios y plataforma",
  "Eventos",
  "Tandas",
  "Staff",
  "Entradas y ventas",
  "Ingreso al evento",
  "Perfil y Mercado Pago",
];

export function accionesDelGrupo(grupo: GrupoAccion): string[] {
  return Object.keys(ACCIONES).filter((a) => ACCIONES[a].grupo === grupo);
}

/** Tipos de entidad afectada (valor que manda el backend → nombre legible). */
export const ENTIDADES: Record<string, string> = {
  Usuario: "Usuario",
  Organizador: "Organizador",
  Staff: "Staff",
  Evento: "Evento",
  Tanda: "Tanda",
  Entrada: "Entrada",
  PaqueteCredito: "Paquete de créditos",
  ConfiguracionSistema: "Configuración",
  Notificacion: "Anuncio",
  CuentaMercadoPago: "Cuenta de Mercado Pago",
};

/** Roles de quien hace la acción, en el orden de los chips de filtro. */
export const ROLES_EMISOR: { rol: RolUsuario; etiqueta: string }[] = [
  { rol: "Administrador", etiqueta: "Administradores" },
  { rol: "Organizador", etiqueta: "Organizadores" },
  { rol: "Staff_Vendedor", etiqueta: "Staff Vendedor" },
  { rol: "Staff_QR", etiqueta: "Staff QR" },
];

export function infoAccion(accion: string): InfoAccion {
  return (
    ACCIONES[accion] ?? {
      grupo: "Usuarios y plataforma",
      etiqueta: accion.charAt(0) + accion.slice(1).toLowerCase().replaceAll("_", " "),
      verbo: accion.toLowerCase().replaceAll("_", " "),
      tono: "neutral",
      icono: Pencil,
    }
  );
}

export function etiquetaEntidad(entidad: string): string {
  return ENTIDADES[entidad] ?? entidad;
}

/** "Ana Gómez" o, si el registro es viejo y no lo guardó, "Usuario". */
export function nombreEmisor(log: LogAuditoriaResponseDTO): string {
  return log.emisorNombre ?? "Usuario";
}

/**
 * Nombre de lo afectado, guardado al momento de la acción. Null si no se conoce (registro
 * viejo de algo que después se borró): la pantalla lo muestra como "Sin nombre registrado".
 */
export function nombreEntidad(log: LogAuditoriaResponseDTO): string | null {
  return log.entidadNombre ?? null;
}

/** Las líneas del detalle (el backend las separa con salto de línea). */
export function lineasDetalle(log: LogAuditoriaResponseDTO): string[] {
  return (log.detalle ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Frase corta para el dashboard: "Ana Gómez suspendió a Juan Pérez". */
export function describirAccion(log: LogAuditoriaResponseDTO): string {
  const { verbo } = infoAccion(log.accion);
  const id = log.idEntidadAfectada == null ? "" : ` #${log.idEntidadAfectada}`;
  const objetivo = nombreEntidad(log) ?? etiquetaEntidad(log.entidadAfectada).toLowerCase() + id;
  return `${nombreEmisor(log)} ${verbo} ${objetivo}`;
}
