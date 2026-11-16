import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { api } from "../../lib/api";
import { ThemeProvider } from "../../lib/theme";
import { PagoResultadoPage } from "./PagoResultadoPage";

function renderResultado() {
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={["/pago/resultado?ref=abc-123&tipo=entradas"]}>
        <PagoResultadoPage />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

/** Deja correr las promesas pendientes y avanza el reloj simulado. */
async function avanzar(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("PagoResultadoPage", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("mientras la orden sigue Pendiente consulta sola y lo dice", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue({ estado: "Pendiente", cantidad: 1, entradas: [] });
    renderResultado();
    await avanzar(0);
    expect(screen.getByText("Estamos confirmando tu pago")).toBeInTheDocument();
    await avanzar(2500);
    expect(get).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenLastCalledWith("/tickets/orden/abc-123", { skipAuth: true });
  });

  it("al agotar los reintentos deja de decir que se actualiza sola y permite volver a consultar", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue({ estado: "Pendiente", cantidad: 1, entradas: [] });
    renderResultado();
    await avanzar(0);
    await avanzar(2500 * 8);
    expect(get).toHaveBeenCalledTimes(9); // la inicial + 8 reintentos
    expect(screen.getByText("Todavía no recibimos la confirmación")).toBeInTheDocument();
    expect(screen.queryByText("Estamos confirmando tu pago")).not.toBeInTheDocument();
    expect(screen.getByText(/No vuelvas a pagar/)).toBeInTheDocument();

    // Sin más consultas automáticas…
    await avanzar(10_000);
    expect(get).toHaveBeenCalledTimes(9);

    // …hasta que la persona pide volver a consultar
    await act(async () => {
      screen.getByRole("button", { name: "Volver a consultar" }).click();
    });
    await avanzar(0);
    expect(get).toHaveBeenCalledTimes(10);
    expect(screen.getByText("Estamos confirmando tu pago")).toBeInTheDocument();
  });

  it("si la orden se aprueba deja de consultar", async () => {
    const get = vi
      .spyOn(api, "get")
      .mockResolvedValueOnce({ estado: "Pendiente", cantidad: 1, entradas: [] })
      .mockResolvedValue({ estado: "Aprobada", cantidad: 1, nombreEvento: "Fiesta", entradas: [{ id: 1, codigoQr: "AST-1" }] });
    renderResultado();
    await avanzar(0);
    await avanzar(2500);
    expect(screen.getByText("¡Pago aprobado!")).toBeInTheDocument();
    await avanzar(20_000);
    expect(get).toHaveBeenCalledTimes(2);
  });
});
