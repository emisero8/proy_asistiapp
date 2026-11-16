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

const PACK = { id: 4, nombre: "Pro", cantidadCreditos: 300, precio: 120000, estado: "Activo" };

beforeEach(() => {
  vi.mocked(api.get).mockImplementation(async (path: string) => (path === "/admin/paquetes-credito" ? [PACK] : []));
});

afterEach(() => {
  vi.mocked(api.get).mockReset();
  vi.mocked(api.post).mockReset();
  vi.mocked(api.put).mockReset();
  vi.mocked(api.patch).mockReset();
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

describe("AdminConfigPage — paquetes", () => {
  it("el precio se edita con teclado: un valor inválido avisa y Enter guarda con el mismo contrato", async () => {
    const user = userEvent.setup();
    vi.mocked(api.put).mockResolvedValueOnce({ ...PACK, precio: 150000 });
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Editar el precio de Pro" }));
    const campo = screen.getByLabelText("Precio de Pro");
    expect(campo).toHaveFocus();

    await user.clear(campo);
    await user.type(campo, "0{Enter}");
    expect(screen.getByText("Ingresá un precio mayor a 0.")).toBeInTheDocument();
    expect(api.put).not.toHaveBeenCalled();

    await user.clear(campo);
    await user.type(campo, "150000{Enter}");
    expect(api.put).toHaveBeenCalledWith("/admin/paquetes-credito/4", { nombre: "Pro", cantidadCreditos: 300, precio: 150000 });
  });

  it("Escape cancela la edición sin guardar", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Editar el precio de Pro" }));
    await user.keyboard("{Escape}");

    expect(screen.queryByLabelText("Precio de Pro")).not.toBeInTheDocument();
    expect(api.put).not.toHaveBeenCalled();
  });

  it("la disponibilidad es un switch con nombre: apagarlo deshabilita el paquete", async () => {
    const user = userEvent.setup();
    vi.mocked(api.patch).mockResolvedValueOnce({ ...PACK, estado: "Deshabilitado" });
    renderPage();

    const sw = await screen.findByRole("switch", { name: "Paquete Pro disponible" });
    expect(sw).toHaveAttribute("aria-checked", "true");
    await user.click(sw);

    expect(api.patch).toHaveBeenCalledWith("/admin/paquetes-credito/4/deshabilitar");
  });
});
