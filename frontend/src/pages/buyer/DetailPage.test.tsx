import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { api } from "../../lib/api";
import { DetailPage } from "./DetailPage";
import type { EventoPublicoDetalleDTO } from "../../lib/types";

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

function renderDetalle(evento: EventoPublicoDetalleDTO) {
  vi.spyOn(api, "get").mockResolvedValue(evento);
  render(
    <MemoryRouter initialEntries={["/eventos/fiesta"]}>
      <Routes>
        <Route path="/eventos/:urlPublica" element={<DetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("DetailPage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("un evento sin tandas muestra que no hay entradas a la venta (no se queda cargando)", async () => {
    renderDetalle({ ...EVENTO_BASE, tandas: [] });
    expect(await screen.findByText("Este evento todavía no tiene entradas a la venta.")).toBeInTheDocument();
    expect(screen.getByText("Fiesta de prueba")).toBeInTheDocument();
  });
});
