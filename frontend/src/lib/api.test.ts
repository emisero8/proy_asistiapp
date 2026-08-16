import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, SESSION_STORAGE_KEY } from "./api";

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function emptyResponse(status: number) {
  // Spring Security corta antes de llegar al GlobalExceptionHandler cuando
  // rechaza un JWT (vencido/inválido/ausente rol) — sin body, sin content-type json.
  return new Response(null, { status });
}

/** jsdom no implementa navegación real — reemplaza window.location por un stub simple. */
function stubLocation(pathname: string) {
  const original = window.location;
  Object.defineProperty(window, "location", {
    value: { href: "", pathname },
    writable: true,
    configurable: true,
  });
  return () => {
    Object.defineProperty(window, "location", { value: original, writable: true, configurable: true });
  };
}

describe("api client", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("no adjunta Authorization cuando no hay sesión guardada", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ok: true }, 200));
    await api.get("/public/eventos");
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init!.headers as Record<string, string>)["Authorization"]).toBeUndefined();
  });

  it("adjunta el JWT guardado en las requests autenticadas", async () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token: "abc123", rol: "Organizador" }));
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([], 200));
    await api.get("/eventos");
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init!.headers as Record<string, string>)["Authorization"]).toBe("Bearer abc123");
  });

  it("no adjunta el JWT cuando skipAuth es true, aunque haya sesión", async () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token: "abc123", rol: "Organizador" }));
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, 200));
    await api.post("/auth/login", { email: "a@a.com", password: "x" }, { skipAuth: true });
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init!.headers as Record<string, string>)["Authorization"]).toBeUndefined();
  });

  it("lanza ApiError con el mensaje del backend cuando la respuesta no es ok", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ status: 400, error: "El email ya está registrado", path: "/auth/register", timestamp: "now" }, 400),
    );
    await expect(api.post("/auth/register", {})).rejects.toMatchObject({
      message: "El email ya está registrado",
      status: 400,
    });
  });

  it("un 401 de /auth/login (contraseña incorrecta, sin token adjunto) NO dispara logout de sesión", async () => {
    // No hay sesión guardada -> no se adjunta token -> no debe tocar localStorage ni redirigir.
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ status: 401, error: "Credenciales inválidas", path: "/auth/login", timestamp: "now" }, 401),
    );
    await expect(api.post("/auth/login", { email: "a@a.com", password: "mal" }, { skipAuth: true })).rejects.toThrow(
      "Credenciales inválidas",
    );
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it("un 403 legítimo de la app (con body JSON) NO limpia la sesión — es un rol sin permiso, no una sesión vencida", async () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token: "abc123", rol: "Organizador" }));
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ status: 403, error: "No tenés permisos para realizar esta acción", path: "/admin/eventos", timestamp: "now" }, 403),
    );
    await expect(api.get("/admin/eventos")).rejects.toThrow("No tenés permisos para realizar esta acción");
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).not.toBeNull();
  });

  it("un 403 sin body (JWT rechazado por Spring Security) limpia la sesión y redirige al login del rol", async () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token: "vencido", rol: "Staff_QR" }));
    vi.mocked(fetch).mockResolvedValueOnce(emptyResponse(403));
    const restoreLocation = stubLocation("/staff/scanner");

    try {
      await expect(api.get("/tickets/validate/AST-XXXXXX")).rejects.toThrow();
      expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
      expect(window.location.href).toBe("/staff/login");
    } finally {
      restoreLocation();
    }
  });

  it("un 401 sin body con token adjunto también se trata como sesión vencida", async () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token: "vencido", rol: "Administrador" }));
    vi.mocked(fetch).mockResolvedValueOnce(emptyResponse(401));
    const restoreLocation = stubLocation("/admin/usuarios");

    try {
      await expect(api.get("/admin/usuarios")).rejects.toThrow();
      expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
      expect(window.location.href).toBe("/admin/login");
    } finally {
      restoreLocation();
    }
  });

  it("no lanza error en una respuesta 204 (sin contenido)", async () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token: "abc123", rol: "Administrador" }));
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(api.delete("/admin/usuarios/1")).resolves.toBeUndefined();
  });

  it("ApiError expone status y fields del body", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(
        { status: 400, error: "Datos inválidos", path: "/eventos", timestamp: "now", fields: { nombre: "es obligatorio" } },
        400,
      ),
    );
    try {
      await api.post("/eventos", {});
      expect.unreachable("debía lanzar ApiError");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      const err = e as ApiError;
      expect(err.status).toBe(400);
      expect(err.fields).toEqual({ nombre: "es obligatorio" });
    }
  });
});
