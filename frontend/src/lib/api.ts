import type { ApiErrorBody } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
const SESSION_STORAGE_KEY = "asistiapp_session";

/** Error tipado con el contrato JSON que devuelve GlobalExceptionHandler en el backend. */
export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;

  constructor(body: ApiErrorBody) {
    super(body.error);
    this.name = "ApiError";
    this.status = body.status;
    this.fields = body.fields;
  }
}

function getStoredToken(): string | null {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as { token: string }).token;
  } catch {
    return null;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** No adjuntar el JWT aunque exista sesión — para endpoints públicos donde no corresponde. */
  skipAuth?: boolean;
}

/**
 * Cliente HTTP mínimo para la API de AsistíAPP.
 * Adjunta el JWT guardado (si hay sesión) y parsea errores con el formato
 * uniforme de GlobalExceptionHandler ({status, error, path, timestamp}).
 */
async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, skipAuth = false } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (!skipAuth) {
    const token = getStoredToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : undefined;

  if (!response.ok) {
    if (data) {
      throw new ApiError(data as ApiErrorBody);
    }
    throw new ApiError({
      status: response.status,
      error: response.statusText || "Error de red inesperado",
      path,
      timestamp: new Date().toISOString(),
    });
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "DELETE" }),
};

export { SESSION_STORAGE_KEY, API_BASE_URL };
