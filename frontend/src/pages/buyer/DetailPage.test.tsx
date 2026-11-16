import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { api } from "../../lib/api";
import { ThemeProvider } from "../../lib/theme";
import { DetailPage } from "./DetailPage";
import type { EventoPublicoDetalleDTO, TandaResponseDTO } from "../../lib/types";

// El mapa (Leaflet) no aporta nada a estos tests y no corre en jsdom.
vi.mock("../../components/EventMap", () => ({ MapView: () => null }));

const EVENTO_BASE = {
  id: 1,
  nombre: "Fiesta de prueba",
  descripcion: null,
  fechaEvento: "2099-12-12",
  horaEvento: "22:00:00",
  lugar: "Club Demo",
  urlPublica: "fiesta",
  imagenPortadaUrl: null,
  latitud: null,
  longitud: null,
  maxEntradasPorCompra: 6,
} as unknown as EventoPublicoDetalleDTO;

function tanda(id: number, nombre: string, precio: number, cupoDisponible: number) {
  return { id, nombre, precio, cupoMaximo: 100, cupoDisponible } as unknown as TandaResponseDTO;
}

function Checkout() {
  const state = useLocation().state as { tanda: TandaResponseDTO; qty: number };
  return (
    <p>
      checkout: {state.tanda.nombre} x{state.qty}
    </p>
  );
}

function renderDetalle(evento: EventoPublicoDetalleDTO) {
  vi.spyOn(api, "get").mockResolvedValue(evento);
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={["/eventos/fiesta"]}>
        <Routes>
          <Route path="/eventos/:urlPublica" element={<DetailPage />} />
          <Route path="/checkout" element={<Checkout />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("DetailPage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("un evento sin tandas muestra que no hay entradas a la venta (no se queda cargando)", async () => {
    renderDetalle({ ...EVENTO_BASE, tandas: [] });
    expect(await screen.findByText("Este evento todavía no tiene entradas a la venta.")).toBeInTheDocument();
    expect(screen.getByText("Fiesta de prueba")).toBeInTheDocument();
  });

  it("arranca elegida la primera tanda con cupo, no una agotada", async () => {
    renderDetalle({ ...EVENTO_BASE, tandas: [tanda(1, "Anticipada", 8000, 0), tanda(2, "General", 12000, 50)] });
    const general = await screen.findByRole("radio", { name: /General/ });
    expect(general).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /Anticipada/ })).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Comprar entradas" })[0]).toBeEnabled();
  });

  it("todo agotado: lo dice y el botón lo explica", async () => {
    renderDetalle({ ...EVENTO_BASE, tandas: [tanda(1, "General", 12000, 0)] });
    expect(await screen.findByText("Las entradas para este evento están agotadas.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Entradas agotadas" })[0]).toBeDisabled();
  });

  it("pasa al checkout la tanda y la cantidad elegidas (mismo contrato de siempre)", async () => {
    const user = userEvent.setup();
    renderDetalle({ ...EVENTO_BASE, tandas: [tanda(1, "General", 12000, 50), tanda(2, "VIP", 25000, 10)] });
    await user.click(await screen.findByRole("radio", { name: /VIP/ }));
    await user.click(screen.getByRole("button", { name: "Agregar una entrada" }));
    await user.click(screen.getAllByRole("button", { name: "Comprar entradas" })[0]);
    expect(await screen.findByText("checkout: VIP x2")).toBeInTheDocument();
  });
});
