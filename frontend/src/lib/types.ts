// Espejo de los DTOs reales del backend (ver `backend/src/main/java/.../models/dtos`
// y `backend/src/main/java/.../models/enums`). Fuente de verdad: Swagger en
// http://localhost:8080/v3/api-docs con el backend corriendo. Mantener sincronizado
// a mano — no hay generación automática de tipos desde el OpenAPI todavía.

export type RolUsuario = "Administrador" | "Organizador" | "Staff_QR" | "Staff_Vendedor";
export type EstadoUsuario = "Activo" | "Suspendido" | "Inactivo";
export type EstadoEvento = "Borrador" | "Publicado" | "Cancelado";
export type EstadoEntrada = "Pagada" | "Usada";
export type CanalVenta = "Online" | "Manual";
export type TipoMovimiento = "Bienvenida" | "Recarga" | "Consumo_Publicacion" | "Consumo_Tanda" | "Devolucion_Tanda";

/** GET /eventos/resumen: métricas generales del Organizador (todos sus eventos). */
export interface ResumenOrganizadorResponseDTO {
  eventosPublicados: number;
  eventosBorrador: number;
  entradasVendidas: number;
  entradasValidadas: number;
  ingresosTotales: number;
  creditosConsumidos: number;
  saldoCreditos: number;
  proximoEvento: { id: number; nombre: string; fechaEvento: string } | null;
}

/** GET /creditos/resumen: saldo, costo de publicar y créditos disponibles para entradas de tandas. */
export interface CreditosResumenResponseDTO {
  saldo: number;
  costoPublicacion: number;
  disponibleParaEntradas: number;
}
export type EstadoTransaccion = "Pendiente" | "Aprobada" | "Rechazada" | "Expirada" | "Reembolsada";
export type EstadoPaquete = "Activo" | "Deshabilitado";

// ── Auth ──────────────────────────────────────────────

export interface AuthResponseDTO {
  token: string;
  tipo: "Bearer";
  id: number;
  nombre: string;
  email: string;
  rol: RolUsuario;
  fotoPerfilUrl?: string | null;
}

/** Perfil del Organizador autenticado (GET/PUT /organizador/perfil). */
export interface PerfilResponseDTO {
  id: number;
  nombre: string;
  email: string;
  fotoPerfilUrl: string | null;
}

export interface PerfilRequestDTO {
  nombre: string;
  fotoPerfilUrl: string | null;
}

export interface CambiarPasswordRequestDTO {
  passwordActual: string;
  passwordNueva: string;
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
  latitud: number | null;
  longitud: number | null;
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
  latitud?: number | null;
  longitud?: number | null;
  imagenPortadaUrl?: string;
}

/** Respuesta de POST /eventos/imagenes: URL alojada en Cloudinary. */
export interface ImagenSubidaResponseDTO {
  url: string;
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
  latitud: number | null;
  longitud: number | null;
  imagenPortadaUrl: string | null;
  urlPublica: string;
  tandas: TandaResponseDTO[];
  maxEntradasPorCompra: number;
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

/** GET /tickets/orden/{ref}: estado de una compra de entradas, para /pago/resultado. */
export interface EstadoOrdenEntradasResponseDTO {
  estado: EstadoTransaccion;
  cantidad: number;
  nombreEvento: string;
  nombreTanda: string;
  entradas: EntradaResponseDTO[];
}

/** GET /creditos/orden/{ref}: estado de una compra de créditos, para /pago/resultado. */
export interface EstadoOrdenCreditoResponseDTO {
  estado: EstadoTransaccion;
  cantidadCreditos: number | null;
  monto: number;
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

/** GET /tickets/disponibilidad-comprador: cuánto más se le puede vender a este comprador (CU-019). */
export interface DisponibilidadCompradorResponseDTO {
  limite: number;
  yaCompradas: number;
  disponible: number;
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

export interface EstadisticasPublicasResponseDTO {
  organizadoresActivos: number;
  entradasVendidas: number;
  eventosPublicados: number;
}

/** GET /public/soporte: datos de contacto configurables por el Admin (ConfiguracionSistema). */
export interface SoporteResponseDTO {
  emailSoporte: string | null;
  whatsappSoporte: string | null;
}

export interface IniciarCompraCreditoResponseDTO {
  ordenId: number;
  urlPago: string;
  mensaje: string;
}

/** GET /creditos/compras (CU-019): todas las órdenes del Organizador, en cualquier estado. */
export interface CompraCreditoResponseDTO {
  externalReference: string;
  nombrePaquete: string;
  cantidadCreditos: number | null;
  monto: number;
  estado: EstadoTransaccion;
  fechaTransaccion: string;
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
  idEvento: number;
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

export interface ConfiguracionSistemaResponseDTO {
  id: number;
  clave: string;
  valor: string;
  descripcion: string | null;
  fechaActualizacion: string | null;
  idAdministrador: number | null;
}

export interface ActualizarConfiguracionRequestDTO {
  valor: string;
  descripcion?: string;
}

export interface PaqueteCreditoResponseDTO {
  id: number;
  nombre: string;
  cantidadCreditos: number;
  precio: number;
  estado: EstadoPaquete;
}

export interface PaqueteCreditoRequestDTO {
  nombre: string;
  cantidadCreditos: number;
  precio: number;
}

export interface LogAuditoriaResponseDTO {
  id: number;
  idAdmin: number;
  accion: string;
  entidadAfectada: string;
  idEntidadAfectada: number | null;
  detalle: string | null;
  fechaHora: string;
}

export interface AdminMetricasResponseDTO {
  eventosActivos: number;
  eventosTotales: number;
  entradasVendidas: number;
  ingresosTotales: number;
  organizadoresActivos: number;
}

// ── Métricas ──────────────────────────────────────────

export interface TandaMetricasDTO {
  idTanda: number;
  nombre: string;
  cupoMaximo: number;
  cupoDisponible: number;
  vendidas: number;
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

// ── Notificaciones (in-app) ───────────────────────────

export type OrigenNotificacion = "Admin" | "Sistema";

export interface NotificacionResponseDTO {
  id: number;
  origen: OrigenNotificacion;
  titulo: string;
  mensaje: string;
  leida: boolean;
  fechaCreacion: string;
  tipoEntidadRelacionada: string | null;
  idEntidadRelacionada: number | null;
}

export interface CrearAnuncioRequestDTO {
  titulo: string;
  mensaje: string;
}

export interface AnuncioEnviadoResponseDTO {
  enviadas: number;
}

// ── Errores (contrato de GlobalExceptionHandler) ──────

export interface ApiErrorBody {
  status: number;
  error: string;
  path: string;
  timestamp: string;
  fields?: Record<string, string>;
}
