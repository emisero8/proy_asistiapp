import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrganizadorEditEventPage } from "./EditEventPage";
import { DialogProvider } from "../../components/DialogProvider";
import { api, ApiError } from "../../lib/api";

/** GET /creditos/resumen: siempre responde el saldo; el resto de los GET consume la cola de cada test. */
const RESUMEN_CREDITOS = { saldo: 500, costoPublicacion: 1, disponibleParaEntradas: 499 };
let colaGet: unknown[] = [];
function responderGets(...valores: unknown[]) {
  colaGet = [...valores];
}
import type { EventoResponseDTO, TandaResponseDTO } from "../../lib/types";

const auth = vi.hoisted(() => ({ rol: "Organizador" as "Organizador" | "Administrador" }));

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});
vi.mock("../../lib/auth", () => ({ useAuth: () => ({ session: { rol: auth.rol, nombre: "Test" } }) }));
vi.mock("../../components/EventMap", () => ({ MapPicker: () => <div data-testid="map-picker" /> }));

const TANDA: TandaResponseDTO = {
  id: 11,
  idEvento: 5,
  nombre: "General",
  precio: 5000,
  cupoMaximo: 10,
  cupoDisponible: 7, // → 3 vendidas
  fechaInicioVigencia: null,
  fechaFinVigencia: null,
};

const EVENTO: EventoResponseDTO = {
  id: 5,
  idOrganizador: 1,
  nombre: "Mi Evento",
  descripcion: "Una descripción",
  fechaEvento: "2099-12-31",
  horaEvento: "21:00:00",
  lugar: "Club Demo",
  latitud: null,
  longitud: null,
  imagenPortadaUrl: null,
  estado: "Publicado",
  urlPublica: "mi-evento",
  fechaCreacion: "2026-01-01T00:00:00",
  fechaPublicacion: "2026-01-02T00:00:00",
  fechaCancelacion: null,
  tandas: [TANDA],
};

function apiError(message: string, status = 409) {
  return new ApiError({ status, error: message, path: "/x", timestamp: "2026-01-01T00:00:00" });
}

function renderPage() {
  return render(
    <DialogProvider>
      <MemoryRouter initialEntries={["/organizador/eventos/5/editar"]}>
        <Routes>
          <Route path="/organizador/eventos/:id/editar" element={<OrganizadorEditEventPage />} />
        </Routes>
      </MemoryRouter>
    </DialogProvider>,
  );
}

async function cargado() {
  await screen.findByDisplayValue("Mi Evento");
}

beforeEach(() => {
  auth.rol = "Organizador";
  colaGet = [];
  vi.mocked(api.get).mockImplementation(async (path: string) => {
    if (path === "/creditos/resumen") return RESUMEN_CREDITOS;
    const siguiente = colaGet.shift();
    if (siguiente instanceof Error) throw siguiente;
    return siguiente;
  });
});

afterEach(() => {
  vi.mocked(api.get).mockReset();
  vi.mocked(api.post).mockReset();
  vi.mocked(api.put).mockReset();
  vi.mocked(api.delete).mockReset();
});

describe("OrganizadorEditEventPage — carga", () => {
  it("carga el evento y vuelca sus datos y tandas en el formulario", async () => {
    responderGets(EVENTO);
    renderPage();
    await cargado();

    expect(api.get).toHaveBeenCalledWith("/eventos/5");
    expect(screen.getByDisplayValue("Una descripción")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Club Demo")).toBeInTheDocument();
    expect(screen.getByDisplayValue("21:00")).toBeInTheDocument(); // sin los segundos
    expect(screen.getByDisplayValue("General")).toBeInTheDocument();
    expect(screen.getByText(/3 vendidas · 7 disponibles/)).toBeInTheDocument();
    expect(screen.getByText(/evento está publicado y en venta/i)).toBeInTheDocument();
  });

  it("el Organizador usa /eventos/* y el Admin /admin/eventos/* (sin chequeo de propiedad)", async () => {
    auth.rol = "Administrador";
    responderGets(EVENTO);
    renderPage();
    await cargado();

    expect(api.get).toHaveBeenCalledWith("/admin/eventos/5");
    expect(screen.getByRole("button", { name: /Volver a eventos/ })).toBeInTheDocument();
  });

  it("muestra el mensaje del backend si no se puede cargar el evento", async () => {
    responderGets(apiError("Evento no encontrado", 404));
    renderPage();

    expect(await screen.findByText("Evento no encontrado")).toBeInTheDocument();
    expect(screen.queryByText("Datos del evento")).not.toBeInTheDocument();
  });

  it("un evento cancelado no se puede editar: avisa y no muestra el formulario", async () => {
    responderGets({ ...EVENTO, estado: "Cancelado" });
    renderPage();

    expect(await screen.findByText("Este evento está cancelado. No se puede editar.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar datos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Agregar tanda" })).not.toBeInTheDocument();
  });
});

describe("OrganizadorEditEventPage — datos del evento", () => {
  it("guarda los datos: PUT con el payload normalizado y confirma", async () => {
    const user = userEvent.setup();
    responderGets(EVENTO);
    vi.mocked(api.put).mockResolvedValueOnce({ ...EVENTO, nombre: "Nombre Nuevo" });
    renderPage();
    await cargado();

    const nombre = screen.getByDisplayValue("Mi Evento");
    await user.clear(nombre);
    await user.type(nombre, "  Nombre Nuevo  ");
    await user.click(screen.getByRole("button", { name: "Guardar datos" }));

    expect(await screen.findByText("Datos del evento guardados.")).toBeInTheDocument();
    expect(api.put).toHaveBeenCalledWith("/eventos/5", {
      nombre: "Nombre Nuevo", // recortado
      descripcion: "Una descripción",
      fechaEvento: "2099-12-31",
      horaEvento: "21:00:00",
      lugar: "Club Demo",
      latitud: null,
      longitud: null,
      imagenPortadaUrl: undefined,
    });
    expect(screen.getByDisplayValue("Nombre Nuevo")).toBeInTheDocument(); // refleja lo que devolvió el backend
  });

  it("con la fecha en el pasado avisa y deshabilita 'Guardar datos'", async () => {
    responderGets(EVENTO);
    const { container } = renderPage();
    await cargado();

    fireEvent.change(container.querySelector<HTMLInputElement>('input[type="date"]')!, { target: { value: "2020-01-01" } });

    expect(screen.getByText("La fecha no puede estar en el pasado.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar datos" })).toBeDisabled();
  });

  it("si el backend rechaza el guardado muestra su mensaje", async () => {
    const user = userEvent.setup();
    responderGets(EVENTO);
    vi.mocked(api.put).mockRejectedValueOnce(apiError("No se puede editar un evento cancelado"));
    renderPage();
    await cargado();

    await user.click(screen.getByRole("button", { name: "Guardar datos" }));

    expect(await screen.findByText("No se puede editar un evento cancelado")).toBeInTheDocument();
    expect(screen.queryByText("Datos del evento guardados.")).not.toBeInTheDocument();
  });
});

describe("OrganizadorEditEventPage — tandas", () => {
  it("el cupo no puede bajar de lo ya vendido: avisa y bloquea 'Guardar tanda'", async () => {
    const user = userEvent.setup();
    responderGets(EVENTO);
    renderPage();
    await cargado();

    const cupo = screen.getByDisplayValue("10");
    await user.clear(cupo);
    await user.type(cupo, "2");

    expect(screen.getByText("El cupo no puede bajar de las 3 entradas ya vendidas.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar tanda" })).toBeDisabled();
  });

  it("guarda una tanda existente con PUT y recarga el evento", async () => {
    const user = userEvent.setup();
    const actualizado = { ...EVENTO, tandas: [{ ...TANDA, precio: 6500 }] };
    responderGets(EVENTO, actualizado);
    vi.mocked(api.put).mockResolvedValueOnce({});
    renderPage();
    await cargado();

    const precio = screen.getByDisplayValue("5000");
    await user.clear(precio);
    await user.type(precio, "6500");
    await user.click(screen.getByRole("button", { name: "Guardar tanda" }));

    expect(await screen.findByText("Tanda guardada.")).toBeInTheDocument();
    expect(api.put).toHaveBeenCalledWith("/eventos/5/tandas/11", {
      nombre: "General",
      precio: 6500,
      cupoMaximo: 10,
      fechaInicioVigencia: undefined,
      fechaFinVigencia: undefined,
    });
    expect(screen.getByDisplayValue("6500")).toBeInTheDocument();
  });

  it("agrega una tanda nueva y la crea con POST", async () => {
    const user = userEvent.setup();
    const conNueva = { ...EVENTO, tandas: [TANDA, { ...TANDA, id: 12, nombre: "VIP", precio: 9000 }] };
    responderGets(EVENTO, conNueva);
    vi.mocked(api.post).mockResolvedValueOnce({});
    renderPage();
    await cargado();

    await user.click(screen.getByRole("button", { name: "Agregar tanda" }));
    expect(screen.getByText("Nueva tanda")).toBeInTheDocument();
    const crear = screen.getByRole("button", { name: "Crear tanda" });
    expect(crear).toBeDisabled(); // vacía

    const tarjeta = screen.getByText("Nueva tanda").closest("div.space-y-3") as HTMLElement;
    const [nombre, precio, cupo] = within(tarjeta).getAllByRole("textbox");
    await user.type(nombre, "VIP");
    await user.type(precio, "9000");
    await user.type(cupo, "50");
    await user.click(crear);

    expect(await screen.findByText("Tanda guardada.")).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith("/eventos/5/tandas", expect.objectContaining({ nombre: "VIP", precio: 9000, cupoMaximo: 50 }));
    expect(screen.getByDisplayValue("VIP")).toBeInTheDocument();
  });

  it("eliminar una tanda nueva sin guardar la quita al instante, sin confirmar ni llamar a la API", async () => {
    const user = userEvent.setup();
    responderGets(EVENTO);
    renderPage();
    await cargado();

    await user.click(screen.getByRole("button", { name: "Agregar tanda" }));
    await user.click(screen.getByRole("button", { name: /^Eliminar la tanda 2$/ }));

    expect(screen.queryByText("Nueva tanda")).not.toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it("eliminar una tanda guardada pide confirmación: cancelar no borra, confirmar sí y recarga", async () => {
    const user = userEvent.setup();
    responderGets(EVENTO, { ...EVENTO, tandas: [] });
    vi.mocked(api.delete).mockResolvedValueOnce(undefined);
    renderPage();
    await cargado();

    // 1) cancelar
    await user.click(screen.getByRole("button", { name: "Eliminar la tanda General" }));
    let dialogo = await screen.findByRole("alertdialog", { name: "Eliminar tanda" });
    expect(within(dialogo).getByText(/¿Eliminar la tanda "General"\?/)).toBeInTheDocument();
    await user.click(within(dialogo).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(api.delete).not.toHaveBeenCalled();

    // 2) confirmar
    await user.click(screen.getByRole("button", { name: "Eliminar la tanda General" }));
    dialogo = await screen.findByRole("alertdialog", { name: "Eliminar tanda" });
    await user.click(within(dialogo).getByRole("button", { name: "Eliminar" }));

    expect(await screen.findByText("Tanda eliminada.")).toBeInTheDocument();
    expect(api.delete).toHaveBeenCalledWith("/eventos/5/tandas/11");
    await waitFor(() => expect(screen.queryByDisplayValue("General")).not.toBeInTheDocument());
  });

  it("si el backend rechaza eliminar la tanda (ej. ya tiene ventas) muestra su mensaje y la tanda sigue", async () => {
    const user = userEvent.setup();
    responderGets(EVENTO);
    vi.mocked(api.delete).mockRejectedValueOnce(apiError("No se puede eliminar una tanda con entradas vendidas"));
    renderPage();
    await cargado();

    await user.click(screen.getByRole("button", { name: "Eliminar la tanda General" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Eliminar" }));

    expect(await screen.findByText("No se puede eliminar una tanda con entradas vendidas")).toBeInTheDocument();
    expect(screen.getByDisplayValue("General")).toBeInTheDocument();
  });
});
