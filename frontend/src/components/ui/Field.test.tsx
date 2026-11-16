import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Field, Input, Select, Textarea } from "./Field";

describe("Field", () => {
  it("conecta el label con el control (se encuentra por su etiqueta)", () => {
    render(
      <Field label="Email">
        <Input type="email" />
      </Field>,
    );
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
  });

  it("asocia la ayuda al control", () => {
    render(
      <Field label="Contraseña" hint="Mínimo 8 caracteres.">
        <Input type="password" />
      </Field>,
    );
    expect(screen.getByLabelText("Contraseña")).toHaveAccessibleDescription("Mínimo 8 caracteres.");
  });

  it("con error, el error reemplaza a la ayuda (visible y anunciado) y marca el control inválido", () => {
    render(
      <Field label="Contraseña" hint="Mínimo 8 caracteres." error="Es demasiado corta.">
        <Input type="password" />
      </Field>,
    );
    const input = screen.getByLabelText("Contraseña");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Es demasiado corta.");
    expect(screen.queryByText("Mínimo 8 caracteres.")).not.toBeInTheDocument();
  });

  it("sin error no marca aria-invalid", () => {
    render(
      <Field label="Nombre">
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText("Nombre")).not.toHaveAttribute("aria-invalid");
  });

  it("required se propaga al control y el asterisco no forma parte del nombre accesible", () => {
    render(
      <Field label="Nombre" required>
        <Input />
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "Nombre" });
    expect(input).toBeRequired();
  });

  it("funciona igual con Textarea y Select", () => {
    render(
      <>
        <Field label="Descripción">
          <Textarea />
        </Field>
        <Field label="Estado">
          <Select>
            <option>Publicado</option>
          </Select>
        </Field>
      </>,
    );
    expect(screen.getByLabelText("Descripción").tagName).toBe("TEXTAREA");
    expect(screen.getByLabelText("Estado").tagName).toBe("SELECT");
  });
});
