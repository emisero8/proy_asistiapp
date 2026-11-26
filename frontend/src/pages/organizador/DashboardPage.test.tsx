import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrganizadorDashboardPage } from "./DashboardPage";
import { DialogProvider } from "../../components/DialogProvider";
import { api } from "../../lib/api";
import type { EventoResponseDTO, ResumenOrganizadorResponseDTO } from "../../lib/types";

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn(), patch: vi.fn() } };
});
vi.mock("../../lib/auth", () => ({
  useAuth: () => ({ session: { id: 1, nombre: "Ana Organizadora", rol: "Organizador" } }),
}));

const RESUMEN: ResumenOrganizadorResponseDTO = {
  eventosPublicados: 1,
  eventosBorrador: 1,
  entradasVendidas: 0,
  entradasValidadas: 0,
  ingresosTotales: 0,
  creditosConsumidos: 2,
  saldoCreditos: 8,
  proximoEvento: null,
};

function evento(id: number, nombre: string, lugar: string, estado: EventoResponseDTO["estado"]): EventoResponseDTO {
  return {
    id,
    idOrganizador: 1,
    nombre,
    descripcion: null,
    fechaEvento: "2026-12-20",
    horaEvento: "21:00:00",
    lugar,
    latitud: null,
    longitud: null,
    imagenPortadaUrl: null,
    estado,
    urlPublica: `evt-${id}`,
    fechaCreacion: "2026-01-01T00:00:00",
    fechaPublicacion: null,
    fechaCancelacion: null,
    comenzado: false, finalizado: false,
    tandas: [],
  } as unknown as EventoResponseDTO;
}

// Orden que entrega el backend (del más nuevo al más antiguo). El Dashboard NO debe reordenarlo.
const LISTA = [
  evento(3, "Borrador del sábado", "Club Norte", "Borrador"),
  evento(2, "Recital de rock", "Estadio Sur", "Publicado"),
  evento(1, "Feria de bandas", "Club Norte", "Publicado"),
];

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DialogProvider>
        <OrganizadorDashboardPage />
      </DialogProvider>
    </MemoryRouter>,
  );
}

function titulosVisibles(): string[] {
  const lista = screen.getByText(/^Mis eventos/).closest("section") as HTMLElement;
  return within(lista)
    .getAllByText(/Borrador del sábado|Recital de rock|Feria de bandas/)
    .map((el) => el.textContent ?? "");
}

beforeEach(() => {
  vi.mocked(api.get).mockImplementation(async (path: string) => {
    if (path === "/eventos") return LISTA;
    if (path === "/eventos/resumen") return RESUMEN;
    return undefined;
  });
});

afterEach(() => {
  vi.mocked(api.get).mockReset();
});

describe("OrganizadorDashboardPage — Mis eventos", () => {
  it("respeta el orden del backend (no reordena por estado)", async () => {
    renderDashboard();
    await screen.findByText("Recital de rock");

    expect(titulosVisibles()).toEqual(["Borrador del sábado", "Recital de rock", "Feria de bandas"]);
  });

  it("la búsqueda filtra por nombre o por lugar", async () => {
    renderDashboard();
    await screen.findByText("Recital de rock");

    await userEvent.type(screen.getByLabelText("Buscar eventos por nombre o lugar"), "club norte");

    expect(titulosVisibles()).toEqual(["Borrador del sábado", "Feria de bandas"]);
    expect(screen.getByText("Mis eventos (2 de 3)")).toBeInTheDocument();
  });

  it("el filtro por estado muestra solo los publicados", async () => {
    renderDashboard();
    await screen.findByText("Recital de rock");

    // El filtro es un combobox editorial (SelectMenu): se abre y se elige la opción.
    await userEvent.click(screen.getByRole("combobox", { name: "Filtrar por estado" }));
    await userEvent.click(await screen.findByRole("option", { name: "Publicados" }));

    expect(titulosVisibles()).toEqual(["Recital de rock", "Feria de bandas"]);
  });

  it("avisa cuando ningún evento coincide con la búsqueda", async () => {
    renderDashboard();
    await screen.findByText("Recital de rock");

    await userEvent.type(screen.getByLabelText("Buscar eventos por nombre o lugar"), "no existe");

    expect(screen.getByText("Ningún evento coincide con la búsqueda.")).toBeInTheDocument();
  });
});

describe("OrganizadorDashboardPage — eventos finalizados", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockImplementation(async (path: string) => {
      if (path === "/eventos") return [{ ...evento(4, "Peña pasada", "Club Norte", "Publicado"), comenzado: false, finalizado: true }, ...LISTA];
      if (path === "/eventos/resumen") return RESUMEN;
      return undefined;
    });
  });

  it("lo marca como Finalizado y solo deja ver la página pública (sin editar ni cancelar)", async () => {
    const user = userEvent.setup();
    renderDashboard();

    const fila = (await screen.findByText("Peña pasada")).closest("li") as HTMLElement;
    expect(within(fila).getByText("Finalizado")).toBeInTheDocument();
    await user.click(within(fila).getByRole("button", { name: "Acciones de Peña pasada" }));

    expect(screen.getByRole("menuitem", { name: "Ver página pública" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Cancelar evento" })).not.toBeInTheDocument();
  });

  it("se filtra aparte de los publicados", async () => {
    const user = userEvent.setup();
    renderDashboard();
    await screen.findByText("Peña pasada");

    await user.click(screen.getByRole("combobox", { name: "Filtrar por estado" }));
    await user.click(await screen.findByRole("option", { name: "Publicados" }));
    expect(screen.queryByText("Peña pasada")).not.toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Filtrar por estado" }));
    await user.click(await screen.findByRole("option", { name: "Finalizados" }));
    expect(screen.getByText("Peña pasada")).toBeInTheDocument();
    expect(screen.queryByText("Recital de rock")).not.toBeInTheDocument();
  });
});

describe("OrganizadorDashboardPage — métricas", () => {
  it("usa una sola llamada de resumen y muestra créditos disponibles y usados", async () => {
    renderDashboard();
    await screen.findByText("Recital de rock");

    expect(api.get).toHaveBeenCalledWith("/eventos/resumen");
    expect(api.get).not.toHaveBeenCalledWith(expect.stringMatching(/\/eventos\/\d+\/metricas/));
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});

describe("OrganizadorDashboardPage — refresco de fondo (bug 2)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("un fallo del refresco no tapa el panel ya cargado", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderDashboard();
    expect(await screen.findByText("Recital de rock")).toBeInTheDocument();

    vi.mocked(api.get).mockClear();
    vi.mocked(api.get).mockRejectedValue(new Error("Failed to fetch"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000);
    });
    // El refresco se hizo y falló; se deja asentar la promesa rechazada antes de mirar.
    expect(api.get).toHaveBeenCalledWith("/eventos");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(screen.getByText("Recital de rock")).toBeInTheDocument();
    expect(screen.queryByText("No pudimos cargar tu panel.")).not.toBeInTheDocument();
  });

  it("si la primera carga falla, el refresco siguiente se recupera y saca el error", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(api.get).mockRejectedValue(new Error("Failed to fetch"));
    renderDashboard();
    expect(await screen.findByText("No pudimos cargar tu panel.")).toBeInTheDocument();

    vi.mocked(api.get).mockImplementation(async (path: string) => {
      if (path === "/eventos") return LISTA;
      if (path === "/eventos/resumen") return RESUMEN;
      return undefined;
    });
    await vi.advanceTimersByTimeAsync(20000);

    expect(await screen.findByText("Recital de rock")).toBeInTheDocument();
    expect(screen.queryByText("No pudimos cargar tu panel.")).not.toBeInTheDocument();
  });
});

describe("OrganizadorDashboardPage — error de carga", () => {
  it("muestra el error con 'Reintentar', que vuelve a pedir el panel", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockRejectedValue(new Error("Failed to fetch"));
    renderDashboard();
    expect(await screen.findByText("No pudimos cargar tu panel.")).toBeInTheDocument();

    vi.mocked(api.get).mockImplementation(async (path: string) => {
      if (path === "/eventos") return LISTA;
      if (path === "/eventos/resumen") return RESUMEN;
      return undefined;
    });
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Recital de rock")).toBeInTheDocument();
  });

  it("cada evento tiene su menú de acciones accesible por nombre", async () => {
    const user = userEvent.setup();
    renderDashboard();
    await screen.findByText("Recital de rock");

    await user.click(screen.getByRole("button", { name: "Acciones de Recital de rock" }));

    expect(screen.getByRole("menuitem", { name: "Ver página pública" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Editar" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Cancelar evento" })).toBeInTheDocument();
  });
});
