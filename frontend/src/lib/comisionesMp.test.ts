import { describe, expect, it } from "vitest";
import { cargoEstimado, desglosePedido, porcentajeMp, textoComision, textoPorcentaje } from "./comisionesMp";

describe("comisiones de Mercado Pago", () => {
  it("usa la tasa mayor solo en Buenos Aires, Entre Ríos y Chubut", () => {
    expect(porcentajeMp("AlInstante", "General")).toBe(6.29);
    expect(porcentajeMp("AlInstante", "BuenosAiresEntreRiosChubut")).toBe(6.6);
    expect(porcentajeMp("Dias35", "General")).toBe(1.49);
    expect(porcentajeMp("Dias35", "BuenosAiresEntreRiosChubut")).toBe(1.56);
  });

  // Mismos casos que CargoServicioMpTest.java: el front y el back tienen que calcular lo mismo.
  it.each([
    ["AlInstante", "General", 10000, 823.79],
    ["AlInstante", "BuenosAiresEntreRiosChubut", 10000, 867.91],
    ["Dias10", "General", 10000, 560.99],
    ["Dias10", "BuenosAiresEntreRiosChubut", 10000, 590.76],
    ["Dias18", "General", 10000, 427.74],
    ["Dias18", "BuenosAiresEntreRiosChubut", 10000, 450.15],
    ["Dias35", "General", 10000, 183.6],
    ["Dias35", "BuenosAiresEntreRiosChubut", 10000, 192.39],
    ["AlInstante", "General", 4500, 370.7],
    ["Dias35", "General", 4500, 82.62],
  ] as const)("%s / %s sobre $%d → cargo $%d", (plazo, zona, precio, esperado) => {
    expect(cargoEstimado(precio, plazo, zona)).toBe(esperado);
  });

  it("con el cargo, después de la comisión el organizador recibe el precio de la entrada", () => {
    const cobrado = 10000 + cargoEstimado(10000, "AlInstante", "General");
    const neto = cobrado * (1 - (6.29 * 1.21) / 100);
    expect(Math.abs(neto - 10000)).toBeLessThan(0.01);
  });

  it("una entrada sin precio no lleva cargo", () => {
    expect(cargoEstimado(0, "AlInstante", "General")).toBe(0);
  });

  it("formatea las tasas en castellano", () => {
    expect(textoComision(6.29)).toBe("6,29 % + IVA");
    expect(textoComision(6.6)).toBe("6,60 % + IVA");
    expect(textoPorcentaje(8.24)).toBe("8,24 %");
  });
});

describe("desglosePedido", () => {
  it("sin cargo, el total es el precio por la cantidad", () => {
    expect(desglosePedido(1500, 0, 2)).toEqual({ subtotal: 3000, cargo: 0, total: 3000 });
    expect(desglosePedido(1500, null, 2)).toEqual({ subtotal: 3000, cargo: 0, total: 3000 });
    expect(desglosePedido(1500, undefined, 1)).toEqual({ subtotal: 1500, cargo: 0, total: 1500 });
  });

  it("con cargo, suma el cargo por entrada sin errores de punto flotante", () => {
    // 3 × 82,38 en number da 247,14000000000001: el desglose tiene que coincidir con lo que cobra el backend.
    expect(desglosePedido(1000, 82.38, 3)).toEqual({ subtotal: 3000, cargo: 247.14, total: 3247.14 });
    expect(desglosePedido(10000, 823.79, 2)).toEqual({ subtotal: 20000, cargo: 1647.58, total: 21647.58 });
  });
});
