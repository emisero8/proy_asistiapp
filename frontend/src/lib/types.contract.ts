// Guardia de desfasajes entre `types.ts` (escrito a mano, con la nulabilidad real de cada campo) y el contrato
// del backend (`openapi.json` → `api-schema.d.ts`, ver `npm run types:api`).
//
// No genera código: solo se verifica al compilar. Si un DTO del backend gana, pierde, renombra o cambia de tipo
// un campo (o un valor de un enum), el `tsc -b` falla en la línea de ese DTO y hay que actualizar `types.ts`.
//
// Qué se compara y qué no:
//   - Mismos campos, en los dos sentidos, también dentro de objetos y listas anidados.
//   - Mismo tipo base. Un `string` o `number` del backend puede estar acotado a un literal en `types.ts`
//     (ej. `tipo: "Bearer"`), pero un enum del backend tiene que ser exactamente el mismo conjunto de valores.
//   - NO se compara si el campo es opcional ni si admite null: el backend no lo declara (los DTOs de respuesta
//     salen con todos los campos opcionales) y es justamente lo que `types.ts` sabe y el contrato no.
import type { components } from "./api-schema";
import type * as T from "./types";

type S = components["schemas"];

type Base<X> = NonNullable<X>;
type Igual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Todos<M> = false extends M[keyof M] ? false : true;

type Primitivo<H, G> = [string] extends [G]
  ? [H] extends [string]
    ? true
    : false
  : [number] extends [G]
    ? [H] extends [number]
      ? true
      : false
    : Igual<H, G>;

type CoincideObjeto<H, G> =
  Igual<keyof H, keyof G> extends true ? Todos<{ [K in keyof H]: K extends keyof G ? Coincide<H[K], G[K]> : false }> : false;

type Coincide<H, G> =
  Base<H> extends readonly (infer HI)[]
    ? Base<G> extends readonly (infer GI)[]
      ? Coincide<HI, GI>
      : false
    : Base<H> extends object
      ? Base<G> extends object
        ? CoincideObjeto<Base<H>, Required<Base<G>>>
        : false
      : Primitivo<Base<H>, Base<G>>;

/** Si `X` no es `true`, el error "Type 'false' does not satisfy the constraint 'true'" cae en la línea del DTO. */
type Afirma<X extends true> = X;

export type ContratoConElBackend = [
  Afirma<Coincide<T.ResumenOrganizadorResponseDTO, S["ResumenOrganizadorResponseDTO"]>>,
  Afirma<Coincide<T.CreditosResumenResponseDTO, S["CreditosResumenResponseDTO"]>>,
  Afirma<Coincide<T.AuthResponseDTO, S["AuthResponseDTO"]>>,
  Afirma<Coincide<T.PerfilResponseDTO, S["PerfilResponseDTO"]>>,
  Afirma<Coincide<T.PerfilRequestDTO, S["PerfilRequestDTO"]>>,
  Afirma<Coincide<T.TopeCompradorRequestDTO, S["TopeCompradorRequestDTO"]>>,
  Afirma<Coincide<T.ContactoRequestDTO, S["ContactoRequestDTO"]>>,
  Afirma<Coincide<T.ComisionMpRequestDTO, S["ComisionMpRequestDTO"]>>,
  Afirma<Coincide<T.EstadoCuentaMpResponseDTO, S["EstadoCuentaMpResponseDTO"]>>,
  Afirma<Coincide<T.IniciarVinculacionResponseDTO, S["IniciarVinculacionResponseDTO"]>>,
  Afirma<Coincide<T.CambiarPasswordRequestDTO, S["CambiarPasswordRequestDTO"]>>,
  Afirma<Coincide<T.LoginRequestDTO, S["LoginRequestDTO"]>>,
  Afirma<Coincide<T.RegisterRequestDTO, S["RegisterRequestDTO"]>>,
  Afirma<Coincide<T.SolicitarRecuperacionRequestDTO, S["SolicitarRecuperacionRequestDTO"]>>,
  Afirma<Coincide<T.RestablecerPasswordRequestDTO, S["RestablecerPasswordRequestDTO"]>>,
  Afirma<Coincide<T.TandaResponseDTO, S["TandaResponseDTO"]>>,
  Afirma<Coincide<T.TandaRequestDTO, S["TandaRequestDTO"]>>,
  Afirma<Coincide<T.TopeVendedorResponseDTO, S["TopeVendedorResponseDTO"]>>,
  Afirma<Coincide<T.EventoResponseDTO, S["EventoResponseDTO"]>>,
  Afirma<Coincide<T.EventoRequestDTO, S["EventoRequestDTO"]>>,
  Afirma<Coincide<T.ImagenSubidaResponseDTO, S["ImagenSubidaResponseDTO"]>>,
  Afirma<Coincide<T.EventoPublicoListItemDTO, S["EventoPublicoListItemDTO"]>>,
  Afirma<Coincide<T.EventoPublicoDetalleDTO, S["EventoPublicoDetalleDTO"]>>,
  Afirma<Coincide<T.EntradaResponseDTO, S["EntradaResponseDTO"]>>,
  Afirma<Coincide<T.AnularEntradaRequestDTO, S["AnularEntradaRequestDTO"]>>,
  Afirma<Coincide<T.ResultadoAnulacionResponseDTO, S["ResultadoAnulacionResponseDTO"]>>,
  Afirma<Coincide<T.ResultadoReembolsoMasivoResponseDTO, S["ResultadoReembolsoMasivoResponseDTO"]>>,
  Afirma<Coincide<T.EstadoOrdenEntradasResponseDTO, S["EstadoOrdenEntradasResponseDTO"]>>,
  Afirma<Coincide<T.EstadoOrdenCreditoResponseDTO, S["EstadoOrdenCreditoResponseDTO"]>>,
  Afirma<Coincide<T.CompraOnlineRequestDTO, S["CompraOnlineRequestDTO"]>>,
  Afirma<Coincide<T.IniciarCompraResponseDTO, S["IniciarCompraResponseDTO"]>>,
  Afirma<Coincide<T.VentaManualRequestDTO, S["VentaManualRequestDTO"]>>,
  Afirma<Coincide<T.EmisionOrganizadorRequestDTO, S["EmisionOrganizadorRequestDTO"]>>,
  Afirma<Coincide<T.DisponibilidadCompradorResponseDTO, S["DisponibilidadCompradorResponseDTO"]>>,
  Afirma<Coincide<T.ValidacionQRRequestDTO, S["ValidacionQRRequestDTO"]>>,
  Afirma<Coincide<T.ValidacionQRResponseDTO, S["ValidacionQRResponseDTO"]>>,
  Afirma<Coincide<T.MovimientoCreditoResponseDTO, S["MovimientoCreditoResponseDTO"]>>,
  Afirma<Coincide<T.PaqueteCreditoDisponibleDTO, S["PaqueteCreditoDisponibleDTO"]>>,
  Afirma<Coincide<T.EstadisticasPublicasResponseDTO, S["EstadisticasPublicasResponseDTO"]>>,
  Afirma<Coincide<T.SoporteResponseDTO, S["SoporteResponseDTO"]>>,
  Afirma<Coincide<T.IniciarCompraCreditoRequestDTO, S["IniciarCompraCreditoRequestDTO"]>>,
  Afirma<Coincide<T.IniciarCompraCreditoResponseDTO, S["IniciarCompraCreditoResponseDTO"]>>,
  Afirma<Coincide<T.CompraCreditoResponseDTO, S["CompraCreditoResponseDTO"]>>,
  Afirma<Coincide<T.StaffResponseDTO, S["StaffResponseDTO"]>>,
  Afirma<Coincide<T.CrearStaffQRRequestDTO, S["CrearStaffQRRequestDTO"]>>,
  Afirma<Coincide<T.CrearStaffVendedorRequestDTO, S["CrearStaffVendedorRequestDTO"]>>,
  Afirma<Coincide<T.CambiarTopeVendedorRequestDTO, S["CambiarTopeVendedorRequestDTO"]>>,
  Afirma<Coincide<T.UsuarioResponseDTO, S["UsuarioResponseDTO"]>>,
  Afirma<Coincide<T.ConfiguracionSistemaResponseDTO, S["ConfiguracionSistemaResponseDTO"]>>,
  Afirma<Coincide<T.ActualizarConfiguracionRequestDTO, S["ActualizarConfiguracionRequestDTO"]>>,
  Afirma<Coincide<T.PaqueteCreditoResponseDTO, S["PaqueteCreditoResponseDTO"]>>,
  Afirma<Coincide<T.PaqueteCreditoRequestDTO, S["PaqueteCreditoRequestDTO"]>>,
  Afirma<Coincide<T.LogAuditoriaResponseDTO, S["LogAuditoriaResponseDTO"]>>,
  Afirma<Coincide<T.PaginaAuditoriaResponseDTO, S["PaginaAuditoriaResponseDTO"]>>,
  Afirma<Coincide<T.AdminMetricasResponseDTO, S["AdminMetricasResponseDTO"]>>,
  Afirma<Coincide<T.TandaMetricasDTO, S["TandaMetricasDTO"]>>,
  Afirma<Coincide<T.EventoMetricasResponseDTO, S["EventoMetricasResponseDTO"]>>,
  Afirma<Coincide<T.NotificacionResponseDTO, S["NotificacionResponseDTO"]>>,
  Afirma<Coincide<T.CrearAnuncioRequestDTO, S["CrearAnuncioRequestDTO"]>>,
  Afirma<Coincide<T.AnuncioEnviadoResponseDTO, S["AnuncioEnviadoResponseDTO"]>>,
];
