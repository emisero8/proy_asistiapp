import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImagenPortadaField } from "./ImagenPortadaField";
import { api, ApiError } from "../lib/api";

vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();
  return { ...actual, api: { ...actual.api, upload: vi.fn() } };
});

function archivo(nombre = "portada.png", tamanoBytes = 1024): File {
  const f = new File(["x"], nombre, { type: "image/png" });
  Object.defineProperty(f, "size", { value: tamanoBytes });
  return f;
}

function inputArchivo(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

beforeEach(() => {
  vi.mocked(api.upload).mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("ImagenPortadaField", () => {
  it("sube el archivo al endpoint indicado y entrega la URL devuelta", async () => {
    const onChange = vi.fn();
    const { container } = render(<ImagenPortadaField value="" onChange={onChange} endpoint="/organizador/perfil/foto" variant="avatar" />);
    vi.mocked(api.upload).mockResolvedValueOnce({ url: "https://res.cloudinary.com/x/image/upload/a.png" });

    fireEvent.change(inputArchivo(container), { target: { files: [archivo()] } });

    await waitFor(() => expect(onChange).toHaveBeenCalledWith("https://res.cloudinary.com/x/image/upload/a.png"));
    expect(api.upload).toHaveBeenCalledWith("/organizador/perfil/foto", expect.any(FormData));
  });

  it("por defecto sube a /eventos/imagenes (portada)", async () => {
    const { container } = render(<ImagenPortadaField value="" onChange={vi.fn()} />);
    vi.mocked(api.upload).mockResolvedValueOnce({ url: "https://res.cloudinary.com/x/image/upload/b.png" });

    fireEvent.change(inputArchivo(container), { target: { files: [archivo()] } });

    await waitFor(() => expect(api.upload).toHaveBeenCalledWith("/eventos/imagenes", expect.any(FormData)));
  });

  it("rechaza una imagen de más de 5 MB sin llamar a la API", () => {
    const { container } = render(<ImagenPortadaField value="" onChange={vi.fn()} />);

    fireEvent.change(inputArchivo(container), { target: { files: [archivo("grande.png", 6 * 1024 * 1024)] } });

    expect(screen.getByText("La imagen no puede superar los 5 MB.")).toBeInTheDocument();
    expect(api.upload).not.toHaveBeenCalled();
  });

  it("muestra el mensaje del backend si la subida falla y no cambia el valor", async () => {
    const onChange = vi.fn();
    const { container } = render(<ImagenPortadaField value="" onChange={onChange} />);
    vi.mocked(api.upload).mockRejectedValueOnce(new ApiError({ status: 409, error: "Formato no permitido. Usá JPG, PNG o WEBP", path: "/eventos/imagenes", timestamp: "" }));

    fireEvent.change(inputArchivo(container), { target: { files: [archivo()] } });

    expect(await screen.findByText("Formato no permitido. Usá JPG, PNG o WEBP")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("'Quitar' limpia el valor", async () => {
    const onChange = vi.fn();
    render(<ImagenPortadaField value="https://res.cloudinary.com/x/image/upload/c.png" onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: /quitar/i }));

    expect(onChange).toHaveBeenCalledWith("");
  });
});
