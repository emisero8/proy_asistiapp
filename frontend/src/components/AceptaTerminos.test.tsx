import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AceptaTerminos } from "./AceptaTerminos";

describe("AceptaTerminos", () => {
  it("es una casilla con nombre accesible, desmarcada si no se aceptó", () => {
    render(<AceptaTerminos aceptado={false} onCambio={vi.fn()} />);

    expect(screen.getByRole("checkbox", { name: /Acepto los Términos y Condiciones y la Política de Privacidad/ })).not.toBeChecked();
  });

  it("al tocarla avisa el nuevo valor", async () => {
    const onCambio = vi.fn();
    render(<AceptaTerminos aceptado={false} onCambio={onCambio} />);

    await userEvent.click(screen.getByRole("checkbox"));

    expect(onCambio).toHaveBeenCalledWith(true);
  });

  it("enlaza a los dos documentos en una pestaña nueva, para no perder lo que se cargó", () => {
    render(<AceptaTerminos aceptado onCambio={vi.fn()} />);

    const terminos = screen.getByRole("link", { name: "Términos y Condiciones" });
    const privacidad = screen.getByRole("link", { name: "Política de Privacidad" });
    expect(terminos).toHaveAttribute("href", "/terminos");
    expect(privacidad).toHaveAttribute("href", "/privacidad");
    expect(terminos).toHaveAttribute("target", "_blank");
    expect(privacidad).toHaveAttribute("target", "_blank");
  });
});
