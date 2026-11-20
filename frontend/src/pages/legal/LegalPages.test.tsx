import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { TerminosPage } from "./TerminosPage";
import { PrivacidadPage } from "./PrivacidadPage";
import { ThemeProvider } from "../../lib/theme";
import { TERMINOS_VERSION } from "../../lib/terminos";

function renderizar(ui: React.ReactElement) {
  return render(
    <ThemeProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </ThemeProvider>,
  );
}

describe("páginas legales", () => {
  it("los términos muestran su versión, no son un borrador y dicen que la plataforma es intermediaria", () => {
    renderizar(<TerminosPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Términos y Condiciones" })).toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    expect(screen.queryByText(/borrador/i)).not.toBeInTheDocument();
    expect(screen.getByText(new RegExp(TERMINOS_VERSION))).toBeInTheDocument();
    expect(screen.getByText(/intermediaria/i)).toBeInTheDocument();
  });

  it("la política de privacidad lista los derechos de acceso, rectificación y supresión", () => {
    renderizar(<PrivacidadPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Política de Privacidad" })).toBeInTheDocument();
    expect(screen.queryByText(/borrador/i)).not.toBeInTheDocument();
    expect(screen.getByText(/acceso, rectificación y supresión/i)).toBeInTheDocument();
  });

  it("cada documento enlaza al otro", () => {
    renderizar(<TerminosPage />);
    expect(screen.getByRole("link", { name: "Política de Privacidad" })).toHaveAttribute("href", "/privacidad");
  });
});
