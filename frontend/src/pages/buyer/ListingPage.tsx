import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Search, MapPin, Calendar, Sparkles, ArrowRight } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { fmt, formatFecha } from "../../lib/format";
import type { EventoPublicoListItemDTO } from "../../lib/types";

type FiltroFecha = "todos" | "hoy" | "este-finde" | "proximo-finde";

const FILTROS: { id: FiltroFecha; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "hoy", label: "Hoy" },
  { id: "este-finde", label: "Este finde" },
  { id: "proximo-finde", label: "Próximo finde" },
];

const TICKER_ITEMS = [
  "Sin comisión para el organizador",
  "Entradas 100% digitales",
  "Validación QR en la puerta",
  "Sin filas, sin papel",
];

/** [inicio, fin] del próximo viernes-a-domingo, en offset de semanas (0 = el que viene o el actual). */
function rangoFinDeSemana(offsetSemanas: number): [Date, Date] {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dia = hoy.getDay(); // 0=domingo … 6=sábado
  const diasHastaViernes = dia <= 5 ? 5 - dia : 5 - dia + 7;
  const viernes = new Date(hoy);
  viernes.setDate(hoy.getDate() + diasHastaViernes + offsetSemanas * 7);
  const domingo = new Date(viernes);
  domingo.setDate(viernes.getDate() + 2);
  return [viernes, domingo];
}

function fechaEnRango(fechaEvento: string, [inicio, fin]: [Date, Date]): boolean {
  const fecha = new Date(`${fechaEvento}T00:00:00`);
  return fecha >= inicio && fecha <= fin;
}

export function ListingPage() {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState<EventoPublicoListItemDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filtroFecha, setFiltroFecha] = useState<FiltroFecha>("todos");

  useEffect(() => {
    api
      .get<EventoPublicoListItemDTO[]>("/public/eventos", { skipAuth: true })
      .then(setEventos)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "No pudimos cargar los eventos."));
  }, []);

  const ordenados = useMemo(
    () => [...(eventos ?? [])].sort((a, b) => a.fechaEvento.localeCompare(b.fechaEvento)),
    [eventos],
  );

  const destacados = ordenados.slice(0, 6);

  const carruselRef = useRef<HTMLDivElement>(null);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (pausado || destacados.length < 2) return;
    const el = carruselRef.current;
    if (!el) return;

    const id = setInterval(() => {
      const tarjeta = el.firstElementChild as HTMLElement | null;
      const avance = (tarjeta?.getBoundingClientRect().width ?? el.clientWidth * 0.6) + 12; // ancho de tarjeta + gap
      const alFinal = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      el.scrollTo({ left: alFinal ? 0 : el.scrollLeft + avance, behavior: "smooth" });
    }, 3500);

    return () => clearInterval(id);
  }, [pausado, destacados.length]);

  const visibles = ordenados.filter((e) => {
    const q = search.toLowerCase();
    const matchesSearch = e.nombre.toLowerCase().includes(q) || e.lugar.toLowerCase().includes(q);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const matchesFecha =
      filtroFecha === "todos"
        ? true
        : filtroFecha === "hoy"
          ? e.fechaEvento === hoy.toISOString().slice(0, 10)
          : filtroFecha === "este-finde"
            ? fechaEnRango(e.fechaEvento, rangoFinDeSemana(0))
            : fechaEnRango(e.fechaEvento, rangoFinDeSemana(1));
    return matchesSearch && matchesFecha;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 lg:px-8 pt-6 pb-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-5 lg:mb-6">
            <div>
              <p className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase">Buenos Aires · Arg</p>
              <h1 className="text-xl lg:text-2xl font-extrabold text-foreground tracking-tight">
                Asistí<span className="text-primary">APP</span>
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Destacados — carrusel horizontal con las portadas reales de los próximos eventos */}
      {destacados.length > 0 && (
        <div className="mb-6">
          <div
            ref={carruselRef}
            onMouseEnter={() => setPausado(true)}
            onMouseLeave={() => setPausado(false)}
            onTouchStart={() => setPausado(true)}
            className="flex gap-3 lg:gap-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory px-4 lg:px-8 pb-1"
          >
            {destacados.map((ev) => (
              <button
                key={ev.id}
                onClick={() => navigate(`/eventos/${ev.urlPublica}`)}
                className="group relative flex-none w-[62%] sm:w-[38%] lg:w-[24%] aspect-[3/4] snap-start rounded-2xl overflow-hidden bg-muted focus:outline-none"
              >
                {ev.imagenPortadaUrl ? (
                  <img
                    src={ev.imagenPortadaUrl}
                    alt={ev.nombre}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/30 via-card to-background flex items-center justify-center">
                    <Sparkles size={28} className="text-primary/50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
                  <p className="text-white font-extrabold text-sm leading-tight line-clamp-2">{ev.nombre}</p>
                  <p className="text-white/70 text-[11px] mt-1">{formatFecha(ev.fechaEvento)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ticker */}
      <div className="overflow-hidden border-y border-border bg-card/60 py-2.5 mb-6">
        <div className="flex w-max marquee-track">
          {[0, 1].map((copia) => (
            <div key={copia} className="flex items-center flex-none">
              {TICKER_ITEMS.map((item) => (
                <span key={item} className="flex items-center gap-2 px-6 text-[11px] font-bold tracking-widest uppercase text-muted-foreground whitespace-nowrap">
                  <span className="text-primary">✦</span>
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-8 pb-6 lg:pb-10">
        <div className="mb-4 space-y-3">
          <div className="relative lg:max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Eventos, lugares..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-muted text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltroFecha(f.id)}
                className={`flex-none px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  filtroFecha === f.id ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-sm p-4">
            {error}
          </div>
        )}

        {!error && eventos === null && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        )}

        {!error && eventos !== null && visibles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-4xl mb-3">🎭</p>
            <p className="text-sm text-muted-foreground">No hay eventos para tu búsqueda.</p>
          </div>
        )}

        {!error && visibles.length > 0 && (
          <>
            <p className="text-[10px] text-muted-foreground tracking-[0.15em] uppercase mb-3">Eventos públicos</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-5">
              {visibles.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => navigate(`/eventos/${ev.urlPublica}`)}
                  className="group text-left focus:outline-none"
                >
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted">
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
          </>
        )}
      </div>

      {/* CTA organizadores — franja angosta al pie, no compite con la vidriera de eventos */}
      <div className="border-t border-border bg-gradient-to-r from-primary/10 via-card to-background">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 lg:py-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <p className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase mb-1.5">Para organizadores</p>
            <h2 className="text-lg lg:text-xl font-extrabold text-foreground leading-tight">
              ¿Organizás un evento? Vendé sin comisión
            </h2>
            <p className="text-xs lg:text-sm text-muted-foreground mt-1.5 max-w-md">
              Publicá en minutos, cobrá online y validá cada entrada con QR en la puerta — todo desde un mismo panel.
            </p>
          </div>
          <button
            onClick={() => navigate("/organizador/registro")}
            className="flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-primary text-white font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all"
          >
            Quiero publicar mi evento
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
