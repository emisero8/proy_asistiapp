import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { Toaster } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OrganizadorEventoDetallePage } from "./EventoDetallePage";
import { DialogProvider } from "../../components/DialogProvider";
import { api, ApiError } from "../../lib/api";
import type { EntradaResponseDTO, EventoMetricasResponseDTO, EventoResponseDTO } from "../../lib/types";

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn(), patch: vi.fn() } };
});
vi.mock("../../components/EventMap", () => ({ MapView: () => <div data-testid="map-view" /> }));
// jsdom no tiene layout: los gráficos de recharts no miden nada, acá solo importan los datos de las tablas.
vi.mock("recharts", () => {
  const Passthrough = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  const Nada = () => null;
  return { ResponsiveContainer: Passthrough, BarChart: Passthrough, Bar: Passthrough, Cell: Nada, XAxis: Nada, YAxis: Nada, Tooltip: Nada };
});

const EVENTO: EventoResponseDTO = {
  id: 5,
  idOrganizador: 1,
  nombre: "Festival de Jazz",
  descripcion: null,
  fechaEvento: "2099-12-31",
  horaEvento: "21:00:00",
  lugar: "Anfiteatro Municipal",
  latitud: null,
  longitud: null,
  imagenPortadaUrl: null,
  estado: "Publicado",
  urlPublica: "festival-de-jazz",
  fechaCreacion: "2026-01-01T00:00:00",
  fechaPublicacion: "2026-01-02T00:00:00",
  fechaCancelacion: null,
  tandas: [],
};

const METRICAS: EventoMetricasResponseDTO = {
  idEvento: 5,
  nombreEvento: "Festival de Jazz",
  entradasVendidas: 3,
  entradasValidadas: 1,
  ingresosTotales: 26000,
  cupoTotal: 100,
  cupoDisponible: 97,
  tandas: [
    { idTanda: 11, nombre: "Anticipada", cupoMaximo: 50, cupoDisponible: 48, vendidas: 2, ingresos: 10000 },
    { idTanda: 12, nombre: "VIP", cupoMaximo: 50, cupoDisponible: 49, vendidas: 1, ingresos: 16000 },
  ],
};

function entrada(id: number, nombre: string, extra: Partial<EntradaResponseDTO> = {}): EntradaResponseDTO {
  return {
    id,
    idTanda: 11,
    idEvento: 5,
    nombreEvento: "Festival de Jazz",
    nombreTanda: "Anticipada",
    precioTanda: 5000,
    codigoQr: `QR-${id}`,
    nombreComprador: nombre,
    emailComprador: `${nombre.split(" ")[0].toLowerCase()}@test.com`,
    estado: "Pagada",
    canalVenta: "Online",
    fechaCompra: `2026-03-0${id}T10:00:00`,
    fechaUso: null,
    ...extra,
  };
}

const ENTRADAS = [
  entrada(1, "Ana Pérez"),
  entrada(2, "Bruno Díaz", { canalVenta: "Manual" }),
  entrada(3, "Carla Gómez", { estado: "Usada", fechaUso: "2026-03-03T22:00:00" }),
];

function apiError(message: string, status = 409) {
  return new ApiError({ status, error: message, path: "/x", timestamp: "2026-01-01T00:00:00" });
}

function renderPage() {
  return render(
    <DialogProvider>
      <Toaster />
      <MemoryRouter initialEntries={["/organizador/eventos/5"]}>
        <Routes>
          <Route path="/organizador/eventos/:id" element={<OrganizadorEventoDetallePage />} />
          <Route path="/organizador/eventos/:id/editar" element={<p>pantalla de edición</p>} />
          <Route path="/eventos/:urlPublica" element={<p>página pública</p>} />
        </Routes>
      </MemoryRouter>
    </DialogProvider>,
  );
}

/** Responde a cada endpoint según la URL, sin depender del orden en que la pantalla los pida. */
function mockGets(evento: EventoResponseDTO = EVENTO, entradas: EntradaResponseDTO[] = ENTRADAS) {
  vi.mocked(api.get).mockImplementation(async (path: string) => {
    if (path === "/eventos/5") return evento;
    if (path === "/eventos/5/metricas") return METRICAS;
    if (path === "/tickets/evento/5") return entradas;
    throw new Error(`GET inesperado: ${path}`);
  });
}

afterEach(() => {
  vi.mocked(api.get).mockReset();
  vi.mocked(api.patch).mockReset();
});

describe("OrganizadorEventoDetallePage — render", () => {
  it("muestra la cabecera, las métricas del evento y la tabla de ventas por tanda con su total", async () => {
    mockGets();
    renderPage();

    expect(await screen.findByRole("heading", { name: "Festival de Jazz" })).toBeInTheDocument();
    expect(screen.getByText("Publicado")).toBeInTheDocument();
    expect(screen.getByText(/Anfiteatro Municipal/)).toBeInTheDocument();
    expect(screen.getByText("97 / 100")).toBeInTheDocument(); // aforo disponible

    const tabla = screen.getByRole("table");
    expect(within(tabla).getByText("Anticipada")).toBeInTheDocument();
    expect(within(tabla).getByText("VIP")).toBeInTheDocument();
    const total = within(tabla).getByText("Total").closest("tr")!;
    expect(within(total).getByText("3")).toBeInTheDocument(); // entradas vendidas
    expect(within(total).getByText("$26.000")).toBeInTheDocument();
  });

  it("lista los compradores, del más reciente al más antiguo, con su estado y canal", async () => {
    mockGets();
    renderPage();
    await screen.findByText("Ana Pérez");

    expect(screen.getByText("3 de 3 entradas")).toBeInTheDocument();
    const nombres = screen.getAllByText(/Ana Pérez|Bruno Díaz|Carla Gómez/).map((el) => el.textContent);
    expect(nombres).toEqual(["Carla Gómez", "Bruno Díaz", "Ana Pérez"]); // por fechaCompra descendente

    // "Manual" y "Usada" también son filtros: se comprueba dentro de la fila de cada comprador.
    const fila = (nombre: string) => screen.getByText(nombre).closest("div.items-start") as HTMLElement;
    expect(within(fila("Bruno Díaz")).getByText("Manual")).toBeInTheDocument();
    expect(within(fila("Ana Pérez")).getByText("Online")).toBeInTheDocument();
    expect(within(fila("Ana Pérez")).getByText("Pagada")).toBeInTheDocument();
    expect(within(fila("Carla Gómez")).getByText("Usada")).toBeInTheDocument();
  });

  it("un evento en borrador no pide métricas ni entradas y avisa que hay que publicarlo", async () => {
    mockGets({ ...EVENTO, estado: "Borrador" });
    renderPage();

    expect(await screen.findByText("Este evento todavía está en borrador")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith("/eventos/5");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver" })).not.toBeInTheDocument(); // todavía no tiene página pública
  });

  it("un evento cancelado no ofrece editar, cancelar ni ver la página pública", async () => {
    mockGets({ ...EVENTO, estado: "Cancelado" });
    renderPage();
    await screen.findByRole("heading", { name: "Festival de Jazz" });

    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.queryByTitle("Cancelar evento")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver" })).not.toBeInTheDocument();
  });

  it("muestra el mensaje del backend si no se puede cargar el evento", async () => {
    vi.mocked(api.get).mockRejectedValue(apiError("Evento no encontrado", 404));
    renderPage();

    expect(await screen.findByText("Evento no encontrado")).toBeInTheDocument();
  });

  it("'Editar' lleva a la pantalla de edición del evento", async () => {
    const user = userEvent.setup();
    mockGets();
    renderPage();
    await screen.findByRole("heading", { name: "Festival de Jazz" });

    await user.click(screen.getByRole("button", { name: "Editar" }));
    expect(await screen.findByText("pantalla de edición")).toBeInTheDocument();
  });

  it("'Ver' lleva a la página pública del evento (solo si está publicado)", async () => {
    const user = userEvent.setup();
    mockGets();
    renderPage();
    await screen.findByRole("heading", { name: "Festival de Jazz" });

    await user.click(screen.getByRole("button", { name: "Ver" }));
    expect(await screen.findByText("página pública")).toBeInTheDocument();
  });
});

describe("OrganizadorEventoDetallePage — compradores", () => {
  it("filtra por texto (nombre o email) y avisa si nada coincide", async () => {
    const user = userEvent.setup();
    mockGets();
    renderPage();
    await screen.findByText("Ana Pérez");

    const buscador = screen.getByPlaceholderText("Buscar por nombre o email");
    await user.type(buscador, "bruno@");
    expect(screen.getByText("1 de 3 entradas")).toBeInTheDocument();
    expect(screen.getByText("Bruno Díaz")).toBeInTheDocument();
    expect(screen.queryByText("Ana Pérez")).not.toBeInTheDocument();

    await user.clear(buscador);
    await user.type(buscador, "nadie");
    expect(screen.getByText("Ninguna entrada coincide con la búsqueda.")).toBeInTheDocument();
  });

  it("filtra por estado y por canal de venta", async () => {
    const user = userEvent.setup();
    mockGets();
    renderPage();
    await screen.findByText("Ana Pérez");

    await user.click(screen.getByRole("button", { name: "Usada" }));
    expect(screen.getByText("Carla Gómez")).toBeInTheDocument();
    expect(screen.queryByText("Ana Pérez")).not.toBeInTheDocument();
    expect(screen.getByText("1 de 3 entradas")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Manual" }));
    expect(screen.getByText("Bruno Díaz")).toBeInTheDocument();
    expect(screen.queryByText("Carla Gómez")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Todas" }));
    expect(screen.getByText("3 de 3 entradas")).toBeInTheDocument();
  });

  it("sin ventas muestra el estado vacío", async () => {
    mockGets(EVENTO, []);
    renderPage();

    expect(await screen.findByText("Todavía no se vendieron entradas para este evento.")).toBeInTheDocument();
  });
});

describe("OrganizadorEventoDetallePage — cancelar el evento", () => {
  it("pide confirmación con el aviso de que no se devuelven créditos; 'No, volver' no cancela nada", async () => {
    const user = userEvent.setup();
    mockGets();
    renderPage();
    await screen.findByRole("heading", { name: "Festival de Jazz" });

    await user.click(screen.getByTitle("Cancelar evento"));
    const dialogo = await screen.findByRole("alertdialog", { name: "Cancelar evento" });
    expect(within(dialogo).getByText(/no se devuelven créditos/)).toBeInTheDocument();
    await user.click(within(dialogo).getByRole("button", { name: "No, volver" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it("al confirmar cancela el evento, avisa con un toast y recarga los datos", async () => {
    const user = userEvent.setup();
    mockGets();
    vi.mocked(api.patch).mockResolvedValueOnce({});
    renderPage();
    await screen.findByRole("heading", { name: "Festival de Jazz" });

    // Desde ahora el backend devuelve el evento ya cancelado.
    mockGets({ ...EVENTO, estado: "Cancelado" });
    await user.click(screen.getByTitle("Cancelar evento"));
    const dialogo = await screen.findByRole("alertdialog", { name: "Cancelar evento" });
    await user.click(within(dialogo).getByRole("button", { name: "Cancelar evento" }));

    expect(api.patch).toHaveBeenCalledWith("/eventos/5/cancelar");
    expect(await screen.findByText("Evento cancelado")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Cancelado")).toBeInTheDocument());
    expect(screen.queryByTitle("Cancelar evento")).not.toBeInTheDocument();
  });

  it("si el backend rechaza la cancelación muestra su mensaje y el evento sigue publicado", async () => {
    const user = userEvent.setup();
    mockGets();
    vi.mocked(api.patch).mockRejectedValueOnce(apiError("El evento ya fue cancelado"));
    renderPage();
    await screen.findByRole("heading", { name: "Festival de Jazz" });

    await user.click(screen.getByTitle("Cancelar evento"));
    const dialogo = await screen.findByRole("alertdialog", { name: "Cancelar evento" });
    await user.click(within(dialogo).getByRole("button", { name: "Cancelar evento" }));

    expect(await screen.findByText("El evento ya fue cancelado")).toBeInTheDocument();
    expect(screen.getByText("Publicado")).toBeInTheDocument();
  });
});
