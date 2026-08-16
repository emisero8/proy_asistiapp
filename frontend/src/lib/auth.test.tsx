import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { AuthProvider, RequireRole, useAuth } from "./auth";
import { SESSION_STORAGE_KEY } from "./api";
import type { AuthResponseDTO } from "./types";

const ORGANIZADOR_SESSION: AuthResponseDTO = {
  token: "tok-org",
  tipo: "Bearer",
  id: 1,
  nombre: "Ana Organizadora",
  email: "ana@mail.com",
  rol: "Organizador",
};

function Protegido({ roles }: { roles: AuthResponseDTO["rol"][] }) {
  return (
    <RequireRole roles={roles} redirectTo="/login">
      <p>Contenido protegido</p>
    </RequireRole>
  );
}

function renderProtegido(roles: AuthResponseDTO["rol"][], initialPath = "/privado") {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<p>Pantalla de login</p>} />
          <Route path="/privado" element={<Protegido roles={roles} />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe("RequireRole", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("redirige al login si no hay sesión guardada", () => {
    renderProtegido(["Organizador"]);
    expect(screen.getByText("Pantalla de login")).toBeInTheDocument();
    expect(screen.queryByText("Contenido protegido")).not.toBeInTheDocument();
  });

  it("redirige al login si la sesión es de otro rol", () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(ORGANIZADOR_SESSION));
    renderProtegido(["Administrador"]);
    expect(screen.getByText("Pantalla de login")).toBeInTheDocument();
  });

  it("muestra el contenido si el rol de la sesión coincide", () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(ORGANIZADOR_SESSION));
    renderProtegido(["Organizador"]);
    expect(screen.getByText("Contenido protegido")).toBeInTheDocument();
  });

  it("acepta cualquiera de varios roles permitidos (ej. las dos variantes de Staff)", () => {
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ ...ORGANIZADOR_SESSION, rol: "Staff_Vendedor" } satisfies AuthResponseDTO),
    );
    renderProtegido(["Staff_QR", "Staff_Vendedor"]);
    expect(screen.getByText("Contenido protegido")).toBeInTheDocument();
  });
});

function Consumidor() {
  const { session, login, logout } = useAuth();
  return (
    <div>
      <p>{session ? `Sesión: ${session.nombre}` : "Sin sesión"}</p>
      <button onClick={() => login(ORGANIZADOR_SESSION)}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe("AuthProvider / useAuth", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("arranca sin sesión si localStorage está vacío", () => {
    render(
      <AuthProvider>
        <Consumidor />
      </AuthProvider>,
    );
    expect(screen.getByText("Sin sesión")).toBeInTheDocument();
  });

  it("arranca con la sesión ya guardada en localStorage", () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(ORGANIZADOR_SESSION));
    render(
      <AuthProvider>
        <Consumidor />
      </AuthProvider>,
    );
    expect(screen.getByText("Sesión: Ana Organizadora")).toBeInTheDocument();
  });

  it("login() persiste la sesión en localStorage y actualiza el estado", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Consumidor />
      </AuthProvider>,
    );
    await act(() => user.click(screen.getByText("Login")));
    expect(screen.getByText("Sesión: Ana Organizadora")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY)!)).toMatchObject({ nombre: "Ana Organizadora" });
  });

  it("logout() limpia localStorage y el estado", async () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(ORGANIZADOR_SESSION));
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Consumidor />
      </AuthProvider>,
    );
    await act(() => user.click(screen.getByText("Logout")));
    expect(screen.getByText("Sin sesión")).toBeInTheDocument();
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });
});
