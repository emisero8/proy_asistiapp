import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { CalendarSearch, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { EventCard, EventCardSkeleton } from "../../components/EventCard";
import { PublicHeader } from "../../components/PublicHeader";
import { DateRangeFilter } from "../../components/DateRangeFilter";
import { Button, EmptyState, ErrorState, IconButton, Input } from "../../components/ui";
import { api, ApiError } from "../../lib/api";
import { cn } from "../../lib/cn";
import { hoyLocal } from "../../lib/format";
import { comportamientoScroll } from "../../lib/motion";
import { FILTROS_FECHA, fechaEnRango, rangoFinDeSemana, type FiltroFecha } from "../../lib/eventFilters";
import type { EventoPublicoListItemDTO } from "../../lib/types";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

const POR_PAGINA = 16;
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "12 eventos" o, con filtros activos, "3 eventos encontrados". */
function textoContador(cantidad: number, conFiltros: boolean): string {
  const plural = cantidad !== 1;
  const base = `${cantidad} ${plural ? "eventos" : "evento"}`;
  if (!conFiltros) return base;
  return `${base} ${plural ? "encontrados" : "encontrado"}`;
}

function formatCorto(fechaIso: string): string {
  const [, mes, dia] = fechaIso.split("-");
  return `${Number(dia)} ${MESES_CORTOS[Number(mes) - 1]}`;
}

export function AllEventsPage() {
  useDocumentTitle("Todos los eventos");
  const [searchParams] = useSearchParams();
  const [eventos, setEventos] = useState<EventoPublicoListItemDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Prefill desde el buscador del hero de la Home (/eventos?q=&fecha=), reusando los filtros existentes.
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [filtroFecha, setFiltroFecha] = useState<FiltroFecha>(() => {
    const f = searchParams.get("fecha");
    return f === "hoy" || f === "este-finde" || f === "proximo-finde" ? f : "todos";
  });
  const [rangoDesde, setRangoDesde] = useState(() => searchParams.get("desde") ?? "");
  const [rangoHasta, setRangoHasta] = useState(() => searchParams.get("hasta") ?? "");
  const [pagina, setPagina] = useState(1);
  const resultadosRef = useRef<HTMLDivElement>(null);
  const rangoActivo = rangoDesde !== "" || rangoHasta !== "";
  const hayFiltros = search.trim() !== "" || filtroFecha !== "todos" || rangoActivo;

  const cargar = useCallback(() => {
    setError(null);
    setEventos(null);
    api
      .get<EventoPublicoListItemDTO[]>("/public/eventos", { skipAuth: true })
      .then(setEventos)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "No pudimos cargar los eventos."));
  }, []);

  useEffect(cargar, [cargar]);

  const hoyStr = useMemo(() => hoyLocal(), []);
  const ordenados = useMemo(() => [...(eventos ?? [])].sort((a, b) => a.fechaEvento.localeCompare(b.fechaEvento)), [eventos]);

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ordenados.filter((e) => {
      const matchesSearch = !q || e.nombre.toLowerCase().includes(q) || e.lugar.toLowerCase().includes(q);
      const matchesFecha = rangoActivo
        ? (rangoDesde === "" || e.fechaEvento >= rangoDesde) && (rangoHasta === "" || e.fechaEvento <= rangoHasta)
        : filtroFecha === "todos"
          ? true
          : filtroFecha === "hoy"
            ? e.fechaEvento === hoyStr
            : filtroFecha === "este-finde"
              ? fechaEnRango(e.fechaEvento, rangoFinDeSemana(0))
              : fechaEnRango(e.fechaEvento, rangoFinDeSemana(1));
      return matchesSearch && matchesFecha;
    });
  }, [ordenados, search, filtroFecha, hoyStr, rangoActivo, rangoDesde, rangoHasta]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  function irAPagina(n: number) {
    setPagina(n);
    resultadosRef.current?.scrollIntoView({ behavior: comportamientoScroll(), block: "start" });
  }

  function limpiarFiltros() {
    setSearch("");
    setFiltroFecha("todos");
    setRangoDesde("");
    setRangoHasta("");
    setPagina(1);
  }

  return (
    <div className="min-h-dvh bg-background">
      <PublicHeader />

      <div className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 pb-5 pt-6 lg:px-8 lg:pt-8">
          <h1 className="mb-5 font-display text-2xl font-extrabold uppercase tracking-tight text-foreground lg:text-3xl">
            Todos los eventos
          </h1>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Input
              type="search"
              aria-label="Buscar por nombre del evento o lugar"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagina(1);
              }}
              placeholder="Buscar por evento o lugar…"
              leadingIcon={<Search size={16} />}
              className="lg:max-w-sm lg:flex-1"
            />
            <div className="flex min-w-0 items-center gap-2">
              <div role="group" aria-label="Filtrar por fecha" className="flex min-w-0 gap-2 overflow-x-auto hide-scrollbar">
                {FILTROS_FECHA.map((f) => {
                  const activo = !rangoActivo && filtroFecha === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      aria-pressed={activo}
                      onClick={() => {
                        setFiltroFecha(f.id);
                        setRangoDesde("");
                        setRangoHasta("");
                        setPagina(1);
                      }}
                      className={cn(
                        "h-9 flex-none rounded-full px-4 text-sm font-semibold transition-colors duration-(--duration-fast)",
                        activo
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground",
                      )}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
              <DateRangeFilter
                desde={rangoDesde}
                hasta={rangoHasta}
                onChange={(d, h) => {
                  setRangoDesde(d);
                  setRangoHasta(h);
                  setPagina(1);
                }}
              />
              {rangoActivo && (
                <span className="inline-flex h-9 flex-none items-center gap-1 rounded-full bg-primary/10 pl-3.5 pr-1 text-sm font-semibold text-primary animate-scale-in">
                  {formatCorto(rangoDesde)}
                  {rangoHasta && rangoHasta !== rangoDesde ? ` – ${formatCorto(rangoHasta)}` : ""}
                  <button
                    type="button"
                    aria-label="Quitar el filtro de fechas"
                    className="flex size-7 items-center justify-center rounded-full transition-colors duration-(--duration-fast) hover:bg-primary/15"
                    onClick={() => {
                      setRangoDesde("");
                      setRangoHasta("");
                      setPagina(1);
                    }}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div ref={resultadosRef} className="mx-auto max-w-7xl scroll-mt-16 px-4 py-6 lg:px-8 lg:py-8">
        {error && <ErrorState title="No pudimos cargar los eventos" description={error} onRetry={cargar} />}

        {!error && eventos === null && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6" aria-busy="true">
            <span className="sr-only">Cargando eventos…</span>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Contador anunciado al filtrar. Con 0 resultados no se muestra: lo dice el estado vacío. */}
        <p className="mb-5 text-sm text-muted-foreground empty:hidden" aria-live="polite">
          {!error && eventos !== null && filtrados.length > 0 ? textoContador(filtrados.length, hayFiltros) : ""}
        </p>

        {!error && eventos !== null && filtrados.length === 0 && (
          <EmptyState
            icon={CalendarSearch}
            title={hayFiltros ? "No encontramos eventos con esos filtros" : "Todavía no hay eventos publicados"}
            description={hayFiltros ? "Probá con otra búsqueda u otra fecha." : "Volvé pronto: acá vas a encontrar los próximos recitales y fiestas."}
            action={
              hayFiltros ? (
                <Button variant="secondary" onClick={limpiarFiltros}>
                  Limpiar filtros
                </Button>
              ) : undefined
            }
          />
        )}

        {!error && visibles.length > 0 && (
          <>
            <ul className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
              {visibles.map((ev, i) => (
                <li key={ev.id}>
                  <EventCard
                    evento={ev}
                    etiqueta={ev.fechaEvento === hoyStr ? "Hoy" : undefined}
                    prioridad={i < 4}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                  />
                </li>
              ))}
            </ul>

            {totalPaginas > 1 && (
              <nav aria-label="Paginación" className="mt-10 flex items-center justify-center gap-2">
                <IconButton
                  label="Página anterior"
                  icon={<ChevronLeft size={16} />}
                  variant="secondary"
                  disabled={paginaActual === 1}
                  onClick={() => irAPagina(paginaActual - 1)}
                />
                <ul className="flex items-center gap-1">
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                    <li key={n}>
                      <button
                        type="button"
                        aria-current={n === paginaActual ? "page" : undefined}
                        aria-label={`Página ${n}`}
                        onClick={() => irAPagina(n)}
                        className={cn(
                          "h-9 min-w-9 rounded-xl px-2 text-sm font-semibold tabular-nums transition-colors duration-(--duration-fast)",
                          n === paginaActual ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {n}
                      </button>
                    </li>
                  ))}
                </ul>
                <IconButton
                  label="Página siguiente"
                  icon={<ChevronRight size={16} />}
                  variant="secondary"
                  disabled={paginaActual === totalPaginas}
                  onClick={() => irAPagina(paginaActual + 1)}
                />
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
