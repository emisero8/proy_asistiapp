import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OrganizadorWizardPage, validarTandaContraEvento } from "./WizardPage";
import { api, ApiError } from "../../lib/api";
import type { MovimientoCreditoResponseDTO } from "../../lib/types";

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } };
});

// Leaflet necesita layout real (tamaños, tiles): el mapa se prueba aparte, acá es ruido.
vi.mock("../../components/EventMap", () => ({ MapPicker: () => <div data-testid="map-picker" /> }));

const FUTURO = "2099-12-31";

function movimiento(saldoResultante: number, monto = 0): MovimientoCreditoResponseDTO {
  return { id: 1, tipoMovimiento: "Consumo_Publicacion", monto, saldoResultante, fechaMovimiento: "2026-01-01T00:00:00", idTransaccionCredito: null, idEvento: null };
}

function apiError(message: string, status = 409) {
  return new ApiError({ status, error: message, path: "/eventos", timestamp: "2026-01-01T00:00:00" });
}

function renderWizard() {
  return render(
    <MemoryRouter>
      <OrganizadorWizardPage />
    </MemoryRouter>,
  );
}

/** Los `<input type="date">` de este formulario no tienen label asociado: se los toma por tipo, en orden de aparición. */
const fechas = (container: HTMLElement) => container.querySelectorAll<HTMLInputElement>('input[type="date"]');
const hora = (container: HTMLElement) => container.querySelector<HTMLInputElement>('input[type="time"]')!;

/** Completa el paso 1 con datos válidos. */
async function completarPaso1(container: HTMLElement, user: ReturnType<typeof userEvent.setup>, fecha = FUTURO) {
  await user.type(screen.getByPlaceholderText("Festival de Jazz al Aire Libre"), "Mi Recital");
  fireEvent.change(fechas(container)[0], { target: { value: fecha } });
  fireEvent.change(hora(container), { target: { value: "21:00" } });
  await user.type(screen.getByPlaceholderText(/Av\. Díaz Vélez/), "Club Demo");
}

async function avanzarAlPaso2(container: HTMLElement, user: ReturnType<typeof userEvent.setup>, fecha = FUTURO) {
  vi.mocked(api.post).mockResolvedValueOnce({ id: 77 });
  await completarPaso1(container, user, fecha);
  await user.click(screen.getByRole("button", { name: /Siguiente: configurar tandas/ }));
  await screen.findByText("Tanda 1");
}

async function completarTanda(user: ReturnType<typeof userEvent.setup>, nombre = "Anticipada", precio = "12000", cupo = "200") {
  // La primera tanda viene con el nombre "Anticipada" precargado: se limpia antes de escribir.
  const campoNombre = screen.getByPlaceholderText("Anticipada 1");
  await user.clear(campoNombre);
  await user.type(campoNombre, nombre);
  await user.type(screen.getByPlaceholderText("12000"), precio);
  await user.type(screen.getByPlaceholderText("200"), cupo);
}

afterEach(() => {
  vi.mocked(api.get).mockReset();
  vi.mocked(api.post).mockReset();
  vi.mocked(api.put).mockReset();
  vi.mocked(api.patch).mockReset();
});

describe("validarTandaContraEvento", () => {
  const ok = { precio: "12000", cupoMaximo: "200", desde: "", hasta: "" };

  it("no marca nada en una tanda válida ni en una todavía vacía (todavía no la llenó)", () => {
    expect(validarTandaContraEvento(ok, FUTURO)).toBeNull();
    expect(validarTandaContraEvento({ precio: "", cupoMaximo: "", desde: "", hasta: "" }, "")).toBeNull();
  });

  it("rechaza un precio negativo o que no es un número", () => {
    expect(validarTandaContraEvento({ ...ok, precio: "-5" }, FUTURO)).toBe("El precio no puede ser negativo.");
    expect(validarTandaContraEvento({ ...ok, precio: "abc" }, FUTURO)).toBe("El precio no puede ser negativo.");
  });

  it("acepta precio 0 (entrada gratuita)", () => {
    expect(validarTandaContraEvento({ ...ok, precio: "0" }, FUTURO)).toBeNull();
  });

  it("rechaza un cupo que no es un entero de 1 o más", () => {
    const msg = "El cupo debe ser un número entero de 1 o más.";
    expect(validarTandaContraEvento({ ...ok, cupoMaximo: "0" }, FUTURO)).toBe(msg);
    expect(validarTandaContraEvento({ ...ok, cupoMaximo: "2.5" }, FUTURO)).toBe(msg);
    expect(validarTandaContraEvento({ ...ok, cupoMaximo: "-3" }, FUTURO)).toBe(msg);
  });

  it("rechaza una ventana de venta invertida (desde posterior a hasta)", () => {
    expect(validarTandaContraEvento({ ...ok, desde: "2099-12-10", hasta: "2099-12-01" }, FUTURO)).toBe(
      "El inicio de la venta debe ser anterior al cierre.",
    );
  });

  it("rechaza que la venta cierre o empiece después de la fecha del evento", () => {
    expect(validarTandaContraEvento({ ...ok, hasta: "2100-01-01" }, FUTURO)).toBe("La venta no puede cerrar después de la fecha del evento.");
    expect(validarTandaContraEvento({ ...ok, desde: "2100-01-01" }, FUTURO)).toBe("La venta no puede empezar después de la fecha del evento.");
  });

  it("deja cerrar la venta el mismo día del evento", () => {
    expect(validarTandaContraEvento({ ...ok, desde: "2099-12-01", hasta: FUTURO }, FUTURO)).toBeNull();
  });
});

describe("OrganizadorWizardPage — paso 1", () => {
  it("con una fecha en el pasado avisa y no deja avanzar", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue([movimiento(5)]);
    const { container } = renderWizard();

    await completarPaso1(container, user, "2020-01-01");

    expect(screen.getByText("La fecha no puede estar en el pasado.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Siguiente: configurar tandas/ })).toBeDisabled();
  });

  it("con los datos obligatorios completos habilita el botón; sin ellos no", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue([movimiento(5)]);
    const { container } = renderWizard();
    const siguiente = screen.getByRole("button", { name: /Siguiente: configurar tandas/ });

    expect(siguiente).toBeDisabled();
    await completarPaso1(container, user);
    expect(siguiente).toBeEnabled();
  });

  it("crea el borrador con los datos del formulario y pasa al paso 2", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue([movimiento(5)]);
    const { container } = renderWizard();

    await avanzarAlPaso2(container, user);

    expect(api.post).toHaveBeenCalledWith("/eventos", {
      nombre: "Mi Recital",
      descripcion: undefined,
      fechaEvento: FUTURO,
      horaEvento: "21:00:00",
      lugar: "Club Demo",
      latitud: null,
      longitud: null,
      imagenPortadaUrl: undefined,
    });
  });

  it("si el backend rechaza el evento muestra su mensaje y se queda en el paso 1", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue([movimiento(5)]);
    vi.mocked(api.post).mockRejectedValueOnce(apiError("Ya existe un evento con ese nombre"));
    const { container } = renderWizard();

    await completarPaso1(container, user);
    await user.click(screen.getByRole("button", { name: /Siguiente: configurar tandas/ }));

    expect(await screen.findByText("Ya existe un evento con ese nombre")).toBeInTheDocument();
    expect(screen.queryByText("Tanda 1")).not.toBeInTheDocument();
  });

  it("si volvés del paso 2 y avanzás de nuevo, actualiza el borrador en vez de crear otro", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue([movimiento(5)]);
    vi.mocked(api.put).mockResolvedValueOnce({ id: 77 });
    const { container } = renderWizard();

    await avanzarAlPaso2(container, user);
    await user.click(screen.getByRole("button", { name: "Volver al paso anterior" }));
    await user.click(screen.getByRole("button", { name: /Siguiente: configurar tandas/ }));

    await screen.findByText("Tanda 1");
    expect(api.put).toHaveBeenCalledWith("/eventos/77", expect.objectContaining({ nombre: "Mi Recital" }));
    expect(api.post).toHaveBeenCalledTimes(1); // solo el alta original
  });
});

describe("OrganizadorWizardPage — paso 2 (tandas y publicación)", () => {
  it("'Publicar evento' queda deshabilitado hasta completar nombre, precio y cupo de la tanda", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue([movimiento(5)]);
    const { container } = renderWizard();
    await avanzarAlPaso2(container, user);

    const publicar = screen.getByRole("button", { name: "Publicar evento" });
    expect(publicar).toBeDisabled();
    await completarTanda(user);
    expect(publicar).toBeEnabled();
  });

  it("muestra el aviso y bloquea publicar si la venta cierra después de la fecha del evento", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue([movimiento(5)]);
    const { container } = renderWizard();
    await avanzarAlPaso2(container, user);
    await completarTanda(user);

    fireEvent.change(fechas(container)[1], { target: { value: "2100-01-01" } }); // "Venta hasta"

    expect(screen.getByText("La venta no puede cerrar después de la fecha del evento.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publicar evento" })).toBeDisabled();
  });

  it("sin créditos avisa cuánto saldo hay, ofrece comprarlos y bloquea publicar", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue([movimiento(0)]);
    const { container } = renderWizard();
    await avanzarAlPaso2(container, user);
    await completarTanda(user);

    expect(screen.getByText("No te alcanzan los créditos para publicar.")).toBeInTheDocument();
    expect(screen.getByText(/tu saldo es 0/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Comprar créditos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publicar evento" })).toBeDisabled();
  });

  it("agregar y eliminar tandas: solo se puede eliminar si queda más de una", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue([movimiento(5)]);
    const { container } = renderWizard();
    await avanzarAlPaso2(container, user);

    expect(screen.queryByRole("button", { name: /^Eliminar la tanda/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Agregar tanda" }));
    expect(screen.getByText("Tanda 2")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /^Eliminar la tanda/ })[1]);
    expect(screen.queryByText("Tanda 2")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Eliminar la tanda/ })).not.toBeInTheDocument();
  });

  it("publica: crea cada tanda, publica y muestra los créditos consumidos y el saldo restante", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get)
      .mockResolvedValueOnce([movimiento(5)]) // saldo al montar
      .mockResolvedValueOnce([movimiento(4, 1)]); // historial tras publicar
    vi.mocked(api.patch).mockResolvedValueOnce({});
    const { container } = renderWizard();
    await avanzarAlPaso2(container, user);
    await completarTanda(user, "Anticipada", "12000", "200");
    vi.mocked(api.post).mockResolvedValueOnce({}); // POST de la tanda

    await user.click(screen.getByRole("button", { name: "Publicar evento" }));

    expect(await screen.findByText("¡Evento publicado!")).toBeInTheDocument();
    expect(api.post).toHaveBeenLastCalledWith("/eventos/77/tandas", {
      nombre: "Anticipada",
      precio: 12000,
      cupoMaximo: 200,
      fechaInicioVigencia: undefined,
      fechaFinVigencia: undefined,
    });
    expect(api.patch).toHaveBeenCalledWith("/eventos/77/publicar");
    expect(screen.getByText("1 créditos")).toBeInTheDocument(); // consumidos
    expect(screen.getByText("4 créditos")).toBeInTheDocument(); // saldo restante
  });

  it("si la venta cierra el mismo día del evento, cierra a la hora del evento y no a las 23:59", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValueOnce([movimiento(5)]).mockResolvedValueOnce([movimiento(4, 1)]);
    vi.mocked(api.patch).mockResolvedValueOnce({});
    const { container } = renderWizard();
    await avanzarAlPaso2(container, user);
    await completarTanda(user);
    fireEvent.change(fechas(container)[1], { target: { value: FUTURO } }); // "Venta hasta" = día del evento
    vi.mocked(api.post).mockResolvedValueOnce({});

    await user.click(screen.getByRole("button", { name: "Publicar evento" }));

    await screen.findByText("¡Evento publicado!");
    expect(api.post).toHaveBeenLastCalledWith("/eventos/77/tandas", expect.objectContaining({ fechaFinVigencia: `${FUTURO}T21:00:00` }));
  });

  it("si la publicación falla (ej. saldo insuficiente en el backend) muestra el error y no muestra éxito", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue([movimiento(5)]);
    vi.mocked(api.patch).mockRejectedValueOnce(apiError("Créditos insuficientes", 402));
    const { container } = renderWizard();
    await avanzarAlPaso2(container, user);
    await completarTanda(user);
    vi.mocked(api.post).mockResolvedValueOnce({});

    await user.click(screen.getByRole("button", { name: "Publicar evento" }));

    expect(await screen.findByText("Créditos insuficientes")).toBeInTheDocument();
    expect(screen.queryByText("¡Evento publicado!")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Publicar evento" })).toBeEnabled());
  });
});
