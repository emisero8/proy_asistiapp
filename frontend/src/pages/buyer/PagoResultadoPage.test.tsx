import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ESPERA_ENTRE_REINTENTOS_MS, PagoResultadoPage, REINTENTOS_MAXIMOS } from "./PagoResultadoPage";
import { api } from "../../lib/api";
import type { EstadoOrdenEntradasResponseDTO } from "../../lib/types";

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn() } };
});

const PENDIENTE: EstadoOrdenEntradasResponseDTO = {
  estado: "Pendiente",
  cantidad: 2,
  nombreEvento: "Festival de Jazz",
  nombreTanda: "General",
  entradas: [],
};

const APROBADA: EstadoOrdenEntradasResponseDTO = {
  ...PENDIENTE,
  estado: "Aprobada",
  entradas: [
    { id: 1, codigoQr: "QR-A" },
    { id: 2, codigoQr: "QR-B" },
  ] as EstadoOrdenEntradasResponseDTO["entradas"],
};

function renderPage(state?: { urlPago: string }) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/pago/resultado", search: "?ref=ref-123&tipo=entradas", state }]}>
      <PagoResultadoPage />
    </MemoryRouter>,
  );
}

async function avanzar(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.mocked(api.get).mockReset();
});

describe("PagoResultadoPage — espera del pago", () => {
  it("mientras la orden está Pendiente sigue consultando, y muestra las entradas apenas se aprueba", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(PENDIENTE).mockResolvedValueOnce(PENDIENTE).mockResolvedValue(APROBADA);
    renderPage();
    await avanzar(0);

    expect(screen.getByText("Estamos confirmando tu pago")).toBeInTheDocument();

    await avanzar(ESPERA_ENTRE_REINTENTOS_MS * 2);

    expect(screen.getByText("¡Pago aprobado!")).toBeInTheDocument();
    expect(screen.getByText("Entrada 2 de 2")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(3);

    // Ya resuelta: no sigue consultando.
    await avanzar(ESPERA_ENTRE_REINTENTOS_MS * 5);
    expect(api.get).toHaveBeenCalledTimes(3);
  });

  it("si el pago quedó en otra pestaña, lo dice y ofrece reabrir MercadoPago", async () => {
    vi.mocked(api.get).mockResolvedValue(PENDIENTE);
    renderPage({ urlPago: "https://mp.test/checkout" });
    await avanzar(0);

    expect(screen.getByText("Esperando tu pago")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Abrir MercadoPago de nuevo/ })).toHaveAttribute("href", "https://mp.test/checkout");
  });

  it("al volver a la pestaña consulta al instante, sin esperar al próximo intervalo", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(PENDIENTE).mockResolvedValue(APROBADA);
    renderPage({ urlPago: "https://mp.test/checkout" });
    await avanzar(0);
    expect(api.get).toHaveBeenCalledTimes(1);

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(api.get).toHaveBeenCalledTimes(2);
    expect(screen.getByText("¡Pago aprobado!")).toBeInTheDocument();
  });

  it("un fallo suelto en medio de la espera no la corta", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(PENDIENTE)
      .mockRejectedValueOnce(new Error("red caída"))
      .mockResolvedValue(APROBADA);
    renderPage();
    await avanzar(0);

    await avanzar(ESPERA_ENTRE_REINTENTOS_MS * 2);

    expect(screen.getByText("¡Pago aprobado!")).toBeInTheDocument();
  });

  it("al agotar la espera deja de consultar y ofrece volver a hacerlo a mano", async () => {
    vi.mocked(api.get).mockResolvedValue(PENDIENTE);
    renderPage();
    await avanzar(0);

    await avanzar(ESPERA_ENTRE_REINTENTOS_MS * REINTENTOS_MAXIMOS);

    expect(screen.getByText("Todavía no vemos tu pago")).toBeInTheDocument();
    const llamadas = vi.mocked(api.get).mock.calls.length;
    expect(llamadas).toBe(REINTENTOS_MAXIMOS);

    await avanzar(ESPERA_ENTRE_REINTENTOS_MS * 3);
    expect(api.get).toHaveBeenCalledTimes(llamadas);

    vi.mocked(api.get).mockResolvedValue(APROBADA);
    await act(async () => {
      screen.getByRole("button", { name: "Volver a consultar" }).click();
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText("¡Pago aprobado!")).toBeInTheDocument();
  });
});
