import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toaster } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminUsersPage } from "./UsersPage";
import { api } from "../../lib/api";
import type { UsuarioResponseDTO } from "../../lib/types";

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn(), patch: vi.fn(), delete: vi.fn() } };
});

const USUARIO: UsuarioResponseDTO = {
  id: 7,
  nombre: "Marta Suspendible",
  email: "marta@test.com",
  rol: "Organizador",
  estado: "Activo",
  fechaCreacion: "2026-01-01T00:00:00",
};

function renderPage() {
  return render(
    <>
      <Toaster />
      <AdminUsersPage />
    </>,
  );
}

/** Promesa que se resuelve manualmente — para poder observar el estado de carga antes de que llegue la data. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe("AdminUsersPage", () => {
  afterEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.patch).mockReset();
    vi.mocked(api.delete).mockReset();
  });

  it("muestra un skeleton mientras carga y después la tabla con los usuarios", async () => {
    const { promise, resolve } = deferred<UsuarioResponseDTO[]>();
    vi.mocked(api.get).mockReturnValueOnce(promise);

    const { container } = renderPage();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(screen.queryByText("Marta Suspendible")).not.toBeInTheDocument();

    resolve([USUARIO]);

    await waitFor(() => expect(screen.getByText("Marta Suspendible")).toBeInTheDocument());
    expect(container.querySelectorAll(".animate-pulse").length).toBe(0);
  });

  it("suspende un usuario activo y muestra el toast de confirmación", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValueOnce([USUARIO]);
    vi.mocked(api.patch).mockResolvedValueOnce({ ...USUARIO, estado: "Suspendido" });

    renderPage();
    await screen.findByText("Marta Suspendible");

    const fila = screen.getByText("Marta Suspendible").closest("tr")!;
    await user.click(within(fila).getByRole("button", { name: "···" }));
    await user.click(screen.getByRole("button", { name: /suspender/i }));

    expect(api.patch).toHaveBeenCalledWith("/admin/usuarios/7/suspender");
    await waitFor(() => expect(within(fila).getByText("Suspendido")).toBeInTheDocument());
    expect(await screen.findByText("Marta Suspendible suspendido")).toBeInTheDocument();
  });

  it("filtra por texto de búsqueda", async () => {
    const user = userEvent.setup();
    const otro: UsuarioResponseDTO = { ...USUARIO, id: 8, nombre: "Otro Usuario", email: "otro@test.com" };
    vi.mocked(api.get).mockResolvedValueOnce([USUARIO, otro]);

    renderPage();
    await screen.findByText("Marta Suspendible");
    expect(screen.getByText("Otro Usuario")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Buscar por nombre o email..."), "marta");
    expect(screen.getByText("Marta Suspendible")).toBeInTheDocument();
    expect(screen.queryByText("Otro Usuario")).not.toBeInTheDocument();
  });

  it("muestra el mensaje de error si falla la carga inicial", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error("network down"));
    renderPage();
    expect(await screen.findByText("No pudimos cargar los usuarios.")).toBeInTheDocument();
  });
});
