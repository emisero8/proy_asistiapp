import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { TimePicker } from "./TimePicker";
import { elegirHora } from "../testing/pickers";

function Controlado(props: { inicial?: string; onChange?: (v: string) => void }) {
  const [valor, setValor] = useState(props.inicial ?? "");
  return (
    <TimePicker
      value={valor}
      onChange={(v) => {
        setValor(v);
        props.onChange?.(v);
      }}
    />
  );
}

describe("TimePicker", () => {
  it("sin valor muestra el texto de ayuda y el selector empieza cerrado", () => {
    render(<TimePicker value="" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /Elegí un horario/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Hora 21" })).not.toBeInTheDocument();
  });

  it("elegir la hora y después los minutos arma HH:MM, muestra 'hs' y se cierra", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlado onChange={onChange} />);

    await elegirHora(user, screen.getByRole("button", { name: /Elegí un horario/ }), "21:30");

    expect(onChange).toHaveBeenLastCalledWith("21:30");
    expect(screen.getByRole("button", { name: /21:30 hs/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hora 21" })).not.toBeInTheDocument();
  });

  it("elegir la hora conserva los minutos y deja el selector abierto para elegir los minutos", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlado inicial="10:45" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /10:45 hs/ }));

    await user.click(screen.getByRole("button", { name: "Hora 21" }));

    expect(onChange).toHaveBeenLastCalledWith("21:45");
    expect(screen.getByRole("button", { name: "Minutos 15" })).toBeInTheDocument(); // sigue abierto
  });

  it("elegir solo la hora o solo los minutos completa el otro con 00", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { unmount } = render(<Controlado onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /Elegí un horario/ }));
    await user.click(screen.getByRole("button", { name: "Hora 08" }));
    expect(onChange).toHaveBeenLastCalledWith("08:00");
    unmount();

    render(<Controlado onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /Elegí un horario/ }));
    await user.click(screen.getByRole("button", { name: "Minutos 15" }));
    expect(onChange).toHaveBeenLastCalledWith("00:15");
  });

  it("marca la hora y los minutos elegidos", async () => {
    const user = userEvent.setup();
    render(<Controlado inicial="21:30" />);
    await user.click(screen.getByRole("button", { name: /21:30 hs/ }));

    expect(screen.getByRole("button", { name: "Hora 21" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Hora 20" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Minutos 30" })).toHaveAttribute("aria-pressed", "true");
  });

  it("se cierra con Escape y al tocar afuera, sin cambiar el horario", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <div>
        <p>afuera</p>
        <Controlado onChange={onChange} />
      </div>,
    );
    const disparador = screen.getByRole("button", { name: /Elegí un horario/ });

    await user.click(disparador);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("button", { name: "Hora 21" })).not.toBeInTheDocument();

    await user.click(disparador);
    await user.click(screen.getByText("afuera"));
    expect(screen.queryByRole("button", { name: "Hora 21" })).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
