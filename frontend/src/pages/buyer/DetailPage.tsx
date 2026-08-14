import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ChevronLeft, MapPin, Calendar, Clock, Minus, Plus } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { fmt, formatFecha, formatHora } from "../../lib/format";
import type { EventoPublicoDetalleDTO, TandaResponseDTO } from "../../lib/types";

export function DetailPage() {
  const { urlPublica } = useParams<{ urlPublica: string }>();
  const navigate = useNavigate();
  const [evento, setEvento] = useState<EventoPublicoDetalleDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<TandaResponseDTO | null>(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!urlPublica) return;
    api
      .get<EventoPublicoDetalleDTO>(`/public/eventos/${urlPublica}`, { skipAuth: true })
      .then((data) => {
        setEvento(data);
        setSel(data.tandas[0] ?? null);
      })
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "No pudimos cargar el evento."));
  }, [urlPublica]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <p className="text-sm text-destructive text-center">{error}</p>
      </div>
    );
  }

  if (!evento || !sel) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-md mx-auto animate-pulse">
          <div className="h-56 bg-muted" />
          <div className="px-4 pt-5 space-y-3">
            <div className="h-6 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto">
        <div className="relative">
          {evento.imagenPortadaUrl ? (
            <img src={evento.imagenPortadaUrl} alt={evento.nombre} className="w-full h-56 object-cover bg-muted" />
          ) : (
            <div className="w-full h-56 bg-muted" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        <div className="px-4 pt-5 pb-4">
          <h1 className="text-2xl font-extrabold text-foreground leading-tight">{evento.nombre}</h1>
          <div className="mt-3 space-y-2">
            {[
              { Icon: MapPin, text: evento.lugar },
              { Icon: Calendar, text: formatFecha(evento.fechaEvento) },
              { Icon: Clock, text: formatHora(evento.horaEvento) },
            ].map(({ Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon size={14} className="text-primary flex-none" />
                <span>{text}</span>
              </div>
            ))}
          </div>
          {evento.descripcion && <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{evento.descripcion}</p>}

          <div className="mt-6">
            <h3 className="text-base font-bold text-foreground mb-3">Elegí tu tanda</h3>
            <div className="space-y-2">
              {evento.tandas.map((t) => (
                <button
                  key={t.id}
                  disabled={t.cupoDisponible <= 0}
                  onClick={() => setSel(t)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    sel.id === t.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-none transition-colors ${
                        sel.id === t.id ? "border-primary bg-primary" : "border-muted-foreground"
                      }`}
                    >
                      {sel.id === t.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.cupoDisponible > 0 ? `${t.cupoDisponible} disponibles` : "Agotada"}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-accent">{fmt(t.precio)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between bg-card rounded-xl px-4 py-3.5 border border-border">
            <span className="text-sm font-semibold text-foreground">Cantidad</span>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/70 transition-colors"
              >
                <Minus size={13} />
              </button>
              <span className="text-lg font-bold text-foreground w-4 text-center">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(sel.cupoDisponible || 1, q + 1))}
                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary/80 transition-colors"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>
          <div className="h-32" />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/90 backdrop-blur-md px-4 py-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground">
              {qty} × {sel.nombre}
            </span>
            <span className="text-base font-extrabold text-foreground">{fmt(sel.precio * qty)}</span>
          </div>
          <button
            disabled={sel.cupoDisponible <= 0}
            onClick={() => navigate("/checkout", { state: { evento, tanda: sel, qty } })}
            className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Comprar entradas
          </button>
        </div>
      </div>
    </div>
  );
}
