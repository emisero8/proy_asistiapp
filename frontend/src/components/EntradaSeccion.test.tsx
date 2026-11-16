import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { AuthProvider } from "../lib/auth";
import { SESSION_STORAGE_KEY } from "../lib/api";
import { EntradaSeccion } from "./EntradaSeccion";

function Ubicacion() {
  return <p data-testid="ruta">{useLocation().pathname}</p>;
}

/** Mismas rutas que App.tsx para las secciones (login y panel concretos + comodín por sección). */
function renderEn(url: string, rol?: string) {
  if (rol) localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token: "t", rol, nombre: "X" }));
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/admin/login" element={<Ubicacion />} />
          <Route path="/admin/dashboard" element={<Ubicacion />} />
          <Route path="/organizador/login" element={<Ubicacion />} />
          <Route path="/organizador/dashboard" element={<Ubicacion />} />
          <Route path="/staff/login" element={<Ubicacion />} />
          <Route path="/staff/scanner" element={<Ubicacion />} />
          <Route path="/staff/pos" element={<Ubicacion />} />
          <Route path="/admin/*" element={<EntradaSeccion seccion="admin" />} />
          <Route path="/organizador/*" element={<EntradaSeccion seccion="organizador" />} />
          <Route path="/staff/*" element={<EntradaSeccion seccion="staff" />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
  return screen.getByTestId("ruta").textContent;
}

describe("EntradaSeccion", () => {
  afterEach(() => localStorage.clear());

  it("/admin sin sesión va al login de admin", () => {
    expect(renderEn("/admin")).toBe("/admin/login");
  });

  it("/admin/ con barra final también", () => {
    expect(renderEn("/admin/")).toBe("/admin/login");
  });

  it("/admin con sesión de administrador va al dashboard", () => {
    expect(renderEn("/admin", "Administrador")).toBe("/admin/dashboard");
  });

  it("/admin con sesión de otro rol va al login de admin (no al panel de ese rol)", () => {
    expect(renderEn("/admin", "Organizador")).toBe("/admin/login");
  });

  it("una ruta inexistente dentro de la sección va a su entrada", () => {
    expect(renderEn("/admin/no-existe")).toBe("/admin/login");
  });

  it("/organizador sin sesión va al login de organizador", () => {
    expect(renderEn("/organizador")).toBe("/organizador/login");
  });

  it("/staff manda a cada rol de staff a su pantalla", () => {
    expect(renderEn("/staff", "Staff_QR")).toBe("/staff/scanner");
  });

  it("/staff con Staff_Vendedor va al POS", () => {
    expect(renderEn("/staff", "Staff_Vendedor")).toBe("/staff/pos");
  });
});
