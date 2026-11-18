import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { api } from "../../lib/api";
import { ThemeProvider } from "../../lib/theme";
import { AllEventsPage } from "./AllEventsPage";
import type { EventoPublicoListItemDTO } from "../../lib/types";

function evento(i: number, nombre = `Evento ${i}`, lugar = "Club Centro"): EventoPublicoListItemDTO {
  return {
    id: i,
    nombre,
    fechaEvento: `2099-02-${String((i % 27) + 1).padStart(2, "0")}`,
    horaEvento: "22:00:00",
    lugar,
    imagenPortadaUrl: null,
    urlPublica: `evento-${i}`,
    precioDesde: 1000,
    cantidadTandas: 2,
    cupoDisponibleTotal: 50,
    cupoTotal: 100,
  };
}

function renderCatalogo(eventos: EventoPublicoListItemDTO[]) {
  vi.spyOn(api, "get").mockResolvedValue(eventos);
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={["/eventos"]}>
        <AllEventsPage />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("AllEventsPage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("busca por nombre o lugar y anuncia la cantidad encontrada", async () => {
    const user = userEvent.setup();
    renderCatalogo([evento(1, "Rock en el parque"), evento(2, "Fiesta electrónica", "Club Norte"), evento(3, "Jazz", "Club Norte")]);
    expect(await screen.findByText("3 eventos")).toBeInTheDocument();
    await user.type(screen.getByRole("searchbox", { name: /Buscar/ }), "norte");
    expect(screen.getByText("2 eventos encontrados")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Rock en el parque/ })).not.toBeInTheDocument();
  });

  it("los filtros de fecha indican cuál está activo (aria-pressed)", async () => {
    const user = userEvent.setup();
    renderCatalogo([evento(1)]);
    await screen.findByText("1 evento");
    expect(screen.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Hoy" }));
    expect(screen.getByRole("button", { name: "Hoy" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "false");
  });

  it("sin resultados ofrece limpiar los filtros, y limpiarlos vuelve a mostrar todo", async () => {
    const user = userEvent.setup();
    renderCatalogo([evento(1), evento(2)]);
    await screen.findByText("2 eventos");
    await user.type(screen.getByRole("searchbox", { name: /Buscar/ }), "no existe");
    expect(screen.getByText("No encontramos eventos con esos filtros")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(screen.getByText("2 eventos")).toBeInTheDocument();
  });

  it("pagina de a 16 y marca la página actual", async () => {
    const user = userEvent.setup();
    renderCatalogo(Array.from({ length: 20 }, (_, i) => evento(i + 1)));
    await screen.findByText("20 eventos");
    expect(screen.getByRole("button", { name: "Página 1" })).toHaveAttribute("aria-current", "page");
    await user.click(screen.getByRole("button", { name: "Página 2" }));
    expect(screen.getByRole("button", { name: "Página 2" })).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link", { name: /Evento \d+/ })).toHaveLength(4);
  });
});
