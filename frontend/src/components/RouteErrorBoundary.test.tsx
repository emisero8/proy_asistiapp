import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

function Explota({ mensaje }: { mensaje: string }): never {
  throw new Error(mensaje);
}

const ERROR_CHUNK = "Failed to fetch dynamically imported module: http://x/assets/Page-abc.js";

describe("RouteErrorBoundary", () => {
  beforeEach(() => {
    sessionStorage.clear();
    // React loguea los errores atrapados por un boundary: se silencia para no ensuciar la salida.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("sin errores muestra el contenido", () => {
    render(
      <RouteErrorBoundary>
        <p>Pantalla OK</p>
      </RouteErrorBoundary>,
    );
    expect(screen.getByText("Pantalla OK")).toBeInTheDocument();
  });

  it("un chunk que no carga recarga la página sola una vez", () => {
    const onReload = vi.fn();
    render(
      <RouteErrorBoundary onReload={onReload}>
        <Explota mensaje={ERROR_CHUNK} />
      </RouteErrorBoundary>,
    );
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it("si ya recargó hace instantes no insiste (sin loop) y ofrece recargar a mano", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem("asistiapp_recarga_por_chunk", String(Date.now()));
    const onReload = vi.fn();
    render(
      <RouteErrorBoundary onReload={onReload}>
        <Explota mensaje={ERROR_CHUNK} />
      </RouteErrorBoundary>,
    );
    expect(onReload).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Hay una versión nueva de AsistíAPP" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Recargar" }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it("cualquier otro error muestra el aviso genérico, sin recargar sola", () => {
    const onReload = vi.fn();
    render(
      <RouteErrorBoundary onReload={onReload}>
        <Explota mensaje="Cannot read properties of undefined" />
      </RouteErrorBoundary>,
    );
    expect(onReload).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Algo salió mal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ir al inicio" })).toBeInTheDocument();
  });
});
