import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "../../lib/auth";
import { ThemeProvider } from "../../lib/theme";
import { api } from "../../lib/api";
import { OrganizadorRegisterPage } from "./RegisterPage";

function renderPage() {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter>
          <OrganizadorRegisterPage />
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>,
  );
}

describe("OrganizadorRegisterPage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("al enviar incompleto marca los errores, enfoca el primero y no llama al backend", async () => {
    const user = userEvent.setup();
    const post = vi.spyOn(api, "post");
    renderPage();
    await user.click(screen.getByRole("button", { name: "Crear cuenta gratis" }));
    expect(post).not.toHaveBeenCalled();
    expect(screen.getByText("Ingresá tu nombre completo.")).toBeInTheDocument();
    expect(screen.getByText("Tenés que aceptar los términos para crear la cuenta.")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre completo")).toHaveAttribute("aria-invalid", "true");
    await vi.waitFor(() => expect(screen.getByLabelText("Nombre completo")).toHaveFocus());
  });

  it("no muestra errores mientras se escribe, sino al salir del campo", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText("Email"), "sin-arroba");
    expect(screen.queryByText("Ingresá un email válido.")).not.toBeInTheDocument();
    await user.tab();
    expect(screen.getByText("Ingresá un email válido.")).toBeInTheDocument();
  });

  it("con todo válido envía el registro con el contrato de siempre", async () => {
    const user = userEvent.setup();
    const post = vi.spyOn(api, "post").mockResolvedValue({ token: "t", rol: "Organizador", nombre: "María García" });
    vi.spyOn(api, "get").mockResolvedValue([{ saldoResultante: 5 }]);
    renderPage();
    await user.type(screen.getByLabelText("Nombre completo"), "María García");
    await user.type(screen.getByLabelText("Email"), "maria@test.com");
    await user.type(screen.getByLabelText("Contraseña"), "segura123");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "segura123");
    await user.click(screen.getByRole("checkbox", { name: /Acepto los Términos/ }));
    await user.click(screen.getByRole("button", { name: "Crear cuenta gratis" }));
    expect(post).toHaveBeenCalledWith(
      "/auth/register",
      { nombre: "María García", email: "maria@test.com", password: "segura123" },
      { skipAuth: true },
    );
    expect(await screen.findByRole("heading", { name: "¡Bienvenido/a, María!" })).toBeInTheDocument();
    expect(screen.getByText("+5")).toBeInTheDocument();
  });
});
