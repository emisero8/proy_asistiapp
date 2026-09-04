import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, ChevronRight, Search, MapPin, Calendar, Sparkles, X } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { fmt, formatFecha } from "../../lib/format";
import { FILTROS_FECHA, fechaEnRango, rangoFinDeSemana, type FiltroFecha } from "../../lib/eventFilters";
import { DateRangeFilter } from "../../components/DateRangeFilter";
import type { EventoPublicoListItemDTO } from "../../lib/types";

const POR_PAGINA = 16;

function formatCorto(fechaIso: string): string {
  const [, mes, dia] = fechaIso.split("-");
  const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${Number(dia)} ${MESES_CORTOS[Number(mes) - 1]}`;
}

export function AllEventsPage() {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState<EventoPublicoListItemDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filtroFecha, setFiltroFecha] = useState<FiltroFecha>("todos");
  const [rangoDesde, setRangoDesde] = useState("");
  const [rangoHasta, setRangoHasta] = useState("");
  const [pagina, setPagina] = useState(1);
  const rangoActivo = rangoDesde !== "" || rangoHasta !== "";

  useEffect(() => {
    api
      .get<EventoPublicoListItemDTO[]>("/public/eventos", { skipAuth: true })
      .then(setEventos)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "No pudimos cargar los eventos."));
  }, []);

  const hoyStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const ordenados = useMemo(
    () => [...(eventos ?? [])].sort((a, b) => a.fechaEvento.localeCompare(b.fechaEvento)),
    [eventos],
  );

  const filtrados = useMemo(() => {
    return ordenados.filter((e) => {
      const q = search.toLowerCase();
      const matchesSearch = e.nombre.toLowerCase().includes(q) || e.lugar.toLowerCase().includes(q);
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
    document.getElementById("all-events-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen bg-background">
      <div id="all-events-top" className="px-4 lg:px-8 pt-5 pb-4 border-b border-border">
        <div className="max-w-[1400px] mx-auto">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ChevronLeft size={15} />
            Volver al inicio
          </button>
          <h1 className="font-display uppercase text-xl lg:text-2xl font-extrabold text-foreground tracking-tight mb-4">
            Todos los eventos
          </h1>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative sm:max-w-sm sm:flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPagina(1);
                }}
                placeholder="Eventos, lugares..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-muted text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                {FILTROS_FECHA.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setFiltroFecha(f.id);
                      setRangoDesde("");
                      setRangoHasta("");
                      setPagina(1);
                    }}
                    className={`flex-none px-3.5 py-1.5 rounded-full text-sm font-bold transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] ${
                      !rangoActivo && filtroFecha === f.id ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
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
                <span className="flex-none inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold animate-scale-in">
                  {formatCorto(rangoDesde)}
                  {rangoHasta && rangoHasta !== rangoDesde ? ` – ${formatCorto(rangoHasta)}` : ""}
                  <button
                    onClick={() => {
                      setRangoDesde("");
                      setRangoHasta("");
                      setPagina(1);
                    }}
                    aria-label="Quitar filtro de fechas"
                    className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-primary/20 hover:scale-110 active:scale-90 transition-all duration-150"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6">
        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-sm p-4">
            {error}
          </div>
        )}

        {!error && eventos === null && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        )}

        {!error && eventos !== null && filtrados.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-4xl mb-3">🎭</p>
            <p className="text-sm text-muted-foreground">No hay eventos para tu búsqueda.</p>
          </div>
        )}

        {!error && visibles.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground mb-4">
              {filtrados.length} evento{filtrados.length !== 1 ? "s" : ""} encontrado{filtrados.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
              {visibles.map((ev, i) => (
                <button
                  key={ev.id}
                  onClick={() => navigate(`/eventos/${ev.urlPublica}`)}
                  style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                  className="group text-left focus:outline-none animate-fade-in-up"
                >
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted border border-border shadow-lg shadow-transparent group-hover:shadow-primary/25 group-hover:-translate-y-1 transition-all duration-300">
                    {ev.imagenPortadaUrl ? (
                      <img
                        src={ev.imagenPortadaUrl}
                        alt={ev.nombre}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 via-card to-background flex items-center justify-center">
                        <Sparkles size={22} className="text-primary/40" />
                      </div>
                    )}
                    {ev.precioDesde !== null && (
                      <span className="absolute top-2.5 right-2.5 bg-background/85 backdrop-blur-sm text-accent text-[11px] font-bold px-2.5 py-1 rounded-full">
                        Desde {fmt(ev.precioDesde)}
                      </span>
                    )}
                  </div>
                  <div className="mt-2.5">
                    <h3 className="text-foreground font-semibold text-sm leading-snug line-clamp-2">{ev.nombre}</h3>
                    <p className="text-muted-foreground text-xs mt-1 flex items-center gap-1">
                      <Calendar size={11} />
                      {formatFecha(ev.fechaEvento)}
                    </p>
                    <p className="text-muted-foreground text-xs mt-0.5 flex items-center gap-1">
                      <MapPin size={11} />
                      <span className="truncate">{ev.lugar}</span>
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {totalPaginas > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => irAPagina(paginaActual - 1)}
                  disabled={paginaActual === 1}
                  className="w-9 h-9 rounded-xl border border-border bg-card flex items-center justify-center text-foreground hover:border-primary/40 hover:text-primary transition-all disabled:opacity-30 disabled:pointer-events-none"
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => irAPagina(n)}
                      className={`min-w-9 h-9 px-2 rounded-xl text-sm font-semibold transition-all ${
                        n === paginaActual
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => irAPagina(paginaActual + 1)}
                  disabled={paginaActual === totalPaginas}
                  className="w-9 h-9 rounded-xl border border-border bg-card flex items-center justify-center text-foreground hover:border-primary/40 hover:text-primary transition-all disabled:opacity-30 disabled:pointer-events-none"
                  aria-label="Página siguiente"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
