import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminEventsPage } from "./EventsPage";
import { DialogProvider } from "../../components/DialogProvider";
import { api } from "../../lib/api";
import type { EventoResponseDTO } from "../../lib/types";

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn(), patch: vi.fn(), delete: vi.fn() } };
});

const EVENTO = {
  id: 7,
  idOrganizador: 3,
  nombre: "Festival de Jazz",
  descripcion: null,
  fechaEvento: "2099-12-20",
  horaEvento: "21:00:00",
  lugar: "Anfiteatro",
  latitud: null,
  longitud: null,
  imagenPortadaUrl: null,
  estado: "Publicado",
  urlPublica: "jazz",
  fechaCreacion: "2026-01-01T00:00:00",
  fechaPublicacion: "2026-01-02T00:00:00",
  fechaCancelacion: null,
  tandas: [{ id: 1, idEvento: 7, nombre: "General", precio: 1000, cupoMaximo: 100, cupoDisponible: 90, fechaInicioVigencia: null, fechaFinVigencia: null }],
} as EventoResponseDTO;

function renderPage() {
  return render(
    <MemoryRouter>
      <DialogProvider>
        <AdminEventsPage />
      </DialogProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(api.get).mockResolvedValue([EVENTO]);
});

afterEach(() => {
  vi.mocked(api.get).mockReset();
  vi.mocked(api.patch).mockReset();
  vi.mocked(api.delete).mockReset();
});

async function abrirCancelar(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Acciones de Festival de Jazz" }));
  await user.click(screen.getByRole("menuitem", { name: "Cancelar evento" }));
  return screen.findByRole("alertdialog", { name: "Cancelar evento" });
}

describe("AdminEventsPage — cancelar evento", () => {
  it("pide confirmación avisando a quién afecta; 'No, volver' no cancela nada", async () => {
    const user = userEvent.setup();
    renderPage();

    const dialogo = await abrirCancelar(user);
    expect(within(dialogo).getByText(/Se avisa por email a los compradores y al organizador/)).toBeInTheDocument();
    await user.click(within(dialogo).getByRole("button", { name: "No, volver" }));

    expect(api.patch).not.toHaveBeenCalled();
  });

  it("al confirmar cancela el evento", async () => {
    const user = userEvent.setup();
    vi.mocked(api.patch).mockResolvedValueOnce({ ...EVENTO, estado: "Cancelado" });
    renderPage();

    const dialogo = await abrirCancelar(user);
    await user.click(within(dialogo).getByRole("button", { name: "Cancelar evento" }));

    expect(api.patch).toHaveBeenCalledWith("/admin/eventos/7/cancelar");
  });
});
