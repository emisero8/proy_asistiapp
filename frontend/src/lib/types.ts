// Espejo de los DTOs reales del backend (ver `backend/src/main/java/.../models/dtos`
// y `backend/src/main/java/.../models/enums`). Fuente de verdad: Swagger en
// http://localhost:8080/v3/api-docs con el backend corriendo. Mantener sincronizado
// a mano — no hay generación automática de tipos desde el OpenAPI todavía.

export type RolUsuario = "Administrador" | "Organizador" | "Staff_QR" | "Staff_Vendedor";
export type EstadoUsuario = "Activo" | "Suspendido" | "Inactivo";
export type EstadoEvento = "Borrador" | "Publicado" | "Cancelado";
export type EstadoEntrada = "Pagada" | "Usada";
export type CanalVenta = "Online" | "Manual";
export type TipoMovimiento = "Bienvenida" | "Recarga" | "Consumo_Publicacion";
export type EstadoTransaccion = "Pendiente" | "Aprobada" | "Rechazada";

// ── Auth ──────────────────────────────────────────────

export interface AuthResponseDTO {
  token: string;
  tipo: "Bearer";
  id: number;
  nombre: string;
  email: string;
  rol: RolUsuario;
}

export interface LoginRequestDTO {
  email: string;
  password: string;
}

export interface RegisterRequestDTO {
  nombre: string;
  email: string;
  password: string;
}

// ── Eventos / Tandas ──────────────────────────────────

export interface TandaResponseDTO {
  id: number;
  idEvento: number;
  nombre: string;
  precio: number;
  cupoMaximo: number;
  cupoDisponible: number;
  fechaInicioVigencia: string | null;
  fechaFinVigencia: string | null;
}

export interface TandaRequestDTO {
  nombre: string;
  precio: number;
  cupoMaximo: number;
  fechaInicioVigencia?: string | null;
  fechaFinVigencia?: string | null;
}

export interface EventoResponseDTO {
  id: number;
  idOrganizador: number;
  nombre: string;
  descripcion: string | null;
  fechaEvento: string; // LocalDate → "YYYY-MM-DD"
  horaEvento: string; // LocalTime → "HH:mm:ss"
  lugar: string;
  imagenPortadaUrl: string | null;
  estado: EstadoEvento;
  urlPublica: string;
  fechaCreacion: string;
  fechaPublicacion: string | null;
  fechaCancelacion: string | null;
  tandas: TandaResponseDTO[];
}

export interface EventoRequestDTO {
  nombre: string;
  descripcion?: string;
  fechaEvento: string;
  horaEvento: string;
  lugar: string;
  imagenPortadaUrl?: string;
}

// ── Catálogo público (sin auth — CU-015/016) ─────────

export interface EventoPublicoListItemDTO {
  id: number;
  nombre: string;
  fechaEvento: string;
  horaEvento: string;
  lugar: string;
  imagenPortadaUrl: string | null;
  urlPublica: string;
  precioDesde: number | null;
}

export interface EventoPublicoDetalleDTO {
  id: number;
  nombre: string;
  descripcion: string | null;
  fechaEvento: string;
  horaEvento: string;
  lugar: string;
  imagenPortadaUrl: string | null;
  urlPublica: string;
  tandas: TandaResponseDTO[];
}

// ── Entradas / Ventas ─────────────────────────────────

export interface EntradaResponseDTO {
  id: number;
  idTanda: number;
  idEvento: number;
  nombreEvento: string;
  nombreTanda: string;
  precioTanda: number;
  codigoQr: string;
  nombreComprador: string;
  emailComprador: string;
  estado: EstadoEntrada;
  canalVenta: CanalVenta;
  fechaCompra: string;
  fechaUso: string | null;
}

export interface CompraOnlineRequestDTO {
  idTanda: number;
  nombreComprador: string;
  emailComprador: string;
}

export interface IniciarCompraResponseDTO {
  ordenId: string;
  urlPago: string;
  mensaje: string;
}

export interface VentaManualRequestDTO {
  idTanda: number;
  nombreComprador: string;
  emailComprador: string;
}

export interface ValidacionQRRequestDTO {
  codigoQr: string;
}

export interface ValidacionQRResponseDTO {
  valido: boolean;
  mensaje: string;
  idEntrada: number | null;
  nombreComprador: string | null;
  emailComprador: string | null;
  nombreEvento: string | null;
  nombreTanda: string | null;
  estadoAnterior: EstadoEntrada | null;
  fechaUso: string | null;
}

// ── Créditos ──────────────────────────────────────────

export interface MovimientoCreditoResponseDTO {
  id: number;
  tipoMovimiento: TipoMovimiento;
  monto: number;
  saldoResultante: number;
  fechaMovimiento: string;
  idTransaccionCredito: number | null;
  idEvento: number | null;
}

export interface PaqueteCreditoDisponibleDTO {
  id: number;
  nombre: string;
  cantidadCreditos: number;
  precio: number;
}

export interface IniciarCompraCreditoResponseDTO {
  ordenId: number;
  urlPago: string;
  mensaje: string;
}

// ── Staff ─────────────────────────────────────────────

export interface StaffResponseDTO {
  id: number;
  nombre: string;
  email: string;
  rol: RolUsuario;
  estado: EstadoUsuario;
  idEvento: number | null;
}

export interface CrearStaffQRRequestDTO {
  nombre: string;
  email: string;
  idEvento: number;
}

export interface CrearStaffVendedorRequestDTO {
  nombre: string;
  email: string;
}

// ── Admin ─────────────────────────────────────────────

export interface UsuarioResponseDTO {
  id: number;
  nombre: string;
  email: string;
  rol: RolUsuario;
  estado: EstadoUsuario;
  fechaCreacion: string;
}

// ── Métricas ──────────────────────────────────────────

export interface TandaMetricasDTO {
  idTanda: number;
  nombreTanda: string;
  vendidas: number;
  cupoMaximo: number;
  ingresos: number;
}

export interface EventoMetricasResponseDTO {
  idEvento: number;
  nombreEvento: string;
  entradasVendidas: number;
  entradasValidadas: number;
  ingresosTotales: number;
  cupoTotal: number;
  cupoDisponible: number;
  tandas: TandaMetricasDTO[];
}

// ── Errores (contrato de GlobalExceptionHandler) ──────

export interface ApiErrorBody {
  status: number;
  error: string;
  path: string;
  timestamp: string;
  fields?: Record<string, string>;
}
