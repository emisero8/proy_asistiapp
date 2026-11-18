import { describe, expect, it, vi } from "vitest";
import { ApiError } from "./api";
import { iniciarPago, mensajeDeErrorDePago, PestanaBloqueadaError, pagoEnPestanaNueva, rutaResultadoPago } from "./pago";

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

  it("si el navegador bloquea la pestaña, no crea la orden ni redirige: avisa", async () => {
    const navegador = { abrirPestana: vi.fn(() => null), redirigir: vi.fn() };
    const crearOrden = vi.fn(async () => ORDEN);

    await expect(iniciarPago(crearOrden, true, navegador)).rejects.toBeInstanceOf(PestanaBloqueadaError);

    // Nada de órdenes pendientes huérfanas ni de dejar al comprador varado en MercadoPago.
    expect(crearOrden).not.toHaveBeenCalled();
    expect(navegador.redirigir).not.toHaveBeenCalled();
  });

  it("mientras se crea la orden, la pestaña dice que está redirigiendo a MercadoPago", async () => {
    let textoDuranteLaCreacion = "";
    const body = { hijos: [] as { textContent: string }[], appendChild(n: { textContent: string }) { this.hijos.push(n); } };
    const pestana = {
      opener: {},
      location: { href: "" },
      close: vi.fn(),
      document: { title: "", body, createElement: () => ({ textContent: "", style: { cssText: "" } }) },
    } as unknown as Window;
    const navegador = { abrirPestana: () => pestana, redirigir: vi.fn() };

    await iniciarPago(async () => {
      textoDuranteLaCreacion = body.hijos[0]?.textContent ?? "";
      return ORDEN;
    }, true, navegador);

    expect(textoDuranteLaCreacion).toBe("Redirigiendo a MercadoPago…");
    expect(pestana.document.title).toBe("MercadoPago");
  });

  it("si la pestaña no deja escribir el mensaje, el pago sigue igual", async () => {
    const pestana = pestanaFalsa(); // sin document: escribir lanza, pero es solo cosmético
    const navegador = { abrirPestana: () => pestana, redirigir: vi.fn() };

    const resultado = await iniciarPago(async () => ORDEN, true, navegador);

    expect(resultado.enPestanaNueva).toBe(true);
    expect(pestana.location.href).toBe(ORDEN.urlPago);
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

describe("mensajeDeErrorDePago", () => {
  it("muestra el mensaje de los errores propios y generaliza el resto", () => {
    const api = new ApiError({ status: 409, error: "Tanda agotada", path: "/x", timestamp: "" });
    expect(mensajeDeErrorDePago(api, "genérico")).toBe("Tanda agotada");
    expect(mensajeDeErrorDePago(new PestanaBloqueadaError(), "genérico")).toMatch(/bloqueó la ventana de pago/);
    expect(mensajeDeErrorDePago(new TypeError("Failed to fetch"), "genérico")).toBe("genérico");
  });
});

describe("rutaResultadoPago", () => {
  it("arma la ruta de la pantalla de resultado", () => {
    expect(rutaResultadoPago("ref-123", "entradas")).toBe("/pago/resultado?ref=ref-123&tipo=entradas");
  });
});
