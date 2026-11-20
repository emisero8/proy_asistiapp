import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox, RadioCardGroup, Switch } from "./Selection";

function Tandas({ inicial = 2 }: { inicial?: number | null }) {
  const [valor, setValor] = useState<number | null>(inicial);
  return (
    <RadioCardGroup
      label="Elegí tu tanda"
      value={valor}
      onChange={setValor}
      options={[
        { value: 1, label: "Anticipada", disabled: true },
        { value: 2, label: "General" },
        { value: 3, label: "VIP" },
      ]}
    />
  );
}

describe("RadioCardGroup", () => {
  it("es un radiogroup con nombre y marca la opción elegida", () => {
    render(<Tandas />);
    expect(screen.getByRole("radiogroup", { name: "Elegí tu tanda" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "General" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "VIP" })).toHaveAttribute("aria-checked", "false");
  });

  it("un solo Tab entra al grupo, por la opción elegida", async () => {
    const user = userEvent.setup();
    render(<Tandas />);
    await user.tab();
    expect(screen.getByRole("radio", { name: "General" })).toHaveFocus();
    await user.tab();
    expect(document.body).toHaveFocus();
  });

  it("sin selección, entra por la primera opción habilitada", async () => {
    const user = userEvent.setup();
    render(<Tandas inicial={null} />);
    await user.tab();
    expect(screen.getByRole("radio", { name: "General" })).toHaveFocus();
  });

  it("las flechas mueven y seleccionan, salteando las deshabilitadas", async () => {
    const user = userEvent.setup();
    render(<Tandas />);
    await user.tab();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "VIP" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "VIP" })).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{ArrowDown}");
    // Da la vuelta y saltea "Anticipada" (deshabilitada)
    expect(screen.getByRole("radio", { name: "General" })).toHaveFocus();
  });

  it("no se puede elegir una opción deshabilitada", async () => {
    const user = userEvent.setup();
    render(<Tandas />);
    await user.click(screen.getByRole("radio", { name: "Anticipada" }));
    expect(screen.getByRole("radio", { name: "General" })).toHaveAttribute("aria-checked", "true");
  });
});

describe("Switch", () => {
  it("expone role=switch con estado y nombre, y alterna al hacer click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Switch checked={false} onCheckedChange={onChange} label="Pack activo" />);
    const sw = screen.getByRole("switch", { name: "Pack activo" });
    expect(sw).toHaveAttribute("aria-checked", "false");
    await user.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("con showLabel el texto visible es su nombre", () => {
    render(<Switch checked onCheckedChange={() => {}} label="Notificaciones" showLabel />);
    expect(screen.getByRole("switch", { name: "Notificaciones" })).toHaveAttribute("aria-checked", "true");
  });

  it("deshabilitado no cambia", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Switch checked={false} onCheckedChange={onChange} label="X" disabled />);
    await user.click(screen.getByRole("switch", { name: "X" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("Checkbox", () => {
  it("es un checkbox nativo que se tilda también desde el texto", async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Acepto los términos" />);
    const cb = screen.getByRole("checkbox", { name: "Acepto los términos" });
    await user.click(screen.getByText("Acepto los términos"));
    expect(cb).toBeChecked();
  });
});
