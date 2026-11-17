import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toaster } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StaffPosPage } from "./PosPage";
import { api, ApiError } from "../../lib/api";
import { ThemeProvider } from "../../lib/theme";
import type {
  DisponibilidadCompradorResponseDTO,
  EntradaResponseDTO,
  EventoResponseDTO,
  TandaResponseDTO,
} from "../../lib/types";

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn(), post: vi.fn() } };
});

const logout = vi.fn();
vi.mock("../../lib/auth", () => ({
  useAuth: () => ({ session: { id: 9, nombre: "Sofía Vendedora", rol: "Staff_Vendedor" }, logout }),
}));

afterEach(() => {
  vi.mocked(api.get).mockReset();
  vi.mocked(api.post).mockReset();
  logout.mockReset();
});

function tanda(id: number, nombre: string, extra: Partial<TandaResponseDTO> = {}): TandaResponseDTO {
  return {
    id,
    idEvento: 1,
    nombre,
    precio: 2000,
    cupoMaximo: 100,
    cupoDisponible: 100,
    soloEmision: false,
    fechaInicioVigencia: null,
    fechaFinVigencia: null,
    ...extra,
  };
}

function evento(id: number, nombre: string, tandas: TandaResponseDTO[]): EventoResponseDTO {
  return {
    id,
    idOrganizador: 1,
    nombre,
    descripcion: null,
    fechaEvento: "2026-12-12",
    horaEvento: "21:00:00",
    lugar: `Lugar de ${nombre}`,
    latitud: null,
    longitud: null,
    imagenPortadaUrl: null,
    estado: "Publicado",
    urlPublica: `evento-${id}`,
    fechaCreacion: "2026-11-01T10:00:00",
    fechaPublicacion: "2026-11-01T10:00:00",
    fechaCancelacion: null,
    finalizado: false,
    tandas,
  };
}

function entrada(id: number, codigoQr: string): EntradaResponseDTO {
  return {
    id,
    idTanda: 1,
    idEvento: 1,
    nombreEvento: "Festival",
    nombreTanda: "General",
    precioTanda: 2000,
    codigoQr,
    nombreComprador: "Ana Compradora",
    emailComprador: "ana@mail.com",
    estado: "Pagada",
    canalVenta: "Manual",
    fechaCompra: "2026-11-16T10:00:00",
    fechaUso: null,
    tipoEmision: null,
    motivoEmision: null,
  };
}

const URL_DISPONIBILIDAD = "/tickets/disponibilidad-comprador";

interface Config {
  eventos?: EventoResponseDTO[] | Error;
  /** Qué responde la consulta de tope por comprador; recibe los parámetros de la URL. */
  disponibilidad?: (params: URLSearchParams) => DisponibilidadCompradorResponseDTO | Error;
}

function mockApi({ eventos = [evento(1, "Festival", [tanda(1, "General")])], disponibilidad }: Config = {}) {
  vi.mocked(api.get).mockImplementation(((url: string) => {
    if (url === "/eventos/vendedor") return eventos instanceof Error ? Promise.reject(eventos) : Promise.resolve(eventos);
    if (url.startsWith(URL_DISPONIBILIDAD)) {
      const params = new URLSearchParams(url.split("?")[1]);
      const r = disponibilidad ? disponibilidad(params) : { limite: 6, yaCompradas: 0, disponible: 6 };
      return r instanceof Error ? Promise.reject(r) : Promise.resolve(r);
    }
    return Promise.reject(new Error(`URL inesperada: ${url}`));
  }) as typeof api.get);
}

function renderPage() {
  return render(
    <ThemeProvider>
      <StaffPosPage />
      <Toaster />
    </ThemeProvider>,
  );
}

async function esperarFormulario() {
  await screen.findByPlaceholderText("Nombre del comprador...");
}

// La pantalla repite el botón de generar (panel en desktop y barra fija en mobile): jsdom no aplica el CSS.
const botonGenerar = () => screen.getAllByRole("button", { name: /Generar entrada/ })[0];
const mas = () => screen.getByRole("button", { name: "Agregar una entrada" });
const menos = () => screen.getByRole("button", { name: "Quitar una entrada" });

async function completarComprador(nombre = "Ana Compradora", email = "ana@mail.com") {
  await userEvent.type(screen.getByPlaceholderText("Nombre del comprador..."), nombre);
  await userEvent.type(screen.getByPlaceholderText("comprador@ejemplo.com"), email);
}

describe("StaffPosPage — carga inicial", () => {
  it("mientras carga muestra 'Cargando…'", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText("Cargando…")).toBeInTheDocument();
  });

  it("si falla la carga muestra el error y deja cerrar sesión", async () => {
    mockApi({ eventos: new ApiError({ status: 403, error: "Sin permiso", path: "/eventos/vendedor", timestamp: "t" }) });
    renderPage();

    expect(await screen.findByText("Sin permiso")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("sin eventos publicados para vender lo avisa", async () => {
    mockApi({ eventos: [] });
    renderPage();

    expect(await screen.findByText("Tu organizador todavía no tiene eventos publicados para vender.")).toBeInTheDocument();
  });

  it("arranca con el primer evento y la primera tanda, y muestra el nombre del vendedor", async () => {
    mockApi({
      eventos: [evento(1, "Festival", [tanda(1, "Anticipada"), tanda(2, "General")])],
    });
    renderPage();
    await esperarFormulario();

    expect(screen.getByText("Sofía Vendedora")).toBeInTheDocument();
    expect(screen.getByText("Festival")).toBeInTheDocument();
    expect(screen.getAllByText("1 × Anticipada").length).toBeGreaterThan(0);
  });

  it("con más de un evento ofrece el selector y cambiar de evento cambia las tandas", async () => {
    mockApi({
      eventos: [
        evento(1, "Festival", [tanda(1, "Anticipada")]),
        evento(2, "Recital", [tanda(5, "Platea", { precio: 9000 })]),
      ],
    });
    renderPage();
    await esperarFormulario();

    await userEvent.selectOptions(screen.getByRole("combobox"), "2");

    expect(screen.getByText("Platea")).toBeInTheDocument();
    expect(screen.queryByText("Anticipada")).not.toBeInTheDocument();
    expect(screen.getAllByText("1 × Platea").length).toBeGreaterThan(0);
  });
});

describe("StaffPosPage — cantidad y tope por comprador", () => {
  it("el '+' se frena en el tope que informa el backend para ese comprador", async () => {
    mockApi({ disponibilidad: () => ({ limite: 6, yaCompradas: 3, disponible: 3 }) });
    renderPage();
    await esperarFormulario();
    await screen.findByText(/podés vender hasta 3 más/);

    for (let i = 0; i < 10; i++) await userEvent.click(mas());

    expect(screen.getAllByText("3 × General").length).toBeGreaterThan(0);
    expect(mas()).toBeDisabled();
  });

  it("también se frena en el cupo de la tanda si es menor que el tope", async () => {
    mockApi({
      eventos: [evento(1, "Festival", [tanda(1, "General", { cupoDisponible: 2 })])],
      disponibilidad: () => ({ limite: 6, yaCompradas: 0, disponible: 6 }),
    });
    renderPage();
    await esperarFormulario();
    await screen.findByText(/Máximo 6 entradas por persona/);

    for (let i = 0; i < 5; i++) await userEvent.click(mas());

    expect(screen.getAllByText("2 × General").length).toBeGreaterThan(0);
    expect(mas()).toBeDisabled();
  });

  it("nunca baja de 1 entrada", async () => {
    mockApi();
    renderPage();
    await esperarFormulario();

    await userEvent.click(menos());
    await userEvent.click(menos());

    expect(screen.getAllByText("1 × General").length).toBeGreaterThan(0);
  });

  it("no deja pasar de 20 entradas por venta aunque el cupo y el tope lo permitan", async () => {
    mockApi({
      eventos: [evento(1, "Festival", [tanda(1, "General", { cupoDisponible: 500 })])],
      disponibilidad: () => ({ limite: 100, yaCompradas: 0, disponible: 100 }),
    });
    renderPage();
    await esperarFormulario();
    await screen.findByText(/Máximo 100 entradas por persona/);

    for (let i = 0; i < 25; i++) await userEvent.click(mas());

    expect(screen.getAllByText("20 × General").length).toBeGreaterThan(0);
    expect(mas()).toBeDisabled();
  });

  it("al tipear el mail vuelve a consultar el tope con ese mail", async () => {
    mockApi({
      disponibilidad: (params) =>
        params.get("email") === "ana@mail.com"
          ? { limite: 6, yaCompradas: 2, disponible: 4 }
          : { limite: 6, yaCompradas: 0, disponible: 6 },
    });
    renderPage();
    await esperarFormulario();

    await userEvent.type(screen.getByPlaceholderText("comprador@ejemplo.com"), "ana@mail.com");

    expect(await screen.findByText("Este comprador ya tiene 2 — podés vender hasta 4 más (tope: 6).")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(expect.stringContaining("email=ana%40mail.com"));
  });

  it("si el mail ya tiene vendido todo el tope, la cantidad se ajusta y no se puede vender", async () => {
    mockApi({ disponibilidad: () => ({ limite: 6, yaCompradas: 6, disponible: 0 }) });
    renderPage();
    await esperarFormulario();
    await completarComprador();
    await screen.findByText(/podés vender hasta 0 más/);

    expect(botonGenerar()).toBeDisabled();
  });

  it("si falla la consulta del tope, el formulario sigue andando sin el mensaje", async () => {
    mockApi({ disponibilidad: () => new Error("caído") });
    renderPage();
    await esperarFormulario();
    await userEvent.click(mas());
    await completarComprador();

    await waitFor(() => expect(api.get).toHaveBeenCalledWith(expect.stringContaining(URL_DISPONIBILIDAD)));
    expect(screen.queryByText(/Máximo \d+ entradas por persona/)).not.toBeInTheDocument();
    expect(botonGenerar()).toBeEnabled();
  });
});

describe("StaffPosPage — validación del formulario", () => {
  it("'Generar entrada' está deshabilitado hasta tener nombre y un mail con @", async () => {
    mockApi();
    renderPage();
    await esperarFormulario();
    expect(botonGenerar()).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText("Nombre del comprador..."), "A");
    await userEvent.type(screen.getByPlaceholderText("comprador@ejemplo.com"), "ana@mail.com");
    expect(botonGenerar()).toBeDisabled(); // un solo carácter no alcanza como nombre

    await userEvent.type(screen.getByPlaceholderText("Nombre del comprador..."), "na");
    expect(botonGenerar()).toBeEnabled();

    await userEvent.clear(screen.getByPlaceholderText("comprador@ejemplo.com"));
    await userEvent.type(screen.getByPlaceholderText("comprador@ejemplo.com"), "sin-arroba");
    expect(botonGenerar()).toBeDisabled();
  });

  it("no se puede vender de una tanda agotada", async () => {
    mockApi({ eventos: [evento(1, "Festival", [tanda(1, "General", { cupoDisponible: 0 })])] });
    renderPage();
    await esperarFormulario();
    await completarComprador();

    expect(screen.getByRole("button", { name: /General/ })).toBeDisabled();
    expect(botonGenerar()).toBeDisabled();
  });
});

describe("StaffPosPage — venta", () => {
  it("manda una sola llamada con la cantidad y muestra las entradas generadas", async () => {
    mockApi();
    vi.mocked(api.post).mockResolvedValue([entrada(10, "QR-AAA"), entrada(11, "QR-BBB")]);
    renderPage();
    await esperarFormulario();
    await userEvent.click(mas());
    await completarComprador();

    await userEvent.click(botonGenerar());

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith("/tickets/venta-manual", {
      idTanda: 1,
      cantidad: 2,
      nombreComprador: "Ana Compradora",
      emailComprador: "ana@mail.com",
    });
    expect(await screen.findByText("¡Entradas generadas!")).toBeInTheDocument();
    expect(screen.getByText("QR-AAA")).toBeInTheDocument();
    expect(screen.getByText("QR-BBB")).toBeInTheDocument();
    // Aviso de 6.3: el enlace de cada entrada es la entrada.
    expect(screen.getByText(/El enlace de cada entrada es la entrada/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copiar los 2 enlaces/ })).toBeInTheDocument();
  });

  it("con una sola entrada habla en singular y no ofrece 'Copiar los N enlaces'", async () => {
    mockApi();
    vi.mocked(api.post).mockResolvedValue([entrada(10, "QR-AAA")]);
    renderPage();
    await esperarFormulario();
    await completarComprador();

    await userEvent.click(botonGenerar());

    expect(await screen.findByText("¡Entrada generada!")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Copiar los/ })).not.toBeInTheDocument();
  });

  it("si el backend rechaza la venta muestra su mensaje y se queda en el formulario", async () => {
    mockApi();
    vi.mocked(api.post).mockRejectedValue(
      new ApiError({ status: 409, error: "Tanda agotada — no hay cupo disponible", path: "/tickets/venta-manual", timestamp: "t" }),
    );
    renderPage();
    await esperarFormulario();
    await completarComprador();

    await userEvent.click(botonGenerar());

    expect(await screen.findByText("Tanda agotada — no hay cupo disponible")).toBeInTheDocument();
    expect(screen.queryByText(/Entradas? generadas?!/)).not.toBeInTheDocument();
    // Los datos del comprador siguen cargados para reintentar.
    expect(screen.getByPlaceholderText("Nombre del comprador...")).toHaveValue("Ana Compradora");
  });

  it("si falla con un error que no es de la API usa un mensaje genérico", async () => {
    mockApi();
    vi.mocked(api.post).mockRejectedValue(new Error("network down"));
    renderPage();
    await esperarFormulario();
    await completarComprador();

    await userEvent.click(botonGenerar());

    expect(await screen.findByText("No pudimos registrar la venta. Intentá de nuevo.")).toBeInTheDocument();
  });

  it("'Vendidas hoy' suma las entradas de cada venta y 'Nueva venta' limpia el formulario", async () => {
    mockApi();
    vi.mocked(api.post).mockResolvedValue([entrada(10, "QR-AAA"), entrada(11, "QR-BBB")]);
    renderPage();
    await esperarFormulario();
    await userEvent.click(mas());
    await completarComprador();
    await userEvent.click(botonGenerar());
    await screen.findByText("¡Entradas generadas!");

    await userEvent.click(screen.getByRole("button", { name: /Nueva venta/ }));

    expect(await screen.findByPlaceholderText("Nombre del comprador...")).toHaveValue("");
    expect(screen.getByPlaceholderText("comprador@ejemplo.com")).toHaveValue("");
    expect(screen.getAllByText("1 × General").length).toBeGreaterThan(0);
    expect(screen.getByText("Vendidas hoy").nextElementSibling).toHaveTextContent("2");
  });
});

describe("StaffPosPage — compartir la entrada", () => {
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  });

  async function venderDos() {
    mockApi();
    vi.mocked(api.post).mockResolvedValue([entrada(10, "QR-AAA"), entrada(11, "QR/BBB")]);
    renderPage();
    await esperarFormulario();
    await userEvent.click(mas());
    await completarComprador();
    await userEvent.click(botonGenerar());
    await screen.findByText("¡Entradas generadas!");
  }

  it("'Copiar enlace' copia el link público de esa entrada y lo confirma", async () => {
    await venderDos();

    await userEvent.click(screen.getAllByRole("button", { name: /Copiar enlace/ })[0]);

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/mi-entrada?codigoQr=QR-AAA`);
    expect(await screen.findByText("Enlace copiado")).toBeInTheDocument();
  });

  it("'Copiar los 2 enlaces' copia todos juntos, uno por línea y con el código escapado", async () => {
    await venderDos();

    await userEvent.click(screen.getByRole("button", { name: /Copiar los 2 enlaces/ }));

    expect(writeText).toHaveBeenCalledWith(
      [
        `${window.location.origin}/mi-entrada?codigoQr=QR-AAA`,
        `${window.location.origin}/mi-entrada?codigoQr=QR%2FBBB`,
      ].join("\n"),
    );
    expect(await screen.findByText("2 enlaces copiados")).toBeInTheDocument();
  });

  it("si el navegador no deja copiar, avisa que se copie a mano", async () => {
    await venderDos();
    writeText.mockRejectedValue(new Error("bloqueado"));

    await userEvent.click(screen.getAllByRole("button", { name: /Copiar enlace/ })[0]);

    expect(await screen.findByText("No pudimos copiar el enlace. Copialo a mano.")).toBeInTheDocument();
  });
});
