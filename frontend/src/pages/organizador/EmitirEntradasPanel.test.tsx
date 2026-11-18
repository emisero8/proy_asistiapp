import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmitirEntradasPanel } from "./EmitirEntradasPanel";
import { api, ApiError } from "../../lib/api";
import type { EntradaResponseDTO, EventoResponseDTO, TandaResponseDTO } from "../../lib/types";

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, api: { ...actual.api, post: vi.fn() } };
});

afterEach(() => vi.mocked(api.post).mockReset());

function tanda(id: number, nombre: string, cupoDisponible: number): TandaResponseDTO {
  return { id, idEvento: 5, nombre, precio: 5000, cupoMaximo: 50, cupoDisponible, soloEmision: false, fechaInicioVigencia: null, fechaFinVigencia: null };
}

function evento(extra: Partial<EventoResponseDTO> = {}): EventoResponseDTO {
  return {
    id: 5,
    nombre: "Festival de Jazz",
    estado: "Publicado",
    finalizado: false,
    tandas: [tanda(11, "Anticipada", 8), tanda(12, "VIP", 0)],
    ...extra,
  } as EventoResponseDTO;
}

function entradaEmitida(id: number): EntradaResponseDTO {
  return {
    id,
    idTanda: 11,
    idEvento: 5,
    nombreEvento: "Festival de Jazz",
    nombreTanda: "Anticipada",
    precioTanda: 5000,
    codigoQr: `QR-${id}`,
    nombreComprador: "Ana Invitada",
    emailComprador: "ana@mail.com",
    estado: "Pagada",
    canalVenta: "Manual",
    fechaCompra: "2026-11-18T10:00:00",
    fechaUso: null,
    tipoEmision: "Cortesia",
    motivoEmision: null,
    fechaAnulacion: null,
    motivoAnulacion: null,
    reembolsadaEn: null,
  };
}

async function abrir() {
  await userEvent.click(screen.getByRole("button", { name: /Emitir entradas/ }));
}

async function completar({ nombre = "Ana Invitada", email = "ana@mail.com" } = {}) {
  await userEvent.type(screen.getByLabelText("Nombre de quien las recibe"), nombre);
  await userEvent.type(screen.getByLabelText("Email de quien las recibe"), email);
}

describe("EmitirEntradasPanel", () => {
  it("solo se ofrece en un evento publicado que todavía no terminó", () => {
    const { unmount } = render(<EmitirEntradasPanel evento={evento({ estado: "Borrador" })} onEmitidas={() => {}} />);
    expect(screen.queryByRole("button", { name: /Emitir entradas/ })).not.toBeInTheDocument();
    unmount();

    const { unmount: unmount2 } = render(<EmitirEntradasPanel evento={evento({ finalizado: true })} onEmitidas={() => {}} />);
    expect(screen.queryByRole("button", { name: /Emitir entradas/ })).not.toBeInTheDocument();
    unmount2();

    render(<EmitirEntradasPanel evento={evento()} onEmitidas={() => {}} />);
    expect(screen.getByRole("button", { name: /Emitir entradas/ })).toBeInTheDocument();
  });

  it("lista las tandas con su cupo y deshabilita las agotadas", async () => {
    render(<EmitirEntradasPanel evento={evento()} onEmitidas={() => {}} />);
    await abrir();

    const select = screen.getByLabelText("Tanda");
    expect(within(select).getByRole("option", { name: /Anticipada.*quedan 8/ })).toBeEnabled();
    expect(within(select).getByRole("option", { name: /VIP.*agotada/ })).toBeDisabled();
  });

  it("marca las tandas de cortesía en el selector", async () => {
    const prensa = { ...tanda(13, "Prensa", 5), soloEmision: true, precio: 0 };
    render(<EmitirEntradasPanel evento={evento({ tandas: [tanda(11, "Anticipada", 8), prensa] })} onEmitidas={() => {}} />);
    await abrir();

    const select = screen.getByLabelText("Tanda");
    expect(within(select).getByRole("option", { name: /Prensa \(cortesía\) — quedan 5/ })).toBeInTheDocument();
    expect(within(select).getByRole("option", { name: /^Anticipada — quedan 8/ })).toBeInTheDocument();
  });

  it("emite una cortesía con los datos del formulario y avisa el resultado", async () => {
    vi.mocked(api.post).mockResolvedValue([entradaEmitida(1), entradaEmitida(2)]);
    const onEmitidas = vi.fn();
    render(<EmitirEntradasPanel evento={evento()} onEmitidas={onEmitidas} />);
    await abrir();

    await userEvent.clear(screen.getByLabelText("Cantidad"));
    await userEvent.type(screen.getByLabelText("Cantidad"), "2");
    await completar();
    await userEvent.type(screen.getByLabelText(/Motivo/), "Prensa");
    await userEvent.click(screen.getByRole("button", { name: "Emitir 2 entradas" }));

    await waitFor(() => expect(onEmitidas).toHaveBeenCalled());
    expect(api.post).toHaveBeenCalledWith("/tickets/emision-organizador", {
      idTanda: 11,
      cantidad: 2,
      tipo: "Cortesia",
      nombreDestinatario: "Ana Invitada",
      emailDestinatario: "ana@mail.com",
      motivo: "Prensa",
      enviarMail: true,
    });
    // Quedan a la vista para copiar el enlace de cada una (por si no se mandan por mail).
    expect(await screen.findByText("QR-1")).toBeInTheDocument();
    expect(screen.getByText("QR-2")).toBeInTheDocument();
  });

  it("elegir 'pago por fuera' cambia el tipo y no mandar el mail lo respeta; sin motivo no lo manda", async () => {
    vi.mocked(api.post).mockResolvedValue([entradaEmitida(1)]);
    render(<EmitirEntradasPanel evento={evento()} onEmitidas={() => {}} />);
    await abrir();

    await userEvent.click(screen.getByLabelText(/Pago por fuera de la plataforma/));
    await userEvent.click(screen.getByLabelText(/Enviarles las entradas por mail/));
    await completar();
    await userEvent.click(screen.getByRole("button", { name: "Emitir 1 entrada" }));

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(api.post).toHaveBeenCalledWith("/tickets/emision-organizador", {
      idTanda: 11,
      cantidad: 1,
      tipo: "Pago_Externo",
      nombreDestinatario: "Ana Invitada",
      emailDestinatario: "ana@mail.com",
      motivo: undefined,
      enviarMail: false,
    });
  });

  it("no deja pedir más entradas que el cupo de la tanda", async () => {
    render(<EmitirEntradasPanel evento={evento()} onEmitidas={() => {}} />);
    await abrir();

    await userEvent.clear(screen.getByLabelText("Cantidad"));
    await userEvent.type(screen.getByLabelText("Cantidad"), "9");
    await completar();

    expect(screen.getByText(/Solo quedan 8/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Emitir/ })).toBeDisabled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("no deja emitir sin nombre ni email", async () => {
    render(<EmitirEntradasPanel evento={evento()} onEmitidas={() => {}} />);
    await abrir();

    expect(screen.getByRole("button", { name: /^Emitir/ })).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Nombre de quien las recibe"), "Ana");
    expect(screen.getByRole("button", { name: /^Emitir/ })).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Email de quien las recibe"), "no-es-un-mail");
    expect(screen.getByRole("button", { name: /^Emitir/ })).toBeDisabled();
  });

  it("si el backend rechaza la emisión muestra su mensaje y no avisa que se emitió", async () => {
    vi.mocked(api.post).mockRejectedValue(
      new ApiError({ status: 422, error: "Solo quedan 3 entradas en la tanda \"Anticipada\"", path: "/tickets/emision-organizador", timestamp: "t" }),
    );
    const onEmitidas = vi.fn();
    render(<EmitirEntradasPanel evento={evento()} onEmitidas={onEmitidas} />);
    await abrir();
    await completar();
    await userEvent.click(screen.getByRole("button", { name: "Emitir 1 entrada" }));

    expect(await screen.findByText(/Solo quedan 3 entradas/)).toBeInTheDocument();
    expect(onEmitidas).not.toHaveBeenCalled();
  });
});
