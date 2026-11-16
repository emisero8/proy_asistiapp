import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { api, ApiError } from "../../lib/api";
import { ThemeProvider } from "../../lib/theme";
import { CheckoutPage } from "./CheckoutPage";
import type { EventoPublicoDetalleDTO, TandaResponseDTO } from "../../lib/types";

const evento = {
  id: 1,
  nombre: "Fiesta de prueba",
  fechaEvento: "2099-12-12",
  horaEvento: "22:00:00",
  lugar: "Club Demo",
  imagenPortadaUrl: null,
  tandas: [],
} as unknown as EventoPublicoDetalleDTO;
const tanda = { id: 7, nombre: "General", precio: 12000, cupoDisponible: 50 } as unknown as TandaResponseDTO;

function renderCheckout(state: unknown = { evento, tanda, qty: 2 }) {
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[{ pathname: "/checkout", state }]}>
        <CheckoutPage />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

/** Hay un botón de pagar en el panel de desktop y otro en la barra de mobile: los dos envían el mismo form. */
const botonPagar = () => screen.getAllByRole("button", { name: "Pagar $24.000" })[0];

describe("CheckoutPage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("muestra el resumen del pedido (también en mobile) con el total", () => {
    renderCheckout();
    const resumenes = screen.getAllByRole("region", { name: "Tu pedido" });
    expect(resumenes.length).toBeGreaterThan(0);
    expect(within(resumenes[0]).getByText("Fiesta de prueba")).toBeInTheDocument();
    expect(within(resumenes[0]).getByText("2 entradas · General")).toBeInTheDocument();
  });

  it("no inicia el pago con datos inválidos: marca los errores y enfoca el primero", async () => {
    const user = userEvent.setup();
    const post = vi.spyOn(api, "post");
    renderCheckout();
    await user.click(botonPagar());
    expect(post).not.toHaveBeenCalled();
    expect(screen.getByText("Ingresá tu nombre y apellido.")).toBeInTheDocument();
    await vi.waitFor(() => expect(screen.getByLabelText("Nombre y apellido")).toHaveFocus());
  });

  it("con datos válidos inicia la compra con el contrato de siempre", async () => {
    const user = userEvent.setup();
    const post = vi.spyOn(api, "post").mockRejectedValue(new ApiError({ status: 409, error: "Tanda agotada", path: "", timestamp: "" }));
    renderCheckout();
    await user.type(screen.getByLabelText("Nombre y apellido"), "María García");
    await user.type(screen.getByLabelText("Email"), "maria@test.com");
    await user.click(botonPagar());
    expect(post).toHaveBeenCalledWith(
      "/tickets/comprar-online",
      { idTanda: 7, cantidad: 2, nombreComprador: "María García", emailComprador: "maria@test.com" },
      { skipAuth: true },
    );
    // Si el backend rechaza, se muestra su mensaje y se puede reintentar
    expect(await screen.findByText("Tanda agotada")).toBeInTheDocument();
    expect(botonPagar()).toBeEnabled();
  });

  it("sin compra en curso ofrece ir a los eventos", () => {
    renderCheckout(null);
    expect(screen.getByText("No hay ninguna compra en curso")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver eventos" })).toBeInTheDocument();
  });
});
