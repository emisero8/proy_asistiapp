import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ListingPage } from "./ListingPage";
import { api, ApiError } from "../../lib/api";
import { ThemeProvider } from "../../lib/theme";
import type {
  EstadisticasPublicasResponseDTO,
  EventoPublicoListItemDTO,
  PaqueteCreditoDisponibleDTO,
  SoporteResponseDTO,
} from "../../lib/types";

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn() } };
});

// Se fija solo la fecha (no los timers): la etiqueta "Hoy" depende del día en que se corran los tests.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-10T12:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.mocked(api.get).mockReset();
});

function evento(id: number, fechaEvento: string, extra: Partial<EventoPublicoListItemDTO> = {}): EventoPublicoListItemDTO {
  return {
    id,
    nombre: `Evento ${id}`,
    fechaEvento,
    horaEvento: "21:00:00",
    lugar: `Lugar ${id}`,
    imagenPortadaUrl: null,
    urlPublica: `evento-${id}`,
    precioDesde: 1500,
    cantidadTandas: 2,
    cupoDisponibleTotal: 50,
    cupoTotal: 100,
    ...extra,
  };
}

/** n eventos con fechas crecientes, ids 1..n (el id 1 es el más próximo). */
function eventos(n: number): EventoPublicoListItemDTO[] {
  return Array.from({ length: n }, (_, i) => evento(i + 1, `2026-12-${String(i + 1).padStart(2, "0")}`));
}

interface Respuestas {
  eventos?: EventoPublicoListItemDTO[] | Error;
  stats?: EstadisticasPublicasResponseDTO | Error;
  paquetes?: PaqueteCreditoDisponibleDTO[] | Error;
  soporte?: SoporteResponseDTO | Error;
}

const URLS_PUBLICAS = ["/public/eventos", "/public/estadisticas", "/public/paquetes-credito", "/public/soporte"];

/** La pantalla pide cuatro endpoints públicos a la vez (el cuarto lo pide la línea de soporte): se responde cada uno por su URL. */
function mockApi({
  eventos: ev = [],
  stats = new Error("sin stats"),
  paquetes = [],
  soporte = { emailSoporte: null, whatsappSoporte: null },
}: Respuestas = {}) {
  const responder = (valor: unknown) => (valor instanceof Error ? Promise.reject(valor) : Promise.resolve(valor));
  vi.mocked(api.get).mockImplementation(((url: string) => {
    if (url === "/public/eventos") return responder(ev);
    if (url === "/public/estadisticas") return responder(stats);
    if (url === "/public/paquetes-credito") return responder(paquetes);
    if (url === "/public/soporte") return responder(soporte);
    return Promise.reject(new Error(`URL inesperada: ${url}`));
  }) as typeof api.get);
}

/** Muestra la ruta actual para comprobar a dónde navega cada link. */
function RutaActual() {
  return <div data-testid="ruta">{useLocation().pathname}</div>;
}

function renderPage() {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={["/"]}>
        <RutaActual />
        <Routes>
          <Route path="/" element={<ListingPage />} />
          <Route path="*" element={<div>otra pantalla</div>} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

/** La sección "Próximos eventos" (carrusel + grilla). */
const seccionEventos = () => screen.findByRole("region", { name: "Próximos eventos" });

/** Links de las tarjetas de evento (cada tarjeta es un link al detalle), en el orden en que aparecen. */
async function tarjetas() {
  const seccion = await seccionEventos();
  return within(seccion).findAllByRole("link", { name: /^Evento \d+,/ });
}

describe("ListingPage — estados de la lista", () => {
  it("mientras carga muestra esqueletos y ningún cartel de vacío", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText("Cargando eventos…")).toBeInTheDocument();
    expect(screen.queryByText("Todavía no hay eventos publicados")).not.toBeInTheDocument();
  });

  it("sin eventos publicados lo avisa", async () => {
    mockApi({ eventos: [] });
    renderPage();

    expect(await screen.findByText("Todavía no hay eventos publicados")).toBeInTheDocument();
  });

  it("si falla la carga muestra el mensaje del backend, ofrece reintentar y no muestra el cartel de vacío", async () => {
    mockApi({
      eventos: new ApiError({ status: 500, error: "El servidor no responde", path: "/public/eventos", timestamp: "t" }),
    });
    renderPage();

    expect(await screen.findByText("El servidor no responde")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
    expect(screen.queryByText("Todavía no hay eventos publicados")).not.toBeInTheDocument();
  });

  it("si falla con un error que no es de la API usa un mensaje genérico", async () => {
    mockApi({ eventos: new Error("network down") });
    renderPage();

    expect(await screen.findByText("No pudimos cargar los eventos.")).toBeInTheDocument();
  });

  it("las estadísticas y los paquetes son opcionales: si fallan, los eventos se ven igual", async () => {
    mockApi({ eventos: eventos(2), stats: new Error("x"), paquetes: new Error("y") });
    renderPage();

    expect(await tarjetas()).toHaveLength(2);
    expect(screen.queryByText("Eventos publicados")).not.toBeInTheDocument();
    expect(screen.queryByText("Créditos simples y transparentes")).not.toBeInTheDocument();
  });
});

describe("ListingPage — eventos", () => {
  it("ordena por fecha ascendente aunque lleguen desordenados y marca el primero como Próximo", async () => {
    mockApi({
      eventos: [evento(3, "2026-12-30"), evento(1, "2026-12-01"), evento(2, "2026-12-15")],
    });
    renderPage();

    const hrefs = (await tarjetas()).map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/eventos/evento-1", "/eventos/evento-2", "/eventos/evento-3"]);
    expect(within(await seccionEventos()).getAllByText("Próximo")).toHaveLength(1);
  });

  it("anuncia el precio 'desde' solo si el evento tiene uno", async () => {
    mockApi({ eventos: [evento(1, "2026-12-01", { precioDesde: 8000 }), evento(2, "2026-12-02", { precioDesde: null })] });
    renderPage();

    const links = await tarjetas();
    expect(links.filter((a) => /desde \$/.test(a.getAttribute("aria-label") ?? ""))).toHaveLength(1);
  });

  it("las tarjetas son links al detalle (se pueden abrir en otra pestaña) y navegan a él", async () => {
    mockApi({ eventos: eventos(2) });
    renderPage();

    const links = await tarjetas();
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/eventos/evento-1", "/eventos/evento-2"]);
    await userEvent.click(links[1]);
    expect(screen.getByTestId("ruta")).toHaveTextContent("/eventos/evento-2");
  });

  it("marca con 'Hoy' el evento de hoy, y a ninguno si no hay shows hoy", async () => {
    mockApi({ eventos: [evento(1, "2026-11-10"), evento(2, "2026-12-01")] });
    const { unmount } = renderPage();
    await tarjetas();
    expect(within(await seccionEventos()).getByText("Hoy")).toBeInTheDocument();
    unmount();

    mockApi({ eventos: [evento(1, "2026-12-01")] });
    renderPage();
    await tarjetas();
    expect(within(await seccionEventos()).queryByText("Hoy")).not.toBeInTheDocument();
  });
});

describe("ListingPage — carrusel, grilla y acceso a /eventos", () => {
  it("con pocos eventos muestra una sola grilla, sin carrusel", async () => {
    mockApi({ eventos: eventos(3) });
    renderPage();

    expect(await tarjetas()).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Eventos siguientes" })).not.toBeInTheDocument();
  });

  it("no repite eventos entre el carrusel y la grilla", async () => {
    mockApi({ eventos: eventos(10) });
    renderPage();

    const hrefs = (await tarjetas()).map((a) => a.getAttribute("href"));
    expect(hrefs).toHaveLength(10);
    expect(new Set(hrefs).size).toBe(10);
  });

  it("si hay más eventos de los que entran en la home, muestra una parte y ofrece ver todos en /eventos", async () => {
    mockApi({ eventos: eventos(20) });
    renderPage();

    const hrefs = (await tarjetas()).map((a) => a.getAttribute("href"));
    expect(hrefs.length).toBeLessThan(20);
    expect(hrefs).not.toContain("/eventos/evento-20");

    await userEvent.click(screen.getByRole("link", { name: /Ver todos los eventos \(20\)/ }));
    expect(screen.getByTestId("ruta")).toHaveTextContent("/eventos");
  });

  it("si entran todos, no ofrece el botón de 'Ver todos los eventos (N)'", async () => {
    mockApi({ eventos: eventos(3) });
    renderPage();
    await tarjetas();

    expect(screen.queryByRole("link", { name: /Ver todos los eventos \(/ })).not.toBeInTheDocument();
  });

  it("el link 'Eventos' del nav siempre está y navega a /eventos, aun con pocos eventos", async () => {
    mockApi({ eventos: eventos(2) });
    renderPage();
    await tarjetas();

    await userEvent.click(screen.getAllByRole("link", { name: "Eventos" })[0]);

    expect(screen.getByTestId("ruta")).toHaveTextContent("/eventos");
  });
});

describe("ListingPage — accesos de Organizador", () => {
  beforeEach(() => mockApi({ eventos: [] }));

  it("'Ingresar' lleva al login de Organizador", async () => {
    renderPage();
    await screen.findByText("Todavía no hay eventos publicados");

    await userEvent.click(screen.getAllByRole("link", { name: "Ingresar" })[0]);

    expect(screen.getByTestId("ruta")).toHaveTextContent("/organizador/login");
  });

  it("'Soy organizador' lleva al registro de Organizador", async () => {
    renderPage();
    await screen.findByText("Todavía no hay eventos publicados");

    // Aparece en el nav y más abajo en la página: todos van al mismo lugar.
    await userEvent.click(screen.getAllByRole("link", { name: /Soy organizador/ })[0]);

    expect(screen.getByTestId("ruta")).toHaveTextContent("/organizador/registro");
  });
});

describe("ListingPage — secciones con datos opcionales", () => {
  it("muestra las estadísticas y los paquetes de créditos cuando existen", async () => {
    mockApi({
      eventos: eventos(1),
      stats: { organizadoresActivos: 7, entradasVendidas: 321, eventosPublicados: 12 },
      paquetes: [{ id: 1, nombre: "Inicial", cantidadCreditos: 10, precio: 5000 }],
    });
    renderPage();

    expect(await screen.findByText("Eventos publicados")).toBeInTheDocument();
    expect(screen.getByText("Entradas vendidas")).toBeInTheDocument();
    expect(await screen.findByText("Créditos simples y transparentes")).toBeInTheDocument();
    expect(screen.getByText("Inicial")).toBeInTheDocument();
  });

  it("muestra la línea de soporte solo si el Admin configuró algún contacto", async () => {
    mockApi({ eventos: [], soporte: { emailSoporte: "ayuda@asistiapp.com", whatsappSoporte: null } });
    const { unmount } = renderPage();

    expect((await screen.findAllByText("¿Necesitás ayuda?")).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /ayuda@asistiapp.com/ }).length).toBeGreaterThan(0);
    unmount();

    mockApi({ eventos: [], soporte: { emailSoporte: null, whatsappSoporte: null } });
    renderPage();
    await screen.findByText("Todavía no hay eventos publicados");
    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/public/soporte", expect.anything()));
    expect(screen.queryByText("¿Necesitás ayuda?")).not.toBeInTheDocument();
  });

  it("pide solo los cuatro endpoints públicos, y ninguno con la sesión del usuario", async () => {
    mockApi({ eventos: [] });
    renderPage();
    await screen.findByText("Todavía no hay eventos publicados");

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(URLS_PUBLICAS.length));
    expect(vi.mocked(api.get).mock.calls.map((llamada) => llamada[0]).sort()).toEqual([...URLS_PUBLICAS].sort());
    for (const llamada of vi.mocked(api.get).mock.calls) {
      expect(llamada[1]).toMatchObject({ skipAuth: true });
    }
  });
});
