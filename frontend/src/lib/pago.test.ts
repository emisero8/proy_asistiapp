import { describe, expect, it, vi } from "vitest";
import { iniciarPago, pagoEnPestanaNueva, rutaResultadoPago } from "./pago";

const ORDEN = { ordenId: "ref-123", urlPago: "https://mp.test/checkout" };

function pestanaFalsa() {
  return { opener: {}, location: { href: "" }, close: vi.fn() } as unknown as Window;
}

describe("pagoEnPestanaNueva", () => {
  it("solo en http: con HTTPS MercadoPago vuelve solo al sitio", () => {
    expect(pagoEnPestanaNueva("http:")).toBe(true);
    expect(pagoEnPestanaNueva("https:")).toBe(false);
  });
});

describe("iniciarPago", () => {
  it("abre la pestaña antes de crear la orden y después le carga la URL de pago", async () => {
    const pestana = pestanaFalsa();
    const pasos: string[] = [];
    const navegador = {
      abrirPestana: vi.fn(() => {
        pasos.push("abrir");
        return pestana;
      }),
      redirigir: vi.fn(),
    };
    const crearOrden = vi.fn(async () => {
      pasos.push("crear");
      return ORDEN;
    });

    const resultado = await iniciarPago(crearOrden, true, navegador);

    expect(pasos).toEqual(["abrir", "crear"]);
    expect(pestana.location.href).toBe(ORDEN.urlPago);
    expect(pestana.opener).toBeNull();
    expect(navegador.redirigir).not.toHaveBeenCalled();
    expect(resultado).toEqual({ orden: ORDEN, enPestanaNueva: true });
  });

  it("si el navegador bloquea la pestaña, cae a la redirección en la misma página", async () => {
    const navegador = { abrirPestana: vi.fn(() => null), redirigir: vi.fn() };

    const resultado = await iniciarPago(async () => ORDEN, true, navegador);

    expect(navegador.redirigir).toHaveBeenCalledWith(ORDEN.urlPago);
    expect(resultado.enPestanaNueva).toBe(false);
  });

  it("si falla la creación de la orden, cierra la pestaña en blanco y propaga el error", async () => {
    const pestana = pestanaFalsa();
    const navegador = { abrirPestana: () => pestana, redirigir: vi.fn() };
    const error = new Error("tanda agotada");

    await expect(
      iniciarPago(async () => {
        throw error;
      }, true, navegador),
    ).rejects.toBe(error);

    expect(pestana.close).toHaveBeenCalled();
    expect(navegador.redirigir).not.toHaveBeenCalled();
  });

  it("con HTTPS no abre ninguna pestaña: redirige como siempre", async () => {
    const navegador = { abrirPestana: vi.fn(), redirigir: vi.fn() };

    const resultado = await iniciarPago(async () => ORDEN, false, navegador);

    expect(navegador.abrirPestana).not.toHaveBeenCalled();
    expect(navegador.redirigir).toHaveBeenCalledWith(ORDEN.urlPago);
    expect(resultado.enPestanaNueva).toBe(false);
  });
});

describe("rutaResultadoPago", () => {
  it("arma la ruta de la pantalla de resultado", () => {
    expect(rutaResultadoPago("ref-123", "entradas")).toBe("/pago/resultado?ref=ref-123&tipo=entradas");
  });
});
