import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button, IconButton } from "./Button";
import { QuantityStepper } from "./Purchase";
import { StatusBadge } from "./Badge";

describe("Button", () => {
  it('es type="button" por defecto: no envía el formulario que lo contiene', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e: Event) => e.preventDefault());
    render(
      <form onSubmit={(e) => onSubmit(e.nativeEvent)}>
        <Button>Ver detalle</Button>
        <Button type="submit">Enviar</Button>
      </form>,
    );
    await user.click(screen.getByRole("button", { name: "Ver detalle" }));
    expect(onSubmit).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Enviar" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("loading deshabilita, marca aria-busy y evita el doble envío", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button loading loadingText="Guardando…" onClick={onClick}>
        Guardar
      </Button>,
    );
    const boton = screen.getByRole("button", { name: "Guardando…" });
    expect(boton).toBeDisabled();
    expect(boton).toHaveAttribute("aria-busy", "true");
    await user.click(boton);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("IconButton", () => {
  it("su nombre accesible es el label", () => {
    render(<IconButton label="Editar evento" icon={<span>✎</span>} />);
    expect(screen.getByRole("button", { name: "Editar evento" })).toBeInTheDocument();
  });

  it("muestra el tooltip al enfocar con teclado y lo asocia con aria-describedby", async () => {
    const user = userEvent.setup();
    render(<IconButton label="Editar evento" icon={<span>✎</span>} />);
    await user.tab();
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent("Editar evento");
    expect(screen.getByRole("button", { name: "Editar evento" })).toHaveAttribute("aria-describedby", tooltip.id);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});

describe("QuantityStepper", () => {
  function Stepper() {
    const [n, setN] = useState(1);
    return <QuantityStepper value={n} onChange={setN} max={2} />;
  }

  it("respeta los topes y deshabilita los botones en los extremos", async () => {
    const user = userEvent.setup();
    render(<Stepper />);
    const menos = screen.getByRole("button", { name: "Quitar una entrada" });
    const mas = screen.getByRole("button", { name: "Agregar una entrada" });
    expect(menos).toBeDisabled();
    await user.click(mas);
    expect(screen.getByRole("status")).toHaveTextContent("2");
    expect(mas).toBeDisabled();
    expect(menos).toBeEnabled();
  });
});

describe("StatusBadge", () => {
  it("muestra el estado tal cual lo devuelve el backend", () => {
    render(<StatusBadge tipo="evento" estado="Publicado" />);
    expect(screen.getByText("Publicado")).toBeInTheDocument();
  });
});
