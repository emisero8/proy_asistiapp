import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StaffScannerPage } from "./ScannerPage";
import { api, ApiError } from "../../lib/api";

// La cámara no existe en jsdom: se simula html5-qrcode con un escáner que "arranca" sin hacer nada.
vi.mock("html5-qrcode", () => ({
  Html5Qrcode: class {
    start() {
      return Promise.resolve();
    }
    stop() {
      return Promise.resolve();
    }
    clear() {}
    getState() {
      return 1;
    }
    applyVideoConstraints() {
      return Promise.resolve();
    }
  },
  Html5QrcodeScannerState: { SCANNING: 2, PAUSED: 3 },
}));
vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, api: { ...actual.api, post: vi.fn() } };
});
vi.mock("../../lib/auth", () => ({
  useAuth: () => ({ session: { id: 3, nombre: "Quique QR", rol: "Staff_QR" }, logout: vi.fn() }),
}));

afterEach(() => vi.mocked(api.post).mockReset());

async function validarManual(user: ReturnType<typeof userEvent.setup>, codigo: string) {
  await user.click(screen.getByRole("button", { name: "Ingresar código manualmente" }));
  const campo = screen.getByLabelText("Código de la entrada");
  expect(campo).toHaveFocus();
  await user.type(campo, `${codigo}{Enter}`);
}

describe("StaffScannerPage", () => {
  it("valida un código manual con Enter (mismo contrato), anuncia el resultado y suma al contador", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValueOnce({
      valido: true,
      mensaje: "OK",
      idEntrada: 1,
      nombreComprador: "Ana Pérez",
      emailComprador: "ana@mail.com",
      nombreEvento: "Fiesta",
      nombreTanda: "General",
      estadoAnterior: "Pagada",
      fechaUso: null,
    });
    render(<StaffScannerPage />);

    await validarManual(user, "ast-abc123");

    expect(api.post).toHaveBeenCalledWith("/tickets/validate", { codigoQr: "AST-ABC123" });
    expect(await screen.findByRole("status")).toHaveTextContent("Ingreso válido. Ana Pérez, General.");
    expect(screen.getByText("Válidos").parentElement).toHaveTextContent(/^Válidos1$/);
  });

  it("un código rechazado anuncia el motivo y Escape vuelve a escanear", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockRejectedValueOnce(
      new ApiError({ status: 409, error: "Esta entrada ya fue usada", path: "/tickets/validate", timestamp: "2026-01-01T00:00:00" }),
    );
    render(<StaffScannerPage />);

    await validarManual(user, "AST-USADA1");

    expect(await screen.findByRole("status")).toHaveTextContent("Entrada inválida. Esta entrada ya fue usada");
    expect(screen.getByText("Tocá para seguir escaneando")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByText("Tocá para seguir escaneando")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
