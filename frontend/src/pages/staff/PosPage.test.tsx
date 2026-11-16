import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StaffPosPage } from "./PosPage";
import { api } from "../../lib/api";
import { ThemeProvider } from "../../lib/theme";
import type { EventoResponseDTO } from "../../lib/types";

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn(), post: vi.fn() } };
});
vi.mock("../../lib/auth", () => ({
  useAuth: () => ({ session: { id: 9, nombre: "Vera Vendedora", rol: "Staff_Vendedor" }, logout: vi.fn() }),
}));

const tanda = (id: number, nombre: string, disp: number) => ({
  id, idEvento: 1, nombre, precio: 1000, cupoMaximo: 100, cupoDisponible: disp, fechaInicioVigencia: null, fechaFinVigencia: null,
});

const EVENTO = {
  id: 1, idOrganizador: 2, nombre: "Fiesta", descripcion: null, fechaEvento: "2099-01-01", horaEvento: "21:00:00", lugar: "Club",
  latitud: null, longitud: null, imagenPortadaUrl: null, estado: "Publicado", urlPublica: "fiesta",
  fechaCreacion: "2026-01-01T00:00:00", fechaPublicacion: null, fechaCancelacion: null,
  tandas: [tanda(1, "Anticipada", 0), tanda(2, "General", 40)],
} as EventoResponseDTO;

afterEach(() => vi.mocked(api.get).mockReset());

describe("StaffPosPage", () => {
  it("arranca con la primera tanda con cupo, no con una agotada", async () => {
    vi.mocked(api.get).mockImplementation(async (path: string) =>
      path === "/eventos/vendedor" ? [EVENTO] : { limite: 6, yaCompradas: 0, disponible: 6 },
    );
    render(
      <ThemeProvider>
        <StaffPosPage />
      </ThemeProvider>,
    );

    expect((await screen.findAllByText("1 × General")).length).toBeGreaterThan(0);
    expect(screen.queryByText("1 × Anticipada")).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /General/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /Anticipada/ })).toBeDisabled();
  });
});
