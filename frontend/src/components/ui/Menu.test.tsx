import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Menu } from "./Menu";

function renderMenu() {
  const suspender = vi.fn();
  const eliminar = vi.fn();
  render(
    <div>
      <Menu
        label="Acciones de Juan"
        items={[
          { label: "Suspender", onSelect: suspender },
          { label: "Deshabilitada", onSelect: vi.fn(), disabled: true },
          { label: "Eliminar", onSelect: eliminar, tone: "danger", separatorBefore: true },
        ]}
      />
      <button>Afuera</button>
    </div>,
  );
  return { suspender, eliminar, disparador: screen.getByRole("button", { name: "Acciones de Juan" }) };
}

describe("Menu", () => {
  it("el disparador expone aria-haspopup y aria-expanded", async () => {
    const user = userEvent.setup();
    const { disparador } = renderMenu();
    expect(disparador).toHaveAttribute("aria-haspopup", "menu");
    expect(disparador).toHaveAttribute("aria-expanded", "false");
    await user.click(disparador);
    expect(disparador).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu", { name: "Acciones de Juan" })).toBeInTheDocument();
  });

  it("al abrir enfoca el primer ítem y las flechas saltean los deshabilitados", async () => {
    const user = userEvent.setup();
    const { disparador } = renderMenu();
    await user.click(disparador);
    expect(screen.getByRole("menuitem", { name: "Suspender" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Eliminar" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Suspender" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("menuitem", { name: "Eliminar" })).toHaveFocus();
  });

  it("elegir un ítem ejecuta la acción, cierra y devuelve el foco al disparador", async () => {
    const user = userEvent.setup();
    const { disparador, eliminar } = renderMenu();
    await user.click(disparador);
    await user.click(screen.getByRole("menuitem", { name: "Eliminar" }));
    expect(eliminar).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(disparador).toHaveFocus();
  });

  it("Escape cierra sin ejecutar nada y devuelve el foco", async () => {
    const user = userEvent.setup();
    const { disparador, suspender, eliminar } = renderMenu();
    await user.click(disparador);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(disparador).toHaveFocus();
    expect(suspender).not.toHaveBeenCalled();
    expect(eliminar).not.toHaveBeenCalled();
  });

  it("click afuera cierra el menú", async () => {
    const user = userEvent.setup();
    const { disparador } = renderMenu();
    await user.click(disparador);
    await user.click(screen.getByRole("button", { name: "Afuera" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("Flecha abajo sobre el disparador abre el menú desde el teclado", async () => {
    const user = userEvent.setup();
    const { disparador } = renderMenu();
    disparador.focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Suspender" })).toHaveFocus();
  });
});
