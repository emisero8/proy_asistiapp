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
  fechaEvento: "2026-12-05",
  horaEvento: "22:30:00",
  lugarEvento: "Club Central",
  imagenPortadaUrl: null,
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

  it("ofrece descargar, compartir y copiar el código, y muestra el número de entrada", async () => {
    renderEntrada(BASE);
    expect(await screen.findByRole("button", { name: /Descargar entrada/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Compartir/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copiar código/ })).toBeInTheDocument();
    expect(screen.getByText("000010")).toBeInTheDocument();
  });

  it("muestra fecha, hora y lugar del evento, y el titular con la primera letra en mayúscula", async () => {
    renderEntrada({ ...BASE, nombreComprador: "maría GARCÍA" });
    expect(await screen.findByText("Club Central")).toBeInTheDocument();
    expect(screen.getByText("22:30 hs")).toBeInTheDocument();
    expect(screen.getByText(/5 dic 2026/)).toBeInTheDocument();
    expect(screen.getByText("María García")).toBeInTheDocument();
  });

  it("si el evento no tiene portada no rompe, y si la tiene la usa", async () => {
    renderEntrada({ ...BASE, imagenPortadaUrl: "https://img.test/p.jpg" });
    await screen.findByText("Válida");
    expect(document.querySelector('img[src="https://img.test/p.jpg"]')).not.toBeNull();
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
