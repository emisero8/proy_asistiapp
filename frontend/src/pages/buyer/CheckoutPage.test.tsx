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
const casillaTerminos = () => screen.getByRole("checkbox", { name: /Acepto los Términos y Condiciones/ });

async function completarDatos(user: ReturnType<typeof userEvent.setup>, { terminos = true } = {}) {
  await user.type(screen.getByLabelText("Nombre y apellido"), "María García");
  await user.type(screen.getByLabelText("Email"), "maria@test.com");
  await user.type(screen.getByLabelText("Confirmar email"), "maria@test.com");
  if (terminos) await user.click(casillaTerminos());
}

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

  it("con datos válidos inicia la compra con el contrato de siempre, más la aceptación de términos (8.7)", async () => {
    const user = userEvent.setup();
    const post = vi.spyOn(api, "post").mockRejectedValue(new ApiError({ status: 409, error: "Tanda agotada", path: "", timestamp: "" }));
    // En http (como jsdom) el pago se abre en otra pestaña (lib/pago.ts): se simula la pestaña.
    const pestana = { document: window.document.implementation.createHTMLDocument(), close: vi.fn(), location: {} };
    vi.spyOn(window, "open").mockReturnValue(pestana as unknown as Window);
    renderCheckout();
    await completarDatos(user);
    await user.click(botonPagar());
    expect(post).toHaveBeenCalledWith(
      "/tickets/comprar-online",
      { idTanda: 7, cantidad: 2, nombreComprador: "María García", emailComprador: "maria@test.com", aceptaTerminos: true },
      { skipAuth: true },
    );
    // Si el backend rechaza, se cierra la pestaña de pago, se muestra su mensaje y se puede reintentar
    expect(await screen.findByText("Tanda agotada")).toBeInTheDocument();
    expect(pestana.close).toHaveBeenCalled();
    expect(botonPagar()).toBeEnabled();
  });

  it("si el navegador bloquea la pestaña de pago, lo avisa y no crea la orden", async () => {
    const user = userEvent.setup();
    const post = vi.spyOn(api, "post");
    vi.spyOn(window, "open").mockReturnValue(null);
    renderCheckout();
    await completarDatos(user);
    await user.click(botonPagar());

    expect(post).not.toHaveBeenCalled();
    expect(await screen.findByText(/bloqueó la ventana de pago/)).toBeInTheDocument();
  });

  it("sin compra en curso ofrece ir a los eventos", () => {
    renderCheckout(null);
    expect(screen.getByText("No hay ninguna compra en curso")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver eventos" })).toBeInTheDocument();
  });
});

describe("CheckoutPage — email y confirmación", () => {
  afterEach(() => vi.restoreAllMocks());

  it("se puede pegar en 'Confirmar email' (no se bloquea el portapapeles)", async () => {
    const user = userEvent.setup();
    renderCheckout();
    const confirmar = screen.getByLabelText("Confirmar email");

    await user.click(confirmar);
    await user.paste("maria@ejemplo.com");

    expect(confirmar).toHaveValue("maria@ejemplo.com");
  });

  it("si los dos emails no coinciden avisa al salir del campo, aunque se hayan pegado", async () => {
    const user = userEvent.setup();
    renderCheckout();

    await user.type(screen.getByLabelText("Email"), "maria@ejemplo.com");
    await user.click(screen.getByLabelText("Confirmar email"));
    await user.paste("mario@ejemplo.com");
    await user.tab();

    expect(screen.getByText("Los emails no coinciden.")).toBeInTheDocument();
  });

  it("si coinciden no muestra el aviso", async () => {
    const user = userEvent.setup();
    renderCheckout();

    await user.type(screen.getByLabelText("Email"), "maria@ejemplo.com");
    await user.click(screen.getByLabelText("Confirmar email"));
    await user.paste("maria@ejemplo.com");
    await user.tab();

    expect(screen.queryByText("Los emails no coinciden.")).not.toBeInTheDocument();
  });

  it("si los emails no coinciden no inicia el pago", async () => {
    const user = userEvent.setup();
    const post = vi.spyOn(api, "post");
    renderCheckout();
    await user.type(screen.getByLabelText("Nombre y apellido"), "María García");
    await user.type(screen.getByLabelText("Email"), "maria@test.com");
    await user.type(screen.getByLabelText("Confirmar email"), "mario@test.com");
    await user.click(casillaTerminos());
    await user.click(botonPagar());

    expect(post).not.toHaveBeenCalled();
    expect(screen.getByText("Los emails no coinciden.")).toBeInTheDocument();
  });
});

describe("CheckoutPage — términos y condiciones (8.7)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sin aceptar los términos no inicia el pago, lo avisa y enfoca la casilla", async () => {
    const user = userEvent.setup();
    const post = vi.spyOn(api, "post");
    renderCheckout();
    await completarDatos(user, { terminos: false });
    await user.click(botonPagar());

    expect(post).not.toHaveBeenCalled();
    expect(screen.getByText(/tenés que aceptar los Términos/)).toBeInTheDocument();
    await vi.waitFor(() => expect(casillaTerminos()).toHaveFocus());
  });

  it("los Términos y la Política de Privacidad se abren en otra pestaña (no se pierde lo cargado)", () => {
    renderCheckout();
    expect(screen.getByRole("link", { name: "Términos y Condiciones" })).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "Política de Privacidad" })).toHaveAttribute("href", "/privacidad");
  });
});
