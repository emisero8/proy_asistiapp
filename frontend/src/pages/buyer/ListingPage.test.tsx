import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { api } from "../../lib/api";
import { ThemeProvider } from "../../lib/theme";
import { ListingPage } from "./ListingPage";
import type { EventoPublicoListItemDTO } from "../../lib/types";

function evento(i: number): EventoPublicoListItemDTO {
  return {
    id: i,
    nombre: `Evento ${i}`,
    fechaEvento: `2099-01-${String(i).padStart(2, "0")}`,
    horaEvento: "22:00:00",
    lugar: "Club",
    imagenPortadaUrl: null,
    urlPublica: `evento-${i}`,
    precioDesde: 1000,
    cantidadTandas: 2,
    cupoDisponibleTotal: 50,
    cupoTotal: 100,
  };
}

function renderHome(eventos: EventoPublicoListItemDTO[] | Error) {
  vi.spyOn(api, "get").mockImplementation((path: string) => {
    if (path === "/public/eventos") return eventos instanceof Error ? Promise.reject(eventos) : Promise.resolve(eventos);
    return Promise.reject(new Error("no aplica"));
  });
  render(
    <ThemeProvider>
      <MemoryRouter>
        <ListingPage />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

/** Nombres de los eventos enlazados en la sección de eventos (cada tarjeta es un link). */
async function eventosMostrados() {
  const seccion = await screen.findByRole("region", { name: "Próximos eventos" });
  await within(seccion).findAllByRole("link", { name: /Evento \d+/ });
  return within(seccion)
    .getAllByRole("link", { name: /Evento \d+/ })
    .map((a) => a.getAttribute("href"));
}

describe("ListingPage (Home)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("no repite eventos entre el carrusel y la grilla", async () => {
    renderHome(Array.from({ length: 10 }, (_, i) => evento(i + 1)));
    const hrefs = await eventosMostrados();
    expect(hrefs).toHaveLength(10);
    expect(new Set(hrefs).size).toBe(10);
  });

  it("con pocos eventos muestra una sola grilla, sin carrusel", async () => {
    renderHome([evento(1), evento(2), evento(3)]);
    expect(await eventosMostrados()).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Eventos siguientes" })).not.toBeInTheDocument();
  });

  it("las tarjetas son links al detalle (se pueden abrir en otra pestaña)", async () => {
    renderHome([evento(1)]);
    expect(await eventosMostrados()).toEqual(["/eventos/evento-1"]);
  });

  it("si la carga falla ofrece reintentar", async () => {
    renderHome(new Error("caído"));
    expect(await screen.findByText("No pudimos cargar los eventos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("sin eventos publicados lo dice", async () => {
    renderHome([]);
    expect(await screen.findByText("Todavía no hay eventos publicados")).toBeInTheDocument();
  });
});
