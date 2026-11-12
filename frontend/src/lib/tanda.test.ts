import { describe, expect, it } from "vitest";
import { estadoVentaTanda, etiquetaEstadoTanda } from "./tanda";

const AHORA = new Date("2026-11-10T12:00:00");

function tanda(extra: Partial<Parameters<typeof estadoVentaTanda>[0]> = {}) {
  return { cupoDisponible: 10, fechaInicioVigencia: null, fechaFinVigencia: null, ...extra };
}

describe("estadoVentaTanda", () => {
  it("sin vigencia propia y con cupo está disponible", () => {
    expect(estadoVentaTanda(tanda(), AHORA)).toBe("disponible");
  });

  it("dentro de la ventana de venta está disponible", () => {
    const t = tanda({ fechaInicioVigencia: "2026-11-01T00:00:00", fechaFinVigencia: "2026-11-20T23:59:00" });
    expect(estadoVentaTanda(t, AHORA)).toBe("disponible");
  });

  it("antes de la apertura todavía no está abierta", () => {
    expect(estadoVentaTanda(tanda({ fechaInicioVigencia: "2026-11-15T00:00:00" }), AHORA)).toBe("no_abierta");
  });

  it("pasado el cierre está cerrada, aunque tenga cupo", () => {
    expect(estadoVentaTanda(tanda({ fechaFinVigencia: "2026-11-06T23:59:00" }), AHORA)).toBe("cerrada");
  });

  it("sin cupo está agotada", () => {
    expect(estadoVentaTanda(tanda({ cupoDisponible: 0 }), AHORA)).toBe("agotada");
  });

  it("si está cerrada y además sin cupo, gana el cierre (igual que el backend)", () => {
    expect(estadoVentaTanda(tanda({ cupoDisponible: 0, fechaFinVigencia: "2026-11-06T23:59:00" }), AHORA)).toBe("cerrada");
  });
});

describe("etiquetaEstadoTanda", () => {
  it("describe cada estado", () => {
    expect(etiquetaEstadoTanda("disponible", 7)).toBe("7 disponibles");
    expect(etiquetaEstadoTanda("agotada", 0)).toBe("Agotada");
    expect(etiquetaEstadoTanda("no_abierta", 5)).toBe("Venta aún no abierta");
    expect(etiquetaEstadoTanda("cerrada", 5)).toBe("Venta cerrada");
  });
});
