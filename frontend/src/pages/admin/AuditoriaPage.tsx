import { type ReactNode, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, History, Search, X } from "lucide-react";
import { DateRangeFilter } from "../../components/DateRangeFilter";
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Select, Skeleton } from "../../components/ui";
import { api, ApiError } from "../../lib/api";
import {
  ACCIONES,
  accionesDelGrupo,
  ENTIDADES,
  etiquetaEntidad,
  GRUPOS,
  infoAccion,
  lineasDetalle,
  nombreEmisor,
  nombreEntidad,
  ROLES_EMISOR,
} from "../../lib/auditoria";
import { ETIQUETA_ROL, TONO_ROL } from "../../lib/estados";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import type { LogAuditoriaResponseDTO, PaginaAuditoriaResponseDTO, RolUsuario } from "../../lib/types";

const TAMANOS = [10, 20, 50, 100];
const TAMANO_POR_DEFECTO = 20;
const CLAVE_TAMANO = "asistiapp_auditoria_tamano";

/** Filas por página elegidas la última vez (preferencia de este navegador; si no hay, 20). */
function tamanoGuardado(): number {
  try {
    const n = Number(localStorage.getItem(CLAVE_TAMANO));
    return TAMANOS.includes(n) ? n : TAMANO_POR_DEFECTO;
  } catch {
    return TAMANO_POR_DEFECTO;
  }
}

function guardarTamano(n: number) {
  try {
    localStorage.setItem(CLAVE_TAMANO, String(n));
  } catch {
    // Sin almacenamiento (modo privado): la preferencia dura lo que dure la pestaña.
  }
}

function fecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

/** "(#12)" atenuado, para que el nombre siga siendo lo principal. */
function Id({ id }: Readonly<{ id: number | null }>) {
  if (id == null) return null;
  return <span className="ml-1 font-mono text-xs text-muted-foreground tabular-nums">(#{id})</span>;
}

/** El texto de búsqueda se manda al backend recién cuando se deja de escribir. */
function useDebounced<T>(valor: T, ms: number): T {
  const [demorado, setDemorado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setDemorado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return demorado;
}

/** Filtro puntual que se arma tocando un nombre en la tabla. */
interface FiltroEmisor {
  id: number;
  nombre: string;
}
interface FiltroEntidad {
  tipo: string;
  id: number;
  nombre: string;
}

export function AdminAuditoriaPage() {
  useDocumentTitle("Auditoría · Admin");
  const [pagina, setPagina] = useState<PaginaAuditoriaResponseDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [reintento, setReintento] = useState(0);

  const [rol, setRol] = useState<RolUsuario | "">("");
  const [busqueda, setBusqueda] = useState("");
  const [accion, setAccion] = useState("");
  const [entidad, setEntidad] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [emisor, setEmisor] = useState<FiltroEmisor | null>(null);
  const [registro, setRegistro] = useState<FiltroEntidad | null>(null);
  const [numeroPagina, setNumeroPagina] = useState(0);
  const [tamano, setTamano] = useState(tamanoGuardado);
  const busquedaDemorada = useDebounced(busqueda.trim(), 350);
  const tablaRef = useRef<HTMLDivElement>(null);

  // Cualquier filtro nuevo (o cambiar las filas por página) vuelve a la primera página.
  useEffect(() => setNumeroPagina(0), [rol, busquedaDemorada, accion, entidad, desde, hasta, emisor, registro, tamano]);

  useEffect(() => {
    const params = new URLSearchParams({ pagina: String(numeroPagina), tamano: String(tamano) });
    if (rol) params.set("rol", rol);
    if (busquedaDemorada) params.set("q", busquedaDemorada);
    if (accion) params.set("accion", accion);
    if (registro) {
      params.set("entidad", registro.tipo);
      params.set("idEntidad", String(registro.id));
    } else if (entidad) {
      params.set("entidad", entidad);
    }
    if (emisor) params.set("idEmisor", String(emisor.id));
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);

    let vigente = true;
    setCargando(true);
    setError(null);
    api
      .get<PaginaAuditoriaResponseDTO>(`/admin/auditoria?${params}`)
      .then((r) => vigente && setPagina(r))
      .catch((e: unknown) => vigente && setError(e instanceof ApiError ? e.message : "No pudimos cargar la auditoría."))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [rol, busquedaDemorada, accion, entidad, desde, hasta, emisor, registro, numeroPagina, tamano, reintento]);

  const hayFiltros = Boolean(rol || busqueda || accion || entidad || desde || hasta || emisor || registro);
  function limpiarFiltros() {
    setRol("");
    setBusqueda("");
    setAccion("");
    setEntidad("");
    setDesde("");
    setHasta("");
    setEmisor(null);
    setRegistro(null);
  }

  function irAPagina(n: number) {
    setNumeroPagina(n);
    tablaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cambiarTamano(n: number) {
    setTamano(n);
    guardarTamano(n);
  }

  function filtrarPorEmisor(log: LogAuditoriaResponseDTO) {
    setEmisor({ id: log.idEmisor, nombre: nombreEmisor(log) });
    tablaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function filtrarPorRegistro(log: LogAuditoriaResponseDTO) {
    if (log.idEntidadAfectada == null) return;
    setRegistro({
      tipo: log.entidadAfectada,
      id: log.idEntidadAfectada,
      nombre: nombreEntidad(log) ?? etiquetaEntidad(log.entidadAfectada),
    });
    tablaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const total = pagina?.totalElementos ?? 0;
  const primera = pagina && total > 0 ? pagina.pagina * pagina.tamano + 1 : 0;
  const ultima = pagina ? pagina.pagina * pagina.tamano + pagina.items.length : 0;

  let descripcion = "Quién hizo cada acción, sobre qué y qué cambió.";
  if (pagina !== null) {
    const plural = total === 1 ? "acción" : "acciones";
    descripcion = hayFiltros
      ? `${total} ${plural} ${total === 1 ? "coincide" : "coinciden"} con los filtros.`
      : `${total} ${plural} ${total === 1 ? "registrada" : "registradas"}.`;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <PageHeader title="Auditoría" description={descripcion} />

      <section aria-label="Filtros de la auditoría" className="space-y-3">
        {/* Quién hizo la acción: el filtro principal, como chips. */}
        <div role="group" aria-label="Filtrar por rol de quien hizo la acción" className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
          <ChipRol activo={rol === ""} onClick={() => setRol("")}>
            Todos
          </ChipRol>
          {ROLES_EMISOR.map((r) => (
            <ChipRol key={r.rol} activo={rol === r.rol} onClick={() => setRol(r.rol)}>
              {r.etiqueta}
            </ChipRol>
          ))}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="flex items-center gap-3">
            <Input
              type="search"
              size="sm"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre, evento, detalle o #id"
              aria-label="Buscar por nombre de quien hizo la acción o de lo afectado, evento, detalle o id"
              leadingIcon={<Search size={15} />}
              className="min-w-0 flex-1 lg:w-72 lg:flex-none"
            />
            <DateRangeFilter
              desde={desde}
              hasta={hasta}
              onChange={(d, h) => {
                setDesde(d);
                setHasta(h);
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
            <Select
              size="sm"
              value={entidad}
              onChange={(e) => {
                setEntidad(e.target.value);
                setRegistro(null);
              }}
              aria-label="Filtrar por tipo de entidad afectada"
              className="sm:w-52"
            >
              <option value="">Entidad: todas</option>
              {Object.entries(ENTIDADES).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </Select>
            <Select size="sm" value={accion} onChange={(e) => setAccion(e.target.value)} aria-label="Filtrar por acción" className="sm:w-60">
              <option value="">Acción: todas</option>
              {GRUPOS.map((g) => (
                <optgroup key={g} label={g}>
                  {accionesDelGrupo(g).map((a) => (
                    <option key={a} value={a}>
                      {ACCIONES[a].etiqueta}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </div>
          {hayFiltros && (
            <Button variant="ghost" size="sm" leftIcon={<X size={14} />} onClick={limpiarFiltros} className="self-start lg:self-auto">
              Limpiar filtros
            </Button>
          )}
        </div>

        {(emisor || registro) && (
          <ul aria-label="Filtros puntuales" className="flex flex-wrap gap-2">
            {emisor && (
              <FiltroActivo etiqueta="Hecho por" valor={`${emisor.nombre} (#${emisor.id})`} onQuitar={() => setEmisor(null)} />
            )}
            {registro && (
              <FiltroActivo
                etiqueta={etiquetaEntidad(registro.tipo)}
                valor={`${registro.nombre} (#${registro.id})`}
                onQuitar={() => setRegistro(null)}
              />
            )}
          </ul>
        )}
      </section>

      {error && <ErrorState title="No pudimos cargar la auditoría" description={error} onRetry={() => setReintento((n) => n + 1)} />}

      {!error && pagina === null && (
        <div className="space-y-2" aria-busy="true">
          <span className="sr-only">Cargando auditoría…</span>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      )}

      {!error && pagina !== null && (
        <div ref={tablaRef} className="scroll-mt-6">
          <Card as="section" padding="none" aria-label="Registro de auditoría" aria-busy={cargando} className="overflow-hidden">
            {pagina.items.length === 0 ? (
              <EmptyState
                variant="plain"
                icon={History}
                title={hayFiltros ? "Ninguna acción coincide con los filtros" : "Todavía no hay acciones registradas"}
                description={hayFiltros ? "Probá con otro texto, otra acción u otras fechas." : "Acá vas a ver cada cambio que hagan administradores, organizadores y su staff."}
                action={
                  hayFiltros ? (
                    <Button variant="secondary" size="sm" onClick={limpiarFiltros}>
                      Limpiar filtros
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              // Tabla desde lg; en mobile/tablet cada fila es una tarjeta con lo mismo.
              <table className={`w-full text-sm transition-opacity ${cargando ? "opacity-60" : ""}`}>
                <thead className="sr-only lg:not-sr-only">
                  <tr className="border-b border-border bg-surface-sunken text-2xs uppercase tracking-wider text-muted-foreground">
                    <th scope="col" className="px-5 py-2.5 text-left font-semibold">Fecha y hora</th>
                    <th scope="col" className="px-4 py-2.5 text-left font-semibold">Acción</th>
                    <th scope="col" className="px-4 py-2.5 text-left font-semibold">Emisor</th>
                    <th scope="col" className="px-4 py-2.5 text-left font-semibold">Entidad afectada</th>
                    <th scope="col" className="px-5 py-2.5 text-left font-semibold">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pagina.items.map((log) => (
                    <FilaAuditoria key={log.id} log={log} onEmisor={filtrarPorEmisor} onRegistro={filtrarPorRegistro} />
                  ))}
                </tbody>
              </table>
            )}

            {total > 0 && (
              <nav
                aria-label="Paginación de la auditoría"
                className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5"
              >
                <div className="flex items-center gap-3">
                  <label htmlFor="filas-por-pagina" className="text-xs text-muted-foreground">
                    Filas por página
                  </label>
                  <Select
                    id="filas-por-pagina"
                    size="sm"
                    value={String(tamano)}
                    onChange={(e) => cambiarTamano(Number(e.target.value))}
                    className="w-20"
                  >
                    {TAMANOS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {primera}–{ultima} de {total}
                  </p>
                </div>
                {pagina.totalPaginas > 1 && (
                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<ChevronLeft size={14} />}
                      disabled={cargando || pagina.pagina === 0}
                      onClick={() => irAPagina(pagina.pagina - 1)}
                    >
                      Anterior
                    </Button>
                    <span className="px-1 text-xs text-muted-foreground tabular-nums">
                      Página {pagina.pagina + 1} de {pagina.totalPaginas}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={cargando || pagina.pagina >= pagina.totalPaginas - 1}
                      onClick={() => irAPagina(pagina.pagina + 1)}
                    >
                      Siguiente
                      <ChevronRight size={14} aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </nav>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

/** Chip de filtro (DESIGN.md → Selección): activo en primary, inactivo en card. */
function ChipRol({ activo, onClick, children }: Readonly<{ activo: boolean; onClick: () => void; children: ReactNode }>) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={`h-8 flex-none rounded-full px-3.5 text-xs font-semibold transition-colors duration-(--duration-fast) ${
        activo ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function FiltroActivo({ etiqueta, valor, onQuitar }: Readonly<{ etiqueta: string; valor: string; onQuitar: () => void }>) {
  return (
    <li className="inline-flex h-8 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 pl-3.5 pr-1 text-xs">
      <span className="text-muted-foreground">{etiqueta}:</span>
      <span className="font-semibold text-foreground">{valor}</span>
      <button
        type="button"
        onClick={onQuitar}
        aria-label={`Quitar el filtro ${etiqueta}: ${valor}`}
        className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/15 hover:text-foreground"
      >
        <X size={13} aria-hidden="true" />
      </button>
    </li>
  );
}

/**
 * Nombre que, al tocarlo, filtra la tabla por esa persona o ese registro. `titulo` es el tooltip y
 * también va oculto dentro del botón: el lector de pantalla tiene que saber que filtra, no solo el nombre.
 */
function NombreFiltrable({ children, titulo, onClick }: Readonly<{ children: ReactNode; titulo: string; onClick: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titulo}
      className="rounded text-left font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline"
    >
      {children}
      <span className="sr-only">. {titulo}</span>
    </button>
  );
}

function FilaAuditoria({
  log,
  onEmisor,
  onRegistro,
}: Readonly<{ log: LogAuditoriaResponseDTO; onEmisor: (l: LogAuditoriaResponseDTO) => void; onRegistro: (l: LogAuditoriaResponseDTO) => void }>) {
  const info = infoAccion(log.accion);
  const Icono = info.icono;
  const nombre = nombreEntidad(log);
  const lineas = lineasDetalle(log);
  const emisor = nombreEmisor(log);

  return (
    <tr className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-4 lg:table-row lg:p-0 lg:hover:bg-surface-sunken">
      {/* Mobile: acción a la izquierda y fecha a la derecha en la primera línea; el resto debajo, a lo ancho. */}
      <td className="order-1 ml-auto lg:table-cell lg:w-px lg:whitespace-nowrap lg:px-5 lg:py-3.5 lg:align-top">
        <time dateTime={log.fechaHora} className="text-xs text-muted-foreground lg:block lg:text-sm lg:text-foreground">
          <span className="lg:block">{fecha(log.fechaHora)}</span>
          <span className="lg:hidden"> · </span>
          <span className="tabular-nums lg:text-xs lg:text-muted-foreground">{hora(log.fechaHora)}</span>
        </time>
      </td>
      <td className="order-0 lg:table-cell lg:whitespace-nowrap lg:px-4 lg:py-3.5 lg:align-top">
        <Badge tone={info.tono}>
          <Icono size={13} aria-hidden="true" />
          {info.etiqueta}
        </Badge>
      </td>
      <td className="order-2 basis-full text-sm lg:table-cell lg:min-w-52 lg:px-4 lg:py-3.5 lg:align-top">
        <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground lg:hidden">Emisor · </span>
        <NombreFiltrable onClick={() => onEmisor(log)} titulo={`Ver solo lo que hizo ${emisor}`}>
          {emisor}
        </NombreFiltrable>
        <Id id={log.idEmisor} />
        {log.emisorRol && (
          <span className="ml-2 align-middle lg:ml-0 lg:mt-1 lg:block">
            <Badge tone={TONO_ROL[log.emisorRol]} size="sm">
              {ETIQUETA_ROL[log.emisorRol]}
            </Badge>
          </span>
        )}
      </td>
      <td className="order-3 basis-full text-sm lg:table-cell lg:min-w-60 lg:px-4 lg:py-3.5 lg:align-top">
        <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground lg:hidden">Sobre · </span>
        {nombre && log.idEntidadAfectada != null ? (
          <NombreFiltrable onClick={() => onRegistro(log)} titulo={`Ver todo lo que pasó con ${nombre}`}>
            {nombre}
          </NombreFiltrable>
        ) : nombre ? (
          <span className="font-semibold text-foreground">{nombre}</span>
        ) : (
          <span className="italic text-muted-foreground">Sin nombre registrado</span>
        )}
        <Id id={log.idEntidadAfectada} />
        <span className="block text-xs text-muted-foreground lg:mt-0.5">{etiquetaEntidad(log.entidadAfectada)}</span>
      </td>
      <td className="order-4 basis-full lg:table-cell lg:px-5 lg:py-3.5 lg:align-top">
        {lineas.length > 0 ? (
          <ul className="space-y-0.5 rounded-lg bg-surface-sunken px-3 py-2 text-xs text-muted-foreground lg:bg-transparent lg:p-0">
            {lineas.map((linea, i) => (
              // El detalle es inmutable y puede repetir una línea: el índice es estable acá.
              <li key={`${i}-${linea}`} className="break-words">
                <Linea texto={linea} />
              </li>
            ))}
          </ul>
        ) : (
          <span className="hidden text-muted-foreground lg:inline">—</span>
        )}
      </td>
    </tr>
  );
}

/** "Precio: $1.000 → $1.500": el nombre del campo atenuado, el valor viejo tachado y el nuevo resaltado. */
function Linea({ texto }: Readonly<{ texto: string }>) {
  const separador = texto.indexOf(": ");
  if (separador === -1) return <>{texto}</>;
  const campo = texto.slice(0, separador);
  const valor = texto.slice(separador + 2);
  const flecha = valor.lastIndexOf(" → ");
  return (
    <>
      <span>{campo}: </span>
      {flecha === -1 ? (
        <span className="text-foreground">{valor}</span>
      ) : (
        <>
          <span className="line-through decoration-muted-foreground/60">{valor.slice(0, flecha)}</span>
          <span aria-hidden="true"> → </span>
          <span className="sr-only"> pasó a </span>
          <span className="font-semibold text-foreground">{valor.slice(flecha + 3)}</span>
        </>
      )}
    </>
  );
}
