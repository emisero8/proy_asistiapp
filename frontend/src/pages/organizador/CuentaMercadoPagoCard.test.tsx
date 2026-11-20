import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toaster } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CuentaMercadoPagoCard } from "./CuentaMercadoPagoCard";
import { api, ApiError } from "../../lib/api";
import type { EstadoCuentaMpResponseDTO } from "../../lib/types";

const redirigirA = vi.hoisted(() => vi.fn());

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn(), post: vi.fn(), delete: vi.fn() } };
});
vi.mock("../../lib/navegacion", () => ({ redirigirA }));

const SIN_CUENTA: EstadoCuentaMpResponseDTO = { vinculada: false, estado: null, mpUserId: null, vinculadaEn: null, obligatoria: true };
const VINCULADA: EstadoCuentaMpResponseDTO = { vinculada: true, estado: "Vinculada", mpUserId: 555, vinculadaEn: "2026-11-17T10:30:00", obligatoria: true };
const REVOCADA: EstadoCuentaMpResponseDTO = { vinculada: false, estado: "Revocada", mpUserId: 555, vinculadaEn: "2026-10-01T10:30:00", obligatoria: true };

function renderCard() {
  return render(
    <>
      <Toaster />
      <CuentaMercadoPagoCard />
    </>,
  );
}

beforeEach(() => {
  window.history.replaceState({}, "", "/organizador/perfil");
});

afterEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockReset();
  vi.mocked(api.post).mockReset();
  vi.mocked(api.delete).mockReset();
});

describe("CuentaMercadoPagoCard", () => {
  it("sin cuenta explica que el dinero va directo a ella y ofrece vincular", async () => {
    vi.mocked(api.get).mockResolvedValue(SIN_CUENTA);
    renderCard();

    expect(await screen.findByText(/Todavía no vinculaste tu cuenta/)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/organizador/mercadopago/estado");
    expect(screen.getByRole("button", { name: "Vincular Mercado Pago" })).toBeEnabled();
  });

  it("vincular pide la URL al backend y redirige al organizador a Mercado Pago", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue(SIN_CUENTA);
    vi.mocked(api.post).mockResolvedValue({ urlAutorizacion: "https://auth.mercadopago.com/authorization?state=abc" });
    renderCard();

    await user.click(await screen.findByRole("button", { name: "Vincular Mercado Pago" }));

    expect(api.post).toHaveBeenCalledWith("/organizador/mercadopago/vincular");
    await waitFor(() => expect(redirigirA).toHaveBeenCalledWith("https://auth.mercadopago.com/authorization?state=abc"));
  });

  it("si no se puede iniciar la vinculación muestra el motivo y no redirige", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue(SIN_CUENTA);
    vi.mocked(api.post).mockRejectedValue(
      new ApiError({ status: 502, error: "No pudimos comunicarnos con Mercado Pago", path: "/x", timestamp: "2026-01-01T00:00:00" }),
    );
    renderCard();

    await user.click(await screen.findByRole("button", { name: "Vincular Mercado Pago" }));

    expect(await screen.findByText("No pudimos comunicarnos con Mercado Pago")).toBeInTheDocument();
    expect(redirigirA).not.toHaveBeenCalled();
  });

  it("con cuenta vinculada la muestra como activa con su usuario y la fecha", async () => {
    vi.mocked(api.get).mockResolvedValue(VINCULADA);
    renderCard();

    expect(await screen.findByText("Cuenta vinculada")).toBeInTheDocument();
    expect(screen.getByText(/Usuario de Mercado Pago: 555/)).toBeInTheDocument();
    expect(screen.getByText(/17\/11\/2026/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Vincular Mercado Pago" })).not.toBeInTheDocument();
  });

  it("desvincular pide confirmación: cancelar no toca la API; confirmar borra y vuelve al estado sin cuenta", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue(VINCULADA);
    vi.mocked(api.delete).mockResolvedValue(undefined);
    renderCard();

    await user.click(await screen.findByRole("button", { name: "Desvincular" }));
    await user.click(screen.getByRole("button", { name: "No, mantener" }));
    expect(api.delete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Desvincular" }));
    await user.click(screen.getByRole("button", { name: "Sí, desvincular" }));

    expect(api.delete).toHaveBeenCalledWith("/organizador/mercadopago");
    expect(await screen.findByText(/Todavía no vinculaste tu cuenta/)).toBeInTheDocument();
  });

  it("una cuenta revocada avisa que hay que vincular de nuevo", async () => {
    vi.mocked(api.get).mockResolvedValue(REVOCADA);
    renderCard();

    expect(await screen.findByText(/Mercado Pago ya no acepta el acceso/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Volver a vincular" })).toBeEnabled();
  });

  it("si falla la carga del estado lo avisa", async () => {
    vi.mocked(api.get).mockRejectedValue(
      new ApiError({ status: 500, error: "Falla interna", path: "/x", timestamp: "2026-01-01T00:00:00" }),
    );
    renderCard();

    expect(await screen.findByText("Falla interna")).toBeInTheDocument();
  });

  it.each([
    ["ok", /Cuenta de Mercado Pago vinculada/],
    ["cancelado", /No autorizaste la vinculación/],
    ["error", /No pudimos vincular tu cuenta/],
  ])("al volver de Mercado Pago con ?mp=%s avisa el resultado y limpia la dirección", async (resultado, texto) => {
    window.history.replaceState({}, "", `/organizador/perfil?mp=${resultado}`);
    vi.mocked(api.get).mockResolvedValue(resultado === "ok" ? VINCULADA : SIN_CUENTA);
    renderCard();

    expect((await screen.findAllByText(texto)).length).toBeGreaterThan(0);
    expect(window.location.search).toBe("");
  });
});
