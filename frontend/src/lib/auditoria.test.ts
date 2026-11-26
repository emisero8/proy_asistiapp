import { describe, expect, it } from "vitest";
import { ACCIONES, accionesDelGrupo, describirAccion, GRUPOS, infoAccion, lineasDetalle } from "./auditoria";
import type { LogAuditoriaResponseDTO } from "./types";

function log(parcial: Partial<LogAuditoriaResponseDTO>): LogAuditoriaResponseDTO {
  return {
    id: 1,
    idEmisor: 7,
    emisorNombre: "Facundo Riffel",
    emisorRol: "Organizador",
    accion: "PUBLICAR_EVENTO",
    entidadAfectada: "Evento",
    idEntidadAfectada: 3,
    entidadNombre: "Festival de prueba",
    detalle: null,
    fechaHora: "2026-11-25T20:00:00",
    ...parcial,
  };
}

describe("auditoria", () => {
  it("cada acción está en un grupo del filtro (ninguna queda fuera del select)", () => {
    const enGrupos = GRUPOS.flatMap(accionesDelGrupo);
    expect(enGrupos.sort()).toEqual(Object.keys(ACCIONES).sort());
  });

  it("arma la frase del dashboard con quién y sobre qué", () => {
    expect(describirAccion(log({}))).toBe("Facundo Riffel publicó el evento Festival de prueba");
    expect(describirAccion(log({ accion: "SUSPENDER_USUARIO", entidadAfectada: "Usuario", entidadNombre: "Juan Pérez", emisorNombre: "Ana" }))).toBe(
      "Ana suspendió a Juan Pérez",
    );
  });

  it("si no se conoce el nombre de lo afectado usa el tipo y el id", () => {
    expect(describirAccion(log({ accion: "ELIMINAR_USUARIO", entidadAfectada: "Usuario", entidadNombre: null, idEntidadAfectada: 6 }))).toBe(
      "Facundo Riffel eliminó a usuario #6",
    );
  });

  it("una acción desconocida (de un backend más nuevo) igual se muestra", () => {
    const info = infoAccion("ALGO_NUEVO");
    expect(info.etiqueta).toBe("Algo nuevo");
    expect(info.tono).toBe("neutral");
  });

  it("separa el detalle en líneas y descarta las vacías", () => {
    expect(lineasDetalle(log({ detalle: "Organizador: X (#7)\n\nPrecio: $1 → $2 " }))).toEqual(["Organizador: X (#7)", "Precio: $1 → $2"]);
    expect(lineasDetalle(log({ detalle: null }))).toEqual([]);
  });
});
