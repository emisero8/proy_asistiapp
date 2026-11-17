import { afterEach, describe, expect, it, vi } from "vitest";
import { estadoVentaTanda, mensajeSinVenta, ventanaVentaTexto } from "./tandas";
import type { TandaResponseDTO } from "./types";

const AHORA = new Date("2026-06-15T12:00:00");

function tanda(p: Partial<TandaResponseDTO>): TandaResponseDTO {
  return {
    id: 1,
    idEvento: 1,
    nombre: "General",
    precio: 10000,
    cupoMaximo: 100,
    cupoDisponible: 50,
    fechaInicioVigencia: null,
    fechaFinVigencia: null,
    ...p,
  };
}

describe("estadoVentaTanda", () => {
  it("sin vigencia y con cupo → abierta", () => {
    expect(estadoVentaTanda(tanda({}), AHORA)).toBe("abierta");
  });

  it("sin cupo → agotada", () => {
    expect(estadoVentaTanda(tanda({ cupoDisponible: 0 }), AHORA)).toBe("agotada");
  });

  it("antes del inicio de vigencia → proximamente (aunque tenga cupo)", () => {
    expect(estadoVentaTanda(tanda({ fechaInicioVigencia: "2026-06-20T00:00:00" }), AHORA)).toBe("proximamente");
  });

  it("después del fin de vigencia → cerrada (aunque tenga cupo)", () => {
    expect(estadoVentaTanda(tanda({ fechaFinVigencia: "2026-06-10T23:59:00" }), AHORA)).toBe("cerrada");
  });

  it("dentro de la ventana y con cupo → abierta", () => {
    expect(
      estadoVentaTanda(tanda({ fechaInicioVigencia: "2026-06-01T00:00:00", fechaFinVigencia: "2026-06-30T23:59:00" }), AHORA),
    ).toBe("abierta");
  });

  it("prioriza la ventana sobre el cupo (cerrada aunque esté agotada)", () => {
    expect(estadoVentaTanda(tanda({ cupoDisponible: 0, fechaFinVigencia: "2026-06-10T00:00:00" }), AHORA)).toBe("cerrada");
  });
});

describe("ventanaVentaTexto", () => {
  it("sin vigencia → null", () => {
    expect(ventanaVentaTexto(tanda({}))).toBeNull();
  });
  it("con inicio y fin → 'Venta: … – …'", () => {
    const t = ventanaVentaTexto(tanda({ fechaInicioVigencia: "2026-06-01T12:00:00", fechaFinVigencia: "2026-06-30T23:59:00" }));
    expect(t).toMatch(/^Venta: .+ – .+$/);
  });
  it("solo fin → 'Cierra …'", () => {
    expect(ventanaVentaTexto(tanda({ fechaFinVigencia: "2026-06-30T23:59:00" }))).toMatch(/^Cierra /);
  });
  it("solo inicio → 'Abre …'", () => {
    expect(ventanaVentaTexto(tanda({ fechaInicioVigencia: "2026-06-20T12:00:00" }))).toMatch(/^Abre /);
  });
});

describe("mensajeSinVenta", () => {
  afterEach(() => vi.useRealTimers());

  it("todas agotadas → mensaje de agotadas", () => {
    expect(mensajeSinVenta([tanda({ cupoDisponible: 0 }), tanda({ cupoDisponible: 0 })], AHORA)).toContain("agotadas");
  });
  it("todas próximamente → mensaje de 'todavía no abrió'", () => {
    expect(mensajeSinVenta([tanda({ fechaInicioVigencia: "2026-06-20T00:00:00" })], AHORA)).toContain("todavía no abrió");
  });
  it("todas cerradas → mensaje de 'ya cerró'", () => {
    expect(mensajeSinVenta([tanda({ fechaFinVigencia: "2026-06-10T00:00:00" })], AHORA)).toContain("ya cerró");
  });
  it("mezcla de motivos → mensaje genérico", () => {
    const msg = mensajeSinVenta([tanda({ cupoDisponible: 0 }), tanda({ fechaFinVigencia: "2026-06-10T00:00:00" })], AHORA);
    expect(msg).toContain("no hay entradas a la venta");
  });
});
