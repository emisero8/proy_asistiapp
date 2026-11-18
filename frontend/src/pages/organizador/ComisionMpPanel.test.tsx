import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ComisionMpPanel, InfoComisionesMp } from "./ComisionMpPanel";
import { api, ApiError } from "../../lib/api";
import type { PerfilResponseDTO } from "../../lib/types";

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, api: { ...actual.api, put: vi.fn() } };
});

const PERFIL: PerfilResponseDTO = {
  id: 1,
  nombre: "Ana",
  email: "ana@demo.com",
  fotoPerfilUrl: null,
  maxEntradasPorComprador: null,
  maxEntradasPorCompradorPlataforma: 6,
  contactoWhatsapp: null,
  contactoEmail: null,
  trasladarCargoMp: false,
  plazoLiberacionMp: "AlInstante",
  zonaComisionMp: "General",
  porcentajeCargoComprador: 8.24,
};

afterEach(() => vi.resetAllMocks());

function renderPanel(perfil: PerfilResponseDTO = PERFIL) {
  const onGuardado = vi.fn();
  render(<ComisionMpPanel perfil={perfil} onGuardado={onGuardado} />);
  return { onGuardado };
}

const opcion = (nombre: RegExp) => screen.getByRole("radio", { name: nombre });
const guardar = () => screen.getByRole("button", { name: "Guardar preferencia de comisión" });

describe("ComisionMpPanel", () => {
  it("por defecto la comisión la absorbe el organizador y no hay nada para guardar", () => {
    renderPanel();

    expect(opcion(/La absorbo yo/)).toHaveAttribute("aria-checked", "true");
    expect(opcion(/La paga el comprador/)).toHaveAttribute("aria-checked", "false");
    // Sin trasladar no se piden plazo ni zona.
    expect(screen.queryByText("Plazo de liberación")).not.toBeInTheDocument();
    expect(guardar()).toBeDisabled();
  });

  it("al elegir que la pague el comprador pide plazo y zona y muestra cuánto paga en un ejemplo", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(opcion(/La paga el comprador/));

    expect(screen.getByText("Plazo de liberación")).toBeInTheDocument();
    expect(screen.getByText("Zona")).toBeInTheDocument();
    const ejemplo = screen.getByLabelText("Ejemplo con una entrada de $10.000");
    expect(within(ejemplo).getByText("+ $823,79")).toBeInTheDocument();
    expect(within(ejemplo).getByText("$10.823,79")).toBeInTheDocument();
    expect(guardar()).toBeEnabled();
  });

  it("cambiar el plazo recalcula el cargo del ejemplo", async () => {
    const user = userEvent.setup();
    renderPanel({ ...PERFIL, trasladarCargoMp: true });

    await user.click(screen.getByRole("combobox", { name: /Plazo de liberación/ }));
    await user.click(screen.getByRole("option", { name: "En 35 días" }));

    expect(screen.getByText("+ $183,60")).toBeInTheDocument();
  });

  it("guarda la preferencia con el contrato del backend y avisa al perfil", async () => {
    const user = userEvent.setup();
    const actualizado = { ...PERFIL, trasladarCargoMp: true };
    vi.mocked(api.put).mockResolvedValueOnce(actualizado);
    const { onGuardado } = renderPanel();

    await user.click(opcion(/La paga el comprador/));
    await user.click(screen.getByRole("combobox", { name: /^Zona/ }));
    await user.click(screen.getByRole("option", { name: "Buenos Aires, Entre Ríos o Chubut" }));
    await user.click(guardar());

    expect(api.put).toHaveBeenCalledWith("/organizador/perfil/comision-mp", {
      trasladarAlComprador: true,
      plazoLiberacion: "AlInstante",
      zona: "BuenosAiresEntreRiosChubut",
    });
    await waitFor(() => expect(onGuardado).toHaveBeenCalledWith(actualizado));
  });

  it("si el backend rechaza el cambio muestra el motivo", async () => {
    const user = userEvent.setup();
    vi.mocked(api.put).mockRejectedValueOnce(
      new ApiError({ status: 400, error: "Elegí tu zona", path: "/x", timestamp: "2026-01-01T00:00:00" }),
    );
    renderPanel();

    await user.click(opcion(/La paga el comprador/));
    await user.click(guardar());

    expect(await screen.findByText("Elegí tu zona")).toBeInTheDocument();
  });
});

describe("InfoComisionesMp", () => {
  it("está cerrado y al abrirlo muestra la tabla de comisiones por plazo y el paso a paso", async () => {
    const user = userEvent.setup();
    render(<InfoComisionesMp />);
    const boton = screen.getByRole("button", { name: "Ver comisiones y plazos de Mercado Pago" });

    expect(boton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await user.click(boton);

    expect(boton).toHaveAttribute("aria-expanded", "true");
    const tabla = screen.getByRole("table", { name: /Comisión de Mercado Pago/ });
    const alInstante = within(tabla).getByRole("row", { name: /Al instante/ });
    expect(alInstante).toHaveTextContent("6,29 % + IVA");
    expect(alInstante).toHaveTextContent("6,60 % + IVA");
    expect(within(tabla).getByRole("row", { name: /En 35 días/ })).toHaveTextContent("1,49 % + IVA");
    expect(screen.getByRole("heading", { name: "Cómo cambiar tu plazo de liberación en Mercado Pago" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });
});
