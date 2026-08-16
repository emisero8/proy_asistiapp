import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StaffLoginPage } from "./LoginPage";
import { AuthProvider } from "../../lib/auth";
import { api, ApiError } from "../../lib/api";
import type { AuthResponseDTO } from "../../lib/types";

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, api: { ...actual.api, post: vi.fn() } };
});

function renderLoginPage() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/staff/login"]}>
        <Routes>
          <Route path="/staff/login" element={<StaffLoginPage />} />
          <Route path="/staff/scanner" element={<p>Pantalla del scanner</p>} />
          <Route path="/staff/pos" element={<p>Pantalla del POS</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

async function completarYEnviar(user: ReturnType<typeof userEvent.setup>, email: string, password: string) {
  await user.type(screen.getByPlaceholderText("tu@mail.com"), email);
  await user.type(screen.getByPlaceholderText("••••••••"), password);
  await user.click(screen.getByRole("button", { name: /ingresar/i }));
}

describe("StaffLoginPage", () => {
  afterEach(() => {
    localStorage.clear();
    vi.mocked(api.post).mockReset();
  });

  it("el botón de ingresar está deshabilitado hasta completar los dos campos", async () => {
    const user = userEvent.setup();
    renderLoginPage();
    const boton = screen.getByRole("button", { name: /ingresar/i });
    expect(boton).toBeDisabled();
    await user.type(screen.getByPlaceholderText("tu@mail.com"), "staff@test.com");
    expect(boton).toBeDisabled();
    await user.type(screen.getByPlaceholderText("••••••••"), "1234");
    expect(boton).toBeEnabled();
  });

  it("hace login con rol Staff_QR y navega al scanner", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValueOnce({
      token: "tok",
      tipo: "Bearer",
      id: 1,
      nombre: "Juan QR",
      email: "qr@test.com",
      rol: "Staff_QR",
    } satisfies AuthResponseDTO);

    renderLoginPage();
    await completarYEnviar(user, "qr@test.com", "1234");

    expect(api.post).toHaveBeenCalledWith(
      "/auth/login",
      { email: "qr@test.com", password: "1234" },
      { skipAuth: true },
    );
    await waitFor(() => expect(screen.getByText("Pantalla del scanner")).toBeInTheDocument());
  });

  it("hace login con rol Staff_Vendedor y navega al POS", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValueOnce({
      token: "tok",
      tipo: "Bearer",
      id: 2,
      nombre: "Meli Vendedora",
      email: "vend@test.com",
      rol: "Staff_Vendedor",
    } satisfies AuthResponseDTO);

    renderLoginPage();
    await completarYEnviar(user, "vend@test.com", "1234");

    await waitFor(() => expect(screen.getByText("Pantalla del POS")).toBeInTheDocument());
  });

  it("muestra error y no navega si la cuenta no es de Staff", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValueOnce({
      token: "tok",
      tipo: "Bearer",
      id: 3,
      nombre: "Otro Rol",
      email: "otro@test.com",
      rol: "Organizador",
    } satisfies AuthResponseDTO);

    renderLoginPage();
    await completarYEnviar(user, "otro@test.com", "1234");

    expect(await screen.findByText("Esta cuenta no es de Staff.")).toBeInTheDocument();
    expect(screen.queryByText("Pantalla del scanner")).not.toBeInTheDocument();
  });

  it("muestra el mensaje de ApiError cuando el backend rechaza las credenciales", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockRejectedValueOnce(
      new ApiError({ status: 401, error: "Credenciales inválidas", path: "/auth/login", timestamp: "now" }),
    );

    renderLoginPage();
    await completarYEnviar(user, "mal@test.com", "incorrecta");

    expect(await screen.findByText("Credenciales inválidas")).toBeInTheDocument();
  });
});
