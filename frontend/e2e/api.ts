/** Cliente mínimo del backend real para sembrar datos y comprobar resultados (no es lo que se prueba). */

export const BACKEND_URL = process.env.E2E_BACKEND_URL ?? "http://localhost:8080";
export const PASSWORD = "E2e-Pass-123!";

export class ErrorApi extends Error {
  constructor(readonly status: number, readonly cuerpo: string, ruta: string) {
    super(`${ruta} respondió ${status}: ${cuerpo}`);
  }
}

async function llamar<T>(metodo: string, ruta: string, token?: string, cuerpo?: unknown): Promise<T> {
  const r = await fetch(`${BACKEND_URL}${ruta}`, {
    method: metodo,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  if (!r.ok) throw new ErrorApi(r.status, texto, `${metodo} ${ruta}`);
  return (texto ? JSON.parse(texto) : undefined) as T;
}

export const get = <T>(ruta: string, token?: string) => llamar<T>("GET", ruta, token);
export const post = <T>(ruta: string, token?: string, cuerpo?: unknown) => llamar<T>("POST", ruta, token, cuerpo);
export const put = <T>(ruta: string, token?: string, cuerpo?: unknown) => llamar<T>("PUT", ruta, token, cuerpo);
export const patch = <T>(ruta: string, token?: string, cuerpo?: unknown) => llamar<T>("PATCH", ruta, token, cuerpo);

interface Auth { token: string; id: number; email: string }
interface Evento { id: number; urlPublica: string; nombre: string }
interface Tanda { id: number }
interface Staff { id: number; email: string }
interface Entrada { id: number; codigoQr: string }

/** Prefijo de todo lo que crea la suite: sirve para encontrarlo y borrarlo (ver e2e/limpiar.sql). */
export const PREFIJO = "e2e";

export function emailUnico(rol: string) {
  return `${PREFIJO}.${rol}.${Date.now()}.${Math.floor(Math.random() * 1000)}@asistiapp.test`;
}

export async function registrarOrganizador(): Promise<Auth> {
  const email = emailUnico("organizador");
  const r = await post<Auth>("/auth/register", undefined, { nombre: "E2E Organizador", email, password: PASSWORD });
  // Para publicar hace falta un contacto del arrepentimiento (8.8).
  await put("/organizador/perfil/contacto", r.token, { contactoEmail: email });
  return { token: r.token, id: r.id, email };
}

/** Fecha ISO (YYYY-MM-DD) de dentro de `dias` días. */
export function enDias(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface EventoPublicado { evento: Evento; idTanda: number; nombreTanda: string }

/** Crea un evento, le agrega una tanda y lo publica, todo por la API real. */
export async function publicarEvento(token: string, nombre: string, cupo: number): Promise<EventoPublicado> {
  const evento = await post<Evento>("/eventos", token, {
    nombre,
    descripcion: "Evento creado por la suite e2e",
    fechaEvento: enDias(10),
    horaEvento: "21:00:00",
    lugar: "Lugar E2E 123",
  });
  const nombreTanda = "General E2E";
  const tanda = await post<Tanda>(`/eventos/${evento.id}/tandas`, token, {
    nombre: nombreTanda,
    precio: 1500,
    cupoMaximo: cupo,
  });
  // La URL pública se asigna al publicar: se toma de esta respuesta.
  const publicado = await patch<Evento>(`/eventos/${evento.id}/publicar`, token);
  return { evento: publicado, idTanda: tanda.id, nombreTanda };
}

/** Crea un Staff (QR o Vendedor) y le fija una contraseña conocida: el alta solo la manda por mail. */
export async function crearStaff(token: string, tipo: "qr" | "vendedor", idEvento: number): Promise<{ email: string; password: string; id: number }> {
  const email = emailUnico(`staff-${tipo}`);
  const staff = await post<Staff>(`/organizador/staff/${tipo}`, token, {
    nombre: `E2E Staff ${tipo}`,
    email,
    idEvento,
    // El vendedor exige un tope de entradas (8.3); el QR no lo usa.
    ...(tipo === "vendedor" ? { topeEntradas: 50 } : {}),
  });
  const { passwordTemporal } = await post<{ passwordTemporal: string }>(`/organizador/staff/${staff.id}/resetear-password`, token);
  return { email, password: passwordTemporal, id: staff.id };
}

export async function login(email: string, password: string): Promise<string> {
  return (await post<Auth>("/auth/login", undefined, { email, password })).token;
}

export async function ventaManual(tokenVendedor: string, idTanda: number): Promise<Entrada> {
  const entradas = await post<Entrada[]>("/tickets/venta-manual", tokenVendedor, {
    idTanda,
    cantidad: 1,
    nombreComprador: "Comprador E2E",
    emailComprador: emailUnico("comprador"),
  });
  return entradas[0];
}
