import type { LogAuditoriaResponseDTO } from "./types";

export const ACCION_LABELS: Record<string, string> = {
  SUSPENDER_USUARIO: "suspendió al usuario",
  ACTIVAR_USUARIO: "reactivó al usuario",
  CAMBIAR_ROL: "cambió el rol del usuario",
  ELIMINAR_USUARIO: "eliminó al usuario",
  CREAR_PAQUETE: "creó el paquete de créditos",
  ACTUALIZAR_PAQUETE: "actualizó el paquete de créditos",
  DESHABILITAR_PAQUETE: "deshabilitó el paquete de créditos",
  HABILITAR_PAQUETE: "habilitó el paquete de créditos",
  EDITAR_EVENTO_ADMIN: "editó el evento",
  CANCELAR_EVENTO_ADMIN: "canceló el evento",
  ELIMINAR_EVENTO_ADMIN: "eliminó el evento",
  ACTUALIZAR_CONFIGURACION: "actualizó la configuración global",
};

export function describirAccion(log: LogAuditoriaResponseDTO): string {
  const verbo = ACCION_LABELS[log.accion] ?? log.accion.toLowerCase().replace(/_/g, " ");
  return `Admin #${log.idAdmin} ${verbo} #${log.idEntidadAfectada}`;
}
