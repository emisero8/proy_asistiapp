import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { CheckoutPage } from "./CheckoutPage";
import type { EventoPublicoDetalleDTO, TandaResponseDTO } from "../../lib/types";

const TANDA: TandaResponseDTO = {
  id: 7,
  idEvento: 1,
  nombre: "General",
  precio: 1500,
  cupoMaximo: 50,
  cupoDisponible: 50,
  fechaInicioVigencia: null,
  fechaFinVigencia: null,
};

const EVENTO = {
  id: 1,
  nombre: "Festival de Prueba",
  descripcion: null,
  fechaEvento: "2099-12-12",
  horaEvento: "21:00:00",
  lugar: "Un lugar",
  latitud: null,
  longitud: null,
  imagenPortadaUrl: null,
  urlPublica: "festival-de-prueba",
  tandas: [TANDA],
} as EventoPublicoDetalleDTO;

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/checkout", state: { evento: EVENTO, tanda: TANDA, qty: 2 } }]}>
      <Routes>
        <Route path="/checkout" element={<CheckoutPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CheckoutPage — email y confirmación", () => {
  it("se puede pegar en 'Confirmar email' (no se bloquea el portapapeles)", async () => {
    const user = userEvent.setup();
    renderPage();
    const confirmar = screen.getByPlaceholderText("Repetí tu email");

    await user.click(confirmar);
    await user.paste("maria@ejemplo.com");

    expect(confirmar).toHaveValue("maria@ejemplo.com");
  });

  it("si los dos emails no coinciden avisa, aunque se hayan pegado", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText("maria@ejemplo.com"), "maria@ejemplo.com");
    await user.click(screen.getByPlaceholderText("Repetí tu email"));
    await user.paste("mario@ejemplo.com");

    expect(screen.getByText("Los emails no coinciden.")).toBeInTheDocument();
  });

  it("si coinciden no muestra el aviso", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText("maria@ejemplo.com"), "maria@ejemplo.com");
    await user.click(screen.getByPlaceholderText("Repetí tu email"));
    await user.paste("maria@ejemplo.com");

    expect(screen.queryByText("Los emails no coinciden.")).not.toBeInTheDocument();
  });
});
