import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toaster } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OrganizadorStaffMgmtPage } from "./StaffMgmtPage";
import { DialogProvider } from "../../components/DialogProvider";
import { api, ApiError } from "../../lib/api";
import type { EventoResponseDTO, StaffResponseDTO } from "../../lib/types";

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn(), post: vi.fn(), patch: vi.fn() } };
});

const EVENTO = { id: 5, nombre: "Festival de Jazz", estado: "Publicado" } as EventoResponseDTO;

const STAFF: StaffResponseDTO = {
  id: 9,
  nombre: "Martín Gómez",
  email: "martin@test.com",
  rol: "Staff_QR",
  estado: "Activo",
  idEvento: 5,
};

function renderPage() {
  return render(
    <DialogProvider>
      <Toaster />
      <OrganizadorStaffMgmtPage />
    </DialogProvider>,
  );
}

/** Responde a cada endpoint según la URL. `eventos` puede ser una lista o un error. */
function mockGets(eventos: EventoResponseDTO[] | Error, staff: StaffResponseDTO[] = [STAFF]) {
  vi.mocked(api.get).mockImplementation(async (path: string) => {
    if (path === "/organizador/staff") return staff;
    if (path === "/eventos") {
      if (eventos instanceof Error) throw eventos;
      return eventos;
    }
    throw new Error(`GET inesperado: ${path}`);
  });
}

async function abrirFormulario(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Agregar miembro de staff" }));
}

afterEach(() => {
  vi.mocked(api.get).mockReset();
  vi.mocked(api.post).mockReset();
  vi.mocked(api.patch).mockReset();
});

describe("OrganizadorStaffMgmtPage — selector de evento", () => {
  it("lista los eventos en el selector y no muestra ningún aviso de error", async () => {
    const user = userEvent.setup();
    mockGets([EVENTO]);
    renderPage();
    await abrirFormulario(user);

    expect(screen.getByRole("option", { name: "Festival de Jazz" })).toBeInTheDocument();
    expect(screen.queryByText(/No pudimos cargar tus eventos/)).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeEnabled();
  });

  it("si falla la carga de eventos lo avisa (en vez de dejar el selector vacío sin explicación) y lo deshabilita", async () => {
    const user = userEvent.setup();
    mockGets(new Error("network down"));
    renderPage();
    await abrirFormulario(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar tus eventos");
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("'Reintentar' vuelve a pedir los eventos y, si ahora anda, saca el aviso y llena el selector", async () => {
    const user = userEvent.setup();
    mockGets(new Error("network down"));
    renderPage();
    await abrirFormulario(user);
    await screen.findByRole("alert");

    mockGets([EVENTO]); // el backend se recuperó
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(screen.getByRole("combobox")).toBeEnabled();
    expect(screen.getByRole("option", { name: "Festival de Jazz" })).toBeInTheDocument();
  });

  it("si reintentar vuelve a fallar, el aviso sigue ahí", async () => {
    const user = userEvent.setup();
    mockGets(new Error("network down"));
    renderPage();
    await abrirFormulario(user);
    await screen.findByRole("alert");

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar tus eventos");
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("el fallo al cargar eventos no rompe el listado de staff", async () => {
    mockGets(new Error("network down"));
    renderPage();

    expect(await screen.findByText("Martín Gómez")).toBeInTheDocument();
  });
});

describe("OrganizadorStaffMgmtPage — resetear contraseña", () => {
  it("pide confirmación y, si se cancela, no toca la API", async () => {
    const user = userEvent.setup();
    mockGets([EVENTO]);
    renderPage();
    await screen.findByText("Martín Gómez");

    await user.click(screen.getByTitle("Resetear contraseña"));
    const dialogo = await screen.findByRole("dialog", { name: "Generar contraseña nueva" });
    expect(within(dialogo).getByText(/La anterior deja de funcionar/)).toBeInTheDocument();
    await user.click(within(dialogo).getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("al confirmar genera la contraseña y la muestra en un diálogo con botón para copiarla", async () => {
    const user = userEvent.setup();
    mockGets([EVENTO]);
    vi.mocked(api.post).mockResolvedValueOnce({ passwordTemporal: "x7Kq92mPzA" });
    renderPage();
    await screen.findByText("Martín Gómez");

    await user.click(screen.getByTitle("Resetear contraseña"));
    await user.click(within(await screen.findByRole("dialog", { name: "Generar contraseña nueva" })).getByRole("button", { name: "Generar" }));

    const alerta = await screen.findByRole("dialog", { name: "Contraseña temporal" });
    expect(api.post).toHaveBeenCalledWith("/organizador/staff/9/resetear-password");
    expect(within(alerta).getByText("x7Kq92mPzA")).toBeInTheDocument();
    expect(within(alerta).getByText(/martin@test.com/)).toBeInTheDocument();

    await user.click(within(alerta).getByRole("button", { name: "Copiar" }));
    expect(await within(alerta).findByRole("button", { name: "Copiado" })).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toBe("x7Kq92mPzA");

    await user.click(within(alerta).getByRole("button", { name: "Entendido" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("si el backend falla no muestra ninguna contraseña y avisa del error", async () => {
    const user = userEvent.setup();
    mockGets([EVENTO]);
    vi.mocked(api.post).mockRejectedValueOnce(
      new ApiError({ status: 403, error: "Ese staff no te pertenece", path: "/x", timestamp: "2026-01-01T00:00:00" }),
    );
    renderPage();
    await screen.findByText("Martín Gómez");

    await user.click(screen.getByTitle("Resetear contraseña"));
    await user.click(within(await screen.findByRole("dialog", { name: "Generar contraseña nueva" })).getByRole("button", { name: "Generar" }));

    expect(await screen.findAllByText("Ese staff no te pertenece")).not.toHaveLength(0);
    expect(screen.queryByRole("dialog", { name: "Contraseña temporal" })).not.toBeInTheDocument();
  });
});
