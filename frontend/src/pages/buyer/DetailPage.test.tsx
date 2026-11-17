import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DetailPage } from "./DetailPage";
import { api } from "../../lib/api";
import type { EventoPublicoDetalleDTO, TandaResponseDTO } from "../../lib/types";
import { ThemeProvider } from "../../lib/theme";

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn() } };
});

// Se fija solo la fecha (no los timers): sin esto, "cerrada"/"finalizado" dependería del día en que se corran los tests.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-10T12:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.mocked(api.get).mockReset();
});

function tanda(id: number, nombre: string, extra: Partial<TandaResponseDTO> = {}): TandaResponseDTO {
  return {
    id,
    idEvento: 1,
    nombre,
    precio: 1000,
    cupoMaximo: 50,
    cupoDisponible: 50,
    soloEmision: false,
    fechaInicioVigencia: null,
    fechaFinVigencia: null,
    ...extra,
  };
}

function evento(tandas: TandaResponseDTO[]): EventoPublicoDetalleDTO {
  return {
    id: 1,
    nombre: "Festival de Prueba",
    descripcion: null,
    fechaEvento: "2026-12-12",
    horaEvento: "21:00:00",
    lugar: "Un lugar",
    latitud: null,
    longitud: null,
    imagenPortadaUrl: null,
    urlPublica: "festival-de-prueba",
    tandas,
    maxEntradasPorCompra: 6,
    contactoWhatsapp: null,
    contactoEmail: null,
  };
}

async function renderPage(e: EventoPublicoDetalleDTO) {
  vi.mocked(api.get).mockResolvedValue(e);
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={["/eventos/festival-de-prueba"]}>
        <Routes>
          <Route path="/eventos/:urlPublica" element={<DetailPage />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
  await waitFor(() => expect(screen.getByText("Elegí tu tanda")).toBeInTheDocument());
}

// La pantalla repite el botón de compra (barra fija en mobile y panel en desktop).
const botonesCompra = (nombre: RegExp) => screen.getAllByRole("button", { name: nombre });

describe("DetailPage — venta de cada tanda", () => {
  it("con todas las tandas cerradas avisa y no deja avanzar al checkout", async () => {
    await renderPage(
      evento([
        tanda(1, "Anticipada 1", { fechaFinVigencia: "2026-10-29T23:59:59" }),
        tanda(2, "Anticipada 2", { fechaFinVigencia: "2026-11-06T23:59:59" }),
      ]),
    );

    expect(screen.getByText("La venta de entradas no está abierta en este momento.")).toBeInTheDocument();
    expect(screen.getAllByText("Venta cerrada")).toHaveLength(2);
    for (const boton of botonesCompra(/Venta no disponible/)) expect(boton).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Comprar entradas/ })).not.toBeInTheDocument();
  });

  it("preselecciona la primera tanda abierta, saltando las cerradas", async () => {
    await renderPage(
      evento([tanda(1, "Anticipada 1", { fechaFinVigencia: "2026-10-29T23:59:59" }), tanda(2, "General")]),
    );

    expect(screen.queryByText("La venta de entradas no está abierta en este momento.")).not.toBeInTheDocument();
    for (const boton of botonesCompra(/Comprar entradas/)) expect(boton).toBeEnabled();
    expect(screen.getAllByText("1 × General").length).toBeGreaterThan(0);
  });

  it("la tanda cerrada no se puede elegir y la agotada tampoco", async () => {
    await renderPage(
      evento([
        tanda(1, "Cerrada", { fechaFinVigencia: "2026-10-29T23:59:59" }),
        tanda(2, "Agotada", { cupoDisponible: 0 }),
        tanda(3, "Futura", { fechaInicioVigencia: "2026-11-20T00:00:00" }),
        tanda(4, "General"),
      ]),
    );

    expect(screen.getByRole("button", { name: /Cerrada/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Agotada/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Futura/ })).toBeDisabled();
    expect(screen.getByText("Venta aún no abierta")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /General/ })).toBeEnabled();
  });
});

describe("DetailPage — botón de arrepentimiento (8.8)", () => {
  it("muestra el botón que deriva al contacto del Organizador", async () => {
    await renderPage({ ...evento([tanda(1, "General")]), contactoWhatsapp: "5491155551234", contactoEmail: null });

    expect(await screen.findByRole("link", { name: /whatsapp/i })).toHaveAttribute(
      "href",
      expect.stringContaining("https://wa.me/5491155551234"),
    );
  });

  it("si el Organizador no cargó contacto, no muestra el botón", async () => {
    await renderPage(evento([tanda(1, "General")]));

    await screen.findByText("Festival de Prueba");
    expect(screen.queryByRole("link", { name: /whatsapp/i })).not.toBeInTheDocument();
  });
});
