import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrganizadorWalletPage } from "./WalletPage";
import { api, ApiError } from "../../lib/api";
import type { CompraCreditoResponseDTO, MovimientoCreditoResponseDTO, PaqueteCreditoDisponibleDTO } from "../../lib/types";

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn(), post: vi.fn() } };
});

const HISTORIAL: MovimientoCreditoResponseDTO[] = [
  { id: 2, tipoMovimiento: "Consumo_Publicacion", monto: -1, saldoResultante: 9, fechaMovimiento: "2026-03-02T10:00:00", idTransaccionCredito: null, idEvento: 4 },
  { id: 1, tipoMovimiento: "Bienvenida", monto: 10, saldoResultante: 10, fechaMovimiento: "2026-03-01T10:00:00", idTransaccionCredito: null, idEvento: null },
];

const PAQUETES = [
  { id: 1, nombre: "Básico", cantidadCreditos: 10, precio: 5000 },
  { id: 2, nombre: "Pro", cantidadCreditos: 50, precio: 20000 },
] as PaqueteCreditoDisponibleDTO[];

const COMPRAS = [
  { externalReference: "ref-1", nombrePaquete: "Básico", cantidadCreditos: 10, monto: 5000, estado: "Aprobada", fechaTransaccion: "2026-03-03T10:00:00" },
] as CompraCreditoResponseDTO[];

function renderWallet() {
  return render(
    <MemoryRouter>
      <OrganizadorWalletPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(api.get).mockImplementation(async (path: string) => {
    if (path === "/creditos/historial") return HISTORIAL;
    if (path === "/creditos/compras") return COMPRAS;
    if (path === "/creditos/paquetes") return PAQUETES;
    return undefined;
  });
});

afterEach(() => {
  vi.mocked(api.get).mockReset();
  vi.mocked(api.post).mockReset();
});

describe("OrganizadorWalletPage", () => {
  it("muestra el saldo del último movimiento", async () => {
    renderWallet();
    const saldo = await screen.findByRole("region", { name: "Saldo" });
    expect(within(saldo).getByText(/^9/)).toBeInTheDocument();
  });

  it("los paquetes son un radio group: pagar queda deshabilitado hasta elegir uno y dice el monto", async () => {
    const user = userEvent.setup();
    renderWallet();
    const grupo = await screen.findByRole("radiogroup", { name: "Paquetes de créditos" });
    expect(within(grupo).getAllByRole("radio")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Elegí un paquete" })).toBeDisabled();

    await user.click(within(grupo).getByRole("radio", { name: /50 créditos/ }));

    expect(screen.getByRole("button", { name: "Pagar $20.000 con MercadoPago" })).toBeEnabled();
  });

  it("al pagar inicia la compra del paquete elegido (mismo contrato con el backend)", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockRejectedValueOnce(
      new ApiError({ status: 503, error: "El cobro con MercadoPago no está configurado", path: "/creditos/comprar", timestamp: "2026-01-01T00:00:00" }),
    );
    // En http (como jsdom) el pago se abre en otra pestaña (lib/pago.ts): se simula la pestaña.
    const pestana = { document: window.document.implementation.createHTMLDocument(), close: vi.fn(), location: {} };
    const abrir = vi.spyOn(window, "open").mockReturnValue(pestana as unknown as Window);
    renderWallet();
    const grupo = await screen.findByRole("radiogroup", { name: "Paquetes de créditos" });
    await user.click(within(grupo).getByRole("radio", { name: /10 créditos/ }));
    await user.click(screen.getByRole("button", { name: "Pagar $5.000 con MercadoPago" }));

    expect(api.post).toHaveBeenCalledWith("/creditos/comprar", { idPaquete: 1 });
    expect(await screen.findByText("El cobro con MercadoPago no está configurado")).toBeInTheDocument();
    // Si el backend rechaza, la pestaña de pago que se había abierto se cierra.
    expect(pestana.close).toHaveBeenCalled();
    abrir.mockRestore();
  });

  it("el historial alterna entre movimientos y compras", async () => {
    const user = userEvent.setup();
    renderWallet();
    expect(await screen.findByText("Créditos de bienvenida")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mis compras" }));

    expect(screen.getByRole("button", { name: "Mis compras" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Aprobada")).toBeInTheDocument();
  });

  it("si falla la carga muestra el error con Reintentar", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockRejectedValue(new Error("Failed to fetch"));
    renderWallet();
    expect(await screen.findByText("No pudimos cargar tu billetera.")).toBeInTheDocument();

    vi.mocked(api.get).mockImplementation(async (path: string) => {
      if (path === "/creditos/historial") return HISTORIAL;
      if (path === "/creditos/compras") return COMPRAS;
      return PAQUETES;
    });
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("radiogroup", { name: "Paquetes de créditos" })).toBeInTheDocument();
  });
});
