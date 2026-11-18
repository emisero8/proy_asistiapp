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
vi.mock("./CuentaMercadoPagoCard", () => ({ CuentaMercadoPagoCard: () => null }));
vi.mock("../../lib/auth", () => ({
  useAuth: () => ({ session: { id: 1, nombre: "Ana", email: "ana@demo.com", rol: "Organizador", token: "t", tipo: "Bearer" }, login }),
}));

const PERFIL: PerfilResponseDTO = {
  id: 1,
  nombre: "Ana",
  email: "ana@demo.com",
  fotoPerfilUrl: null,
  maxEntradasPorComprador: null,
  maxEntradasPorCompradorPlataforma: 6,
  contactoWhatsapp: null,
  contactoEmail: null,
  trasladarCargoMp: false,
  plazoLiberacionMp: "AlInstante",
  zonaComisionMp: "General",
  porcentajeCargoComprador: 8.24,
};

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

describe("OrganizadorPerfilPage — entradas por persona (8.9)", () => {
  it("sin tope propio muestra el de la plataforma como el que rige", async () => {
    await cargar();

    expect(screen.getByLabelText("Máximo de entradas por persona")).toHaveValue(null);
    expect(screen.getByText(/Hoy rige el de la plataforma: 6/)).toBeInTheDocument();
  });

  it("con tope propio lo muestra cargado", async () => {
    vi.mocked(api.get).mockResolvedValue({ ...PERFIL, maxEntradasPorComprador: 4 });
    await cargar();

    expect(screen.getByLabelText("Máximo de entradas por persona")).toHaveValue(4);
    expect(screen.queryByText(/Hoy rige el de la plataforma/)).not.toBeInTheDocument();
  });

  it("guarda el tope nuevo", async () => {
    await cargar();
    vi.mocked(api.put).mockResolvedValueOnce({ ...PERFIL, maxEntradasPorComprador: 10 });

    await userEvent.type(screen.getByLabelText("Máximo de entradas por persona"), "10");
    await userEvent.click(screen.getByRole("button", { name: "Guardar tope" }));

    expect(api.put).toHaveBeenCalledWith("/organizador/perfil/tope-comprador", { maxEntradasPorComprador: 10 });
    expect(await screen.findByText("Tu tope es de 10 entradas por persona.")).toBeInTheDocument();
  });

  it("dejándolo vacío vuelve al de la plataforma (manda null)", async () => {
    vi.mocked(api.get).mockResolvedValue({ ...PERFIL, maxEntradasPorComprador: 4 });
    await cargar();
    vi.mocked(api.put).mockResolvedValueOnce(PERFIL);

    await userEvent.clear(screen.getByLabelText("Máximo de entradas por persona"));
    await userEvent.click(screen.getByRole("button", { name: "Guardar tope" }));

    expect(api.put).toHaveBeenCalledWith("/organizador/perfil/tope-comprador", { maxEntradasPorComprador: null });
    expect(await screen.findByText(/Hoy rige el de la plataforma: 6/)).toBeInTheDocument();
  });

  it.each(["0", "101", "2.5"])("rechaza %s sin llamar a la API", async (valor) => {
    await cargar();

    await userEvent.type(screen.getByLabelText("Máximo de entradas por persona"), valor);
    await userEvent.click(screen.getByRole("button", { name: "Guardar tope" }));

    expect(screen.getByText("El tope tiene que ser un número entero entre 1 y 100.")).toBeInTheDocument();
    expect(api.put).not.toHaveBeenCalled();
  });

  it("si el backend lo rechaza muestra el motivo", async () => {
    await cargar();
    vi.mocked(api.put).mockRejectedValueOnce(
      new ApiError({ status: 400, error: "El tope no puede superar 100", path: "/x", timestamp: "2026-01-01T00:00:00" }),
    );

    await userEvent.type(screen.getByLabelText("Máximo de entradas por persona"), "50");
    await userEvent.click(screen.getByRole("button", { name: "Guardar tope" }));

    expect(await screen.findByText("El tope no puede superar 100")).toBeInTheDocument();
  });
});

describe("OrganizadorPerfilPage — contacto para el arrepentimiento (8.8)", () => {
  it("muestra el contacto ya cargado", async () => {
    vi.mocked(api.get).mockResolvedValue({ ...PERFIL, contactoWhatsapp: "5491155551234", contactoEmail: "hola@evento.com" });
    await cargar();

    expect(screen.getByLabelText("WhatsApp de contacto")).toHaveValue("5491155551234");
    expect(screen.getByLabelText("Email de contacto")).toHaveValue("hola@evento.com");
  });

  it("sin contacto avisa que hace falta uno para publicar", async () => {
    await cargar();

    expect(screen.getByText(/para publicar/i)).toBeInTheDocument();
  });

  it("guarda el contacto nuevo", async () => {
    await cargar();
    vi.mocked(api.put).mockResolvedValueOnce({ ...PERFIL, contactoWhatsapp: "5491155551234", contactoEmail: null });
    await userEvent.type(screen.getByLabelText("WhatsApp de contacto"), "+54 9 11 5555-1234");

    await userEvent.click(screen.getByRole("button", { name: "Guardar contacto" }));

    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith("/organizador/perfil/contacto", {
        contactoWhatsapp: "+54 9 11 5555-1234",
        contactoEmail: null,
      }),
    );
    await waitFor(() => expect(screen.getByLabelText("WhatsApp de contacto")).toHaveValue("5491155551234"));
  });

  it("muestra el error del backend si el contacto no es válido", async () => {
    await cargar();
    vi.mocked(api.put).mockRejectedValueOnce(new ApiError({ status: 409, error: "El email de contacto no es válido", path: "/organizador/perfil/contacto", timestamp: "" }));
    await userEvent.type(screen.getByLabelText("Email de contacto"), "mal");

    await userEvent.click(screen.getByRole("button", { name: "Guardar contacto" }));

    expect(await screen.findByText("El email de contacto no es válido")).toBeInTheDocument();
  });
});
