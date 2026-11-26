import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReembolsosPanel } from "./ReembolsosPanel";
import { api, ApiError } from "../../lib/api";
import type { EntradaResponseDTO } from "../../lib/types";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn(), post: vi.fn() } };
});

afterEach(() => {
  vi.mocked(api.get).mockReset();
  vi.mocked(api.post).mockReset();
  vi.clearAllMocks();
});

function pendiente(id: number, nombre: string, precio = 5000): EntradaResponseDTO {
  return {
    id, idTanda: 11, idEvento: 5, nombreEvento: "Festival", fechaEvento: "2026-12-05", horaEvento: "22:00:00", lugarEvento: "Club Central", imagenPortadaUrl: null, eventoFinalizado: false, nombreTanda: "General", precioTanda: precio, codigoQr: `QR-${id}`,
    nombreComprador: nombre, emailComprador: `${nombre.toLowerCase()}@test.com`, estado: "Pagada", canalVenta: "Online",
    fechaCompra: "2026-03-01T10:00:00", fechaUso: null, tipoEmision: null, motivoEmision: null,
    fechaAnulacion: null, motivoAnulacion: null, reembolsadaEn: null,
  };
}

describe("ReembolsosPanel", () => {
  it("sin compras pendientes lo dice", async () => {
    vi.mocked(api.get).mockResolvedValueOnce([]);
    render(<ReembolsosPanel idEvento={5} onCambio={vi.fn()} />);

    expect(await screen.findByText(/no hay compras pendientes de reembolso/i)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/tickets/evento/5/reembolsos");
    expect(screen.queryByRole("button", { name: /reembolsar todas/i })).not.toBeInTheDocument();
  });

  it("con pendientes muestra cuántas son y cuánto suman", async () => {
    vi.mocked(api.get).mockResolvedValueOnce([pendiente(1, "Ana"), pendiente(2, "Bruno")]);
    render(<ReembolsosPanel idEvento={5} onCambio={vi.fn()} />);

    expect(await screen.findByText(/2 compras/)).toBeInTheDocument();
    expect(screen.getByText(/\$\s?10\.000/)).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
  });

  it("aclara que se devuelve todo lo pagado (con el cargo) y que la comisión de Mercado Pago la absorbe el organizador", async () => {
    vi.mocked(api.get).mockResolvedValueOnce([pendiente(1, "Ana")]);
    render(<ReembolsosPanel idEvento={5} onCambio={vi.fn()} />);

    expect(await screen.findByText(/cargo por procesamiento incluido si lo pagó/)).toBeInTheDocument();
    expect(screen.getByText(/Mercado Pago no devuelve su comisión cuando hay un reembolso: la absorbés vos/)).toBeInTheDocument();
  });

  it("pide confirmar antes de devolver el dinero y avisa que sale de su cuenta", async () => {
    vi.mocked(api.get).mockResolvedValueOnce([pendiente(1, "Ana")]);
    render(<ReembolsosPanel idEvento={5} onCambio={vi.fn()} />);

    await userEvent.click(await screen.findByRole("button", { name: /reembolsar todas/i }));

    expect(screen.getByText(/tu cuenta de Mercado Pago/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("reembolsa todo, muestra el resultado y vuelve a cargar los pendientes", async () => {
    const onCambio = vi.fn();
    vi.mocked(api.get).mockResolvedValueOnce([pendiente(1, "Ana"), pendiente(2, "Bruno")]).mockResolvedValueOnce([]);
    vi.mocked(api.post).mockResolvedValueOnce({ reembolsadas: 2, montoReembolsado: 10000, fallidas: [] });
    render(<ReembolsosPanel idEvento={5} onCambio={onCambio} />);

    await userEvent.click(await screen.findByRole("button", { name: /reembolsar todas/i }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/tickets/evento/5/reembolsos"));
    expect(await screen.findByText(/2 compras reembolsadas/i)).toBeInTheDocument();
    expect(onCambio).toHaveBeenCalled();
    expect(await screen.findByText(/no hay compras pendientes de reembolso/i)).toBeInTheDocument();
  });

  it("si algunas fallan las lista con su motivo y se pueden reintentar", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce([pendiente(1, "Ana"), pendiente(2, "Bruno")])
      .mockResolvedValueOnce([pendiente(2, "Bruno")]);
    vi.mocked(api.post).mockResolvedValueOnce({
      reembolsadas: 1,
      montoReembolsado: 5000,
      fallidas: [{ idEntrada: 2, nombreComprador: null, emailComprador: null, motivo: "Mercado Pago no pudo devolver el dinero (por ejemplo, por saldo insuficiente en tu cuenta)" }],
    });
    render(<ReembolsosPanel idEvento={5} onCambio={vi.fn()} />);

    await userEvent.click(await screen.findByRole("button", { name: /reembolsar todas/i }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByText(/1 compra reembolsada/i)).toBeInTheDocument();
    expect(await screen.findByText(/saldo insuficiente/)).toBeInTheDocument();
    expect(screen.getByText(/Bruno/)).toBeInTheDocument(); // se muestra a quién no se pudo (con los datos de la lista)
    expect(await screen.findByRole("button", { name: /reintentar/i })).toBeInTheDocument();
  });

  it("si el backend rechaza el pedido (ej. sin cuenta vinculada) muestra su mensaje", async () => {
    vi.mocked(api.get).mockResolvedValueOnce([pendiente(1, "Ana")]);
    vi.mocked(api.post).mockRejectedValueOnce(new ApiError({ status: 409, error: "Tu cuenta de Mercado Pago no está vinculada", path: "/tickets/evento/5/reembolsos", timestamp: "" }));
    render(<ReembolsosPanel idEvento={5} onCambio={vi.fn()} />);

    await userEvent.click(await screen.findByRole("button", { name: /reembolsar todas/i }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByText("Tu cuenta de Mercado Pago no está vinculada")).toBeInTheDocument();
  });
});
