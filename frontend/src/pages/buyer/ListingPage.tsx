import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Search, MapPin, Calendar } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { fmt, formatFecha } from "../../lib/format";
import type { EventoPublicoListItemDTO } from "../../lib/types";

export function ListingPage() {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState<EventoPublicoListItemDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .get<EventoPublicoListItemDTO[]>("/public/eventos", { skipAuth: true })
      .then(setEventos)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "No pudimos cargar los eventos."));
  }, []);

  const visibles = (eventos ?? []).filter((e) => {
    const q = search.toLowerCase();
    return e.nombre.toLowerCase().includes(q) || e.lugar.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 px-4 pt-6 pb-3 border-b border-border bg-background">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase">Buenos Aires · Arg</p>
              <h1 className="text-xl font-extrabold text-foreground tracking-tight">
                Asistí<span className="text-primary">APP</span>
              </h1>
            </div>
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Eventos, lugares..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-muted text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-3">
        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-sm p-4">
            {error}
          </div>
        )}

        {!error && eventos === null && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-card border border-border animate-pulse" />
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
            <p className="text-[10px] text-muted-foreground tracking-[0.15em] uppercase">Próximos eventos</p>
            {visibles.map((ev) => (
              <button
                key={ev.id}
                onClick={() => navigate(`/eventos/${ev.urlPublica}`)}
                className="w-full text-left flex gap-3 bg-card rounded-2xl overflow-hidden border border-border hover:border-primary/40 transition-all focus:outline-none"
              >
                {ev.imagenPortadaUrl ? (
                  <img src={ev.imagenPortadaUrl} alt={ev.nombre} className="w-[88px] h-24 object-cover flex-none bg-muted" />
                ) : (
                  <div className="w-[88px] h-24 flex-none bg-muted" />
                )}
                <div className="flex-1 min-w-0 py-3 pr-3 flex flex-col justify-between">
                  <div>
                    <h3 className="text-foreground font-semibold text-sm leading-snug line-clamp-2">{ev.nombre}</h3>
                    <p className="text-muted-foreground text-xs mt-0.5 flex items-center gap-1">
                      <MapPin size={9} />
                      {ev.lugar}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                      <Calendar size={9} />
                      {formatFecha(ev.fechaEvento)}
                    </span>
                    {ev.precioDesde !== null && (
                      <span className="text-accent font-bold text-xs">Desde {fmt(ev.precioDesde)}</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
