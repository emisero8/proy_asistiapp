import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { api } from "../../lib/api";
import { ThemeProvider } from "../../lib/theme";
import { MiEntradaPage } from "./MiEntradaPage";
import type { EntradaResponseDTO } from "../../lib/types";

const BASE = {
  id: 10,
  codigoQr: "AST-ABC123",
  estado: "Pagada",
  nombreEvento: "Fiesta de prueba",
  nombreTanda: "General",
  precioTanda: 12000,
  nombreComprador: "María García",
  emailComprador: "maria@test.com",
  fechaCompra: "2026-11-10T20:00:00",
  fechaUso: null,
  motivoAnulacion: null,
  reembolsadaEn: null,
} as unknown as EntradaResponseDTO;

function renderEntrada(entrada: EntradaResponseDTO) {
  vi.spyOn(api, "get").mockImplementation((path: string) =>
    path.startsWith("/tickets/by-codigo") ? Promise.resolve(entrada) : Promise.reject(new Error("no aplica")),
  );
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={["/mi-entrada?codigoQr=AST-ABC123"]}>
        <MiEntradaPage />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("MiEntradaPage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("una entrada vigente se muestra como válida, sin avisos", async () => {
    renderEntrada(BASE);
    expect(await screen.findByText("Válida")).toBeInTheDocument();
    expect(screen.queryByText("Esta entrada fue anulada")).not.toBeInTheDocument();
  });

  it("una entrada anulada por el Organizador lo dice, con el motivo y si se devolvió el pago (8.6)", async () => {
    renderEntrada({ ...BASE, estado: "Anulada", motivoAnulacion: "Evento reprogramado", reembolsadaEn: "2026-11-12T10:00:00" });
    expect(await screen.findByText("Esta entrada fue anulada")).toBeInTheDocument();
    expect(screen.getByText(/Evento reprogramado/)).toBeInTheDocument();
    expect(screen.getByText(/Te devolvimos el pago/)).toBeInTheDocument();
    expect(screen.getByText("Anulada")).toBeInTheDocument();
    expect(screen.queryByText("Válida")).not.toBeInTheDocument();
  });
});
