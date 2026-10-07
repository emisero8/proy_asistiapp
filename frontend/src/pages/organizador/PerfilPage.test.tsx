import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrganizadorPerfilPage } from "./PerfilPage";
import { api, ApiError } from "../../lib/api";
import type { PerfilResponseDTO } from "../../lib/types";

const login = vi.hoisted(() => vi.fn());

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn(), put: vi.fn(), upload: vi.fn() } };
});
vi.mock("../../lib/auth", () => ({
  useAuth: () => ({ session: { id: 1, nombre: "Ana", email: "ana@demo.com", rol: "Organizador", token: "t", tipo: "Bearer" }, login }),
}));

const PERFIL: PerfilResponseDTO = { id: 1, nombre: "Ana", email: "ana@demo.com", fotoPerfilUrl: null };

beforeEach(() => {
  vi.mocked(api.get).mockResolvedValue(PERFIL);
});

afterEach(() => {
  vi.clearAllMocks();
});

async function cargar() {
  render(<OrganizadorPerfilPage />);
  await screen.findByDisplayValue("Ana");
}

describe("OrganizadorPerfilPage — datos", () => {
  it("carga el perfil y muestra el email como solo lectura", async () => {
    await cargar();

    expect(api.get).toHaveBeenCalledWith("/organizador/perfil");
    expect(screen.getByDisplayValue("ana@demo.com")).toBeDisabled();
  });

  it("no guarda un nombre vacío", async () => {
    await cargar();
    const nombre = screen.getByLabelText("Nombre");
    await userEvent.clear(nombre);

    await userEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(screen.getByText("El nombre es obligatorio.")).toBeInTheDocument();
    expect(api.put).not.toHaveBeenCalled();
  });

  it("guarda nombre y foto, y actualiza la sesión para que la sidebar cambie sin volver a entrar", async () => {
    await cargar();
    vi.mocked(api.put).mockResolvedValueOnce({ ...PERFIL, nombre: "Ana Lucía" });
    await userEvent.clear(screen.getByLabelText("Nombre"));
    await userEvent.type(screen.getByLabelText("Nombre"), "Ana Lucía");

    await userEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith("/organizador/perfil", { nombre: "Ana Lucía", fotoPerfilUrl: null }),
    );
    await waitFor(() => expect(login).toHaveBeenCalledWith(expect.objectContaining({ nombre: "Ana Lucía" })));
  });
});

describe("OrganizadorPerfilPage — contraseña", () => {
  async function completar(actual: string, nueva: string, confirmacion: string) {
    if (actual) await userEvent.type(screen.getByLabelText("Contraseña actual"), actual);
    if (nueva) await userEvent.type(screen.getByLabelText("Nueva contraseña"), nueva);
    if (confirmacion) await userEvent.type(screen.getByLabelText("Repetir la nueva contraseña"), confirmacion);
    await userEvent.click(screen.getByRole("button", { name: /^cambiar contraseña$/i }));
  }

  it("exige la contraseña actual", async () => {
    await cargar();
    await completar("", "Nueva1234", "Nueva1234");
    expect(screen.getByText("Ingresá tu contraseña actual.")).toBeInTheDocument();
    expect(api.put).not.toHaveBeenCalled();
  });

  it("exige al menos 8 caracteres en la nueva", async () => {
    await cargar();
    await completar("Actual1234", "corta", "corta");
    expect(screen.getByText("La nueva contraseña debe tener al menos 8 caracteres.")).toBeInTheDocument();
    expect(api.put).not.toHaveBeenCalled();
  });

  it("avisa si la repetición no coincide", async () => {
    await cargar();
    await completar("Actual1234", "Nueva1234", "Otra12345");
    expect(screen.getByText("La confirmación no coincide con la nueva contraseña.")).toBeInTheDocument();
    expect(api.put).not.toHaveBeenCalled();
  });

  it("muestra el error del backend si la actual es incorrecta", async () => {
    await cargar();
    vi.mocked(api.put).mockRejectedValueOnce(new ApiError({ status: 409, error: "La contraseña actual no es correcta", path: "/organizador/perfil/password", timestamp: "" }));
    await completar("Mal12345", "Nueva1234", "Nueva1234");
    expect(await screen.findByText("La contraseña actual no es correcta")).toBeInTheDocument();
  });

  it("con datos válidos llama al endpoint y limpia los campos", async () => {
    await cargar();
    vi.mocked(api.put).mockResolvedValueOnce(undefined);
    await completar("Actual1234", "Nueva1234", "Nueva1234");

    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith("/organizador/perfil/password", {
        passwordActual: "Actual1234",
        passwordNueva: "Nueva1234",
      }),
    );
    await waitFor(() => expect(screen.getByLabelText("Contraseña actual")).toHaveValue(""));
  });
});
