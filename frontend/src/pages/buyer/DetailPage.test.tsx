import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  it("un evento finalizado se muestra como tal, sin nada para comprar", async () => {
    renderDetalle({ ...EVENTO_BASE, fechaEvento: "2020-01-01", finalizado: true, tandas: [tanda(1, "General", 12000, 50)] });
    expect(await screen.findByText("Evento finalizado")).toBeInTheDocument();
    expect(screen.getByText("Este evento ya finalizó: no se pueden comprar entradas.")).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Comprar|Venta cerrada/ })).not.toBeInTheDocument();
  });

  it("un evento que ya empezó pero no finalizó se sigue vendiendo", async () => {
    renderDetalle({ ...EVENTO_BASE, fechaEvento: "2020-01-01", finalizado: false, tandas: [tanda(1, "General", 12000, 50)] });
    expect(await screen.findByText("Entradas disponibles")).toBeInTheDocument();
    expect(screen.queryByText("Evento finalizado")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Comprar entradas" })[0]).toBeEnabled();
  });

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

/** Tanda con ventana de venta, para las pruebas de "cerrada"/"próximamente". */
function tandaConVentana(id: number, nombre: string, extra: Partial<TandaResponseDTO> = {}): TandaResponseDTO {
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

describe("DetailPage — venta de cada tanda", () => {
  // Se fija solo la fecha (no los timers): sin esto, "cerrada" dependería del día en que se corran los tests.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-10T12:00:00"));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const EVENTO_NOV = { ...EVENTO_BASE, fechaEvento: "2026-12-12" } as EventoPublicoDetalleDTO;

  it("con todas las tandas cerradas avisa y no deja avanzar al checkout", async () => {
    renderDetalle({
      ...EVENTO_NOV,
      tandas: [
        tandaConVentana(1, "Anticipada 1", { fechaFinVigencia: "2026-10-29T23:59:59" }),
        tandaConVentana(2, "Anticipada 2", { fechaFinVigencia: "2026-11-06T23:59:59" }),
      ],
    });

    expect(await screen.findByText("La venta de entradas para este evento ya cerró.")).toBeInTheDocument();
    for (const boton of screen.getAllByRole("button", { name: "Venta cerrada" })) expect(boton).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Comprar entradas" })).not.toBeInTheDocument();
  });

  it("preselecciona la primera tanda abierta, saltando las cerradas", async () => {
    renderDetalle({
      ...EVENTO_NOV,
      tandas: [tandaConVentana(1, "Anticipada 1", { fechaFinVigencia: "2026-10-29T23:59:59" }), tandaConVentana(2, "General")],
    });

    expect(await screen.findByRole("radio", { name: /General/ })).toHaveAttribute("aria-checked", "true");
    for (const boton of screen.getAllByRole("button", { name: "Comprar entradas" })) expect(boton).toBeEnabled();
  });

  it("la tanda cerrada no se puede elegir, la agotada tampoco, y la futura dice que todavía no abrió", async () => {
    renderDetalle({
      ...EVENTO_NOV,
      tandas: [
        tandaConVentana(1, "Cerrada", { fechaFinVigencia: "2026-10-29T23:59:59" }),
        tandaConVentana(2, "Agotada", { cupoDisponible: 0 }),
        tandaConVentana(3, "Futura", { fechaInicioVigencia: "2026-11-20T00:00:00" }),
        tandaConVentana(4, "General"),
      ],
    });

    expect(await screen.findByRole("radio", { name: /Cerrada/ })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /Agotada/ })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /Futura/ })).toBeDisabled();
    expect(screen.getByText("Próximamente")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /General/ })).toBeEnabled();
  });
});

describe("DetailPage — botón de arrepentimiento (8.8)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("muestra el botón que deriva al contacto del Organizador", async () => {
    renderDetalle({ ...EVENTO_BASE, tandas: [tanda(1, "General", 12000, 50)], contactoWhatsapp: "5491155551234", contactoEmail: null });

    expect(await screen.findByRole("link", { name: /whatsapp/i })).toHaveAttribute(
      "href",
      expect.stringContaining("https://wa.me/5491155551234"),
    );
  });

  it("si el Organizador no cargó contacto, no muestra el botón", async () => {
    renderDetalle({ ...EVENTO_BASE, tandas: [tanda(1, "General", 12000, 50)], contactoWhatsapp: null, contactoEmail: null });

    await screen.findByRole("radio", { name: /General/ });
    expect(screen.queryByRole("link", { name: /whatsapp/i })).not.toBeInTheDocument();
    expect(screen.queryByText("¿Te arrepentiste de tu compra?")).not.toBeInTheDocument();
  });
});
