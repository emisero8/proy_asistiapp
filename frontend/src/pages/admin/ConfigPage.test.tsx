import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminConfigPage } from "./ConfigPage";
import { DialogProvider } from "../../components/DialogProvider";
import { api } from "../../lib/api";

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } };
});

function renderPage() {
  return render(
    <DialogProvider>
      <AdminConfigPage />
    </DialogProvider>,
  );
}

beforeEach(() => {
  vi.mocked(api.get).mockImplementation(async (path: string) => (path === "/admin/paquetes-credito" ? [] : []));
});

afterEach(() => {
  vi.mocked(api.get).mockReset();
  vi.mocked(api.post).mockReset();
});

async function escribirAnuncio(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByPlaceholderText("Título (ej. Mantenimiento programado)"), "Mantenimiento");
  await user.type(screen.getByPlaceholderText("Mensaje"), "El sábado a la noche.");
  await user.click(screen.getByRole("button", { name: "Enviar anuncio" }));
  return screen.findByRole("dialog", { name: "Enviar anuncio" });
}

describe("AdminConfigPage — anuncio global", () => {
  it("pide confirmación antes de enviar a todos; 'No, volver' no envía", async () => {
    const user = userEvent.setup();
    renderPage();

    const dialogo = await escribirAnuncio(user);
    expect(within(dialogo).getByText(/a todos los usuarios activos/)).toBeInTheDocument();
    await user.click(within(dialogo).getByRole("button", { name: "No, volver" }));

    expect(api.post).not.toHaveBeenCalled();
  });

  it("al confirmar envía el anuncio con el mismo contrato", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValueOnce({ enviadas: 12 });
    renderPage();

    const dialogo = await escribirAnuncio(user);
    await user.click(within(dialogo).getByRole("button", { name: "Enviar" }));

    expect(api.post).toHaveBeenCalledWith("/admin/notificaciones", { titulo: "Mantenimiento", mensaje: "El sábado a la noche." });
  });
});
