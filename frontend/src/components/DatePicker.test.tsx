import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DatePicker } from "./DatePicker";
import { elegirFecha } from "../testing/pickers";

// Hoy congelado (solo Date, para no tocar los timers de userEvent): el calendario abre en Junio 2030.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(2030, 5, 15, 12) });
});
afterEach(() => {
  vi.useRealTimers();
});

const dia = (d: number, mes = "junio") => screen.getByRole("button", { name: `${d} de ${mes} de 2030` });

/** Mantiene el valor como lo haría un formulario, para ver lo que la persona ve tras elegir. */
function Controlado(props: { inicial?: string; min?: string; max?: string; allowClear?: boolean; onChange?: (v: string) => void }) {
  const [valor, setValor] = useState(props.inicial ?? "");
  return (
    <DatePicker
      value={valor}
      min={props.min}
      max={props.max}
      allowClear={props.allowClear}
      onChange={(v) => {
        setValor(v);
        props.onChange?.(v);
      }}
    />
  );
}

describe("DatePicker", () => {
  it("sin valor muestra el texto de ayuda y el calendario empieza cerrado", () => {
    render(<DatePicker value="" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /Elegí una fecha/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Junio 2030")).not.toBeInTheDocument();
  });

  it("abre en el mes de hoy, elige un día, avisa la fecha en formato ISO y se cierra", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlado onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /Elegí una fecha/ }));
    expect(screen.getByText("Junio 2030")).toBeInTheDocument();
    await user.click(dia(28));

    expect(onChange).toHaveBeenCalledWith("2030-06-28");
    expect(screen.queryByText("Junio 2030")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /28 jun 2030/ })).toBeInTheDocument(); // ya muestra la fecha elegida
  });

  it("navega entre meses y años", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlado onChange={onChange} />);

    await elegirFecha(user, screen.getByRole("button", { name: /Elegí una fecha/ }), "2031-02-03");

    expect(onChange).toHaveBeenCalledWith("2031-02-03");
  });

  it("al abrir con un valor, arranca en el mes de ese valor y marca el día elegido", async () => {
    const user = userEvent.setup();
    render(<Controlado inicial="2030-09-10" />);

    await user.click(screen.getByRole("button", { name: /10 sep.* 2030/ }));

    expect(screen.getByText("Septiembre 2030")).toBeInTheDocument();
    expect(dia(10, "septiembre")).toHaveAttribute("aria-pressed", "true");
    expect(dia(11, "septiembre")).toHaveAttribute("aria-pressed", "false");
  });

  it("los días fuera de min y max no se pueden elegir", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlado min="2030-06-10" max="2030-06-20" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /Elegí una fecha/ }));

    expect(dia(9)).toBeDisabled();
    expect(dia(10)).toBeEnabled();
    expect(dia(20)).toBeEnabled();
    expect(dia(21)).toBeDisabled();
    await user.click(dia(9));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("'Hoy' elige el día de hoy, salvo que quede fuera del rango permitido", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { unmount } = render(<Controlado onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /Elegí una fecha/ }));
    await user.click(screen.getByRole("button", { name: "Hoy" }));
    expect(onChange).toHaveBeenCalledWith("2030-06-15");
    unmount();

    render(<Controlado min="2030-06-20" />);
    await user.click(screen.getByRole("button", { name: /Elegí una fecha/ }));
    expect(screen.getByRole("button", { name: "Hoy" })).toBeDisabled();
  });

  it("'Limpiar' aparece solo en los campos opcionales y deja la fecha vacía", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { unmount } = render(<Controlado inicial="2030-06-20" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /20 jun 2030/ }));
    expect(screen.queryByRole("button", { name: "Limpiar" })).not.toBeInTheDocument();
    unmount();

    render(<Controlado inicial="2030-06-20" allowClear onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /20 jun 2030/ }));
    await user.click(screen.getByRole("button", { name: "Limpiar" }));

    expect(onChange).toHaveBeenCalledWith("");
    expect(screen.getByRole("button", { name: /Elegí una fecha/ })).toBeInTheDocument();
  });

  it("se cierra con Escape y al tocar afuera, sin cambiar la fecha", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <div>
        <p>afuera</p>
        <Controlado onChange={onChange} />
      </div>,
    );
    const disparador = screen.getByRole("button", { name: /Elegí una fecha/ });

    await user.click(disparador);
    await user.keyboard("{Escape}");
    expect(screen.queryByText("Junio 2030")).not.toBeInTheDocument();

    await user.click(disparador);
    await user.click(screen.getByText("afuera"));
    expect(screen.queryByText("Junio 2030")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
