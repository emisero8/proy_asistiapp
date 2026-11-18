import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EntradaAcciones } from "./EntradaAcciones";
import { api, ApiError } from "../../lib/api";
import type { EntradaResponseDTO } from "../../lib/types";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, api: { ...actual.api, post: vi.fn() } };
});

afterEach(() => {
  vi.mocked(api.post).mockReset();
  vi.clearAllMocks();
});

function entrada(extra: Partial<EntradaResponseDTO> = {}): EntradaResponseDTO {
  return {
    id: 9,
    idTanda: 11,
    idEvento: 5,
    nombreEvento: "Festival",
    fechaEvento: "2026-12-05", horaEvento: "22:00:00", lugarEvento: "Club Central", imagenPortadaUrl: null,
    nombreTanda: "General",
    precioTanda: 5000,
    codigoQr: "QR-9",
    nombreComprador: "Ana Pérez",
    emailComprador: "ana@test.com",
    estado: "Pagada",
    canalVenta: "Online",
    fechaCompra: "2026-03-01T10:00:00",
    fechaUso: null,
    tipoEmision: null,
    motivoEmision: null,
    fechaAnulacion: null,
    motivoAnulacion: null,
    reembolsadaEn: null,
    ...extra,
  };
}

function resultado(extra: Partial<{ reembolsada: boolean; avisoReembolso: string | null }> = {}) {
  return { entrada: entrada({ estado: "Anulada" }), reembolsada: false, avisoReembolso: null, ...extra };
}

describe("EntradaAcciones — qué se ofrece", () => {
  it("una entrada vigente se puede anular", () => {
    render(<EntradaAcciones entrada={entrada()} onCambio={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Anular" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reembolsar" })).not.toBeInTheDocument();
  });

  it("una entrada ya usada en la puerta no se puede anular ni reembolsar", () => {
    const { container } = render(<EntradaAcciones entrada={entrada({ estado: "Usada" })} onCambio={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("una anulada comprada online y sin reembolsar se puede reembolsar", () => {
    render(<EntradaAcciones entrada={entrada({ estado: "Anulada" })} onCambio={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Reembolsar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Anular" })).not.toBeInTheDocument();
  });

  it("una anulada que ya se reembolsó, o que no pasó por Mercado Pago, no ofrece nada", () => {
    const { container, rerender } = render(
      <EntradaAcciones entrada={entrada({ estado: "Anulada", reembolsadaEn: "2026-03-02T10:00:00" })} onCambio={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();

    rerender(<EntradaAcciones entrada={entrada({ estado: "Anulada", canalVenta: "Manual" })} onCambio={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("EntradaAcciones — anular", () => {
  it("pide confirmar, avisa que el crédito vuelve y anula con el motivo", async () => {
    const onCambio = vi.fn();
    vi.mocked(api.post).mockResolvedValueOnce(resultado());
    render(<EntradaAcciones entrada={entrada({ canalVenta: "Manual" })} onCambio={onCambio} />);

    await userEvent.click(screen.getByRole("button", { name: "Anular" }));
    expect(screen.getByText(/crédito de esta entrada vuelve/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled(); // todavía no: falta confirmar
    await userEvent.type(screen.getByLabelText("Motivo (opcional)"), "se equivocó de fecha");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar anulación" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/tickets/9/anular", { motivo: "se equivocó de fecha", reembolsar: false }),
    );
    expect(toast.success).toHaveBeenCalled();
    expect(onCambio).toHaveBeenCalled();
  });

  it("sin motivo manda null", async () => {
    vi.mocked(api.post).mockResolvedValueOnce(resultado());
    render(<EntradaAcciones entrada={entrada({ canalVenta: "Manual" })} onCambio={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Anular" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar anulación" }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/tickets/9/anular", { motivo: null, reembolsar: false }));
  });

  it("cancelar cierra el formulario sin anular nada", async () => {
    render(<EntradaAcciones entrada={entrada()} onCambio={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Anular" }));
    await userEvent.click(screen.getByRole("button", { name: "No, volver" }));

    expect(api.post).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Anular" })).toBeInTheDocument();
  });

  it("en una compra online ofrece devolver el dinero, y lo pide si se tilda", async () => {
    vi.mocked(api.post).mockResolvedValueOnce(resultado({ reembolsada: true }));
    render(<EntradaAcciones entrada={entrada()} onCambio={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Anular" }));
    await userEvent.click(screen.getByLabelText(/Devolverle el dinero/));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar anulación" }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/tickets/9/anular", { motivo: null, reembolsar: true }));
  });

  it("en una entrada manual o emitida por el Organizador no ofrece devolver dinero (no pasó por Mercado Pago)", async () => {
    render(<EntradaAcciones entrada={entrada({ canalVenta: "Manual" })} onCambio={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Anular" }));

    expect(screen.queryByLabelText(/Devolverle el dinero/)).not.toBeInTheDocument();
  });

  it("si se anuló pero el reembolso falló, lo avisa y dice cómo reintentar", async () => {
    const onCambio = vi.fn();
    vi.mocked(api.post).mockResolvedValueOnce(resultado({ avisoReembolso: "Mercado Pago no pudo devolver el dinero" }));
    render(<EntradaAcciones entrada={entrada()} onCambio={onCambio} />);

    await userEvent.click(screen.getByRole("button", { name: "Anular" }));
    await userEvent.click(screen.getByLabelText(/Devolverle el dinero/));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar anulación" }));

    await waitFor(() => expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining("Mercado Pago no pudo devolver el dinero")));
    expect(onCambio).toHaveBeenCalled(); // la entrada quedó anulada: la lista se actualiza
  });

  it("si el backend rechaza la anulación muestra su mensaje y no recarga", async () => {
    const onCambio = vi.fn();
    vi.mocked(api.post).mockRejectedValueOnce(new ApiError({ status: 409, error: "Esta entrada ya se usó en la puerta: no se puede anular", path: "/tickets/9/anular", timestamp: "" }));
    render(<EntradaAcciones entrada={entrada()} onCambio={onCambio} />);

    await userEvent.click(screen.getByRole("button", { name: "Anular" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar anulación" }));

    expect(await screen.findByText("Esta entrada ya se usó en la puerta: no se puede anular")).toBeInTheDocument();
    expect(onCambio).not.toHaveBeenCalled();
  });
});

describe("EntradaAcciones — reembolsar", () => {
  it("pide confirmar con el monto y a quién, y después reembolsa", async () => {
    const onCambio = vi.fn();
    vi.mocked(api.post).mockResolvedValueOnce(entrada({ estado: "Anulada", reembolsadaEn: "2026-03-02T10:00:00" }));
    render(<EntradaAcciones entrada={entrada({ estado: "Anulada" })} onCambio={onCambio} />);

    await userEvent.click(screen.getByRole("button", { name: "Reembolsar" }));
    expect(screen.getByText(/ana@test\.com/)).toBeInTheDocument();
    expect(screen.getByText(/tu cuenta de Mercado Pago/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar reembolso" }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/tickets/9/reembolsar"));
    expect(toast.success).toHaveBeenCalled();
    expect(onCambio).toHaveBeenCalled();
  });

  it("si Mercado Pago no puede devolver el dinero muestra el motivo y se puede reintentar", async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new ApiError({ status: 502, error: "Mercado Pago no pudo devolver el dinero (por ejemplo, por saldo insuficiente en tu cuenta)", path: "/tickets/9/reembolsar", timestamp: "" }));
    render(<EntradaAcciones entrada={entrada({ estado: "Anulada" })} onCambio={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Reembolsar" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar reembolso" }));

    expect(await screen.findByText(/saldo insuficiente/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar reembolso" })).toBeEnabled();
  });
});
