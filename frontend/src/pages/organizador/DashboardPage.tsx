import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Sparkles, Ticket, TrendingUp, ShieldCheck, Pencil, ExternalLink, Ban, Plus, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { fmt, formatFecha } from "../../lib/format";
import type { EventoMetricasResponseDTO, EventoResponseDTO, EstadoEvento } from "../../lib/types";

const ESTADO_ORDEN: Record<EstadoEvento, number> = { Publicado: 0, Borrador: 1, Cancelado: 2 };
const ESTADO_BADGE: Record<EstadoEvento, string> = {
  Publicado: "bg-green-400/15 text-green-400",
  Borrador: "bg-amber-400/15 text-amber-400",
  Cancelado: "bg-red-400/15 text-red-400",
};

export function OrganizadorDashboardPage() {
  const navigate = useNavigate();
  const { session } = useAuth();

  const [eventos, setEventos] = useState<EventoResponseDTO[] | null>(null);
  const [totales, setTotales] = useState<{ vendidas: number; ingresos: number; validadas: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelandoId, setCancelandoId] = useState<number | null>(null);

  function cargar() {
    api
      .get<EventoResponseDTO[]>("/eventos")
      .then(async (lista) => {
        setEventos(lista);
        const publicados = lista.filter((e) => e.estado === "Publicado");
        if (publicados.length === 0) {
          setTotales({ vendidas: 0, ingresos: 0, validadas: 0 });
          return;
        }
        const metricas = await Promise.all(
          publicados.map((e) =>
            api.get<EventoMetricasResponseDTO>(`/eventos/${e.id}/metricas`).catch(() => null),
          ),
        );
        setTotales(
          metricas.reduce(
            (acc, m) => ({
              vendidas: acc.vendidas + (m?.entradasVendidas ?? 0),
              ingresos: acc.ingresos + (m?.ingresosTotales ?? 0),
              validadas: acc.validadas + (m?.entradasValidadas ?? 0),
            }),
            { vendidas: 0, ingresos: 0, validadas: 0 },
          ),
        );
      })
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "No pudimos cargar tu panel."));
  }

  useEffect(cargar, []);

  async function cancelarEvento(ev: EventoResponseDTO, e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm(`¿Cancelar "${ev.nombre}"? Se avisa por email a los compradores y no se devuelven créditos.`)) return;
    setCancelandoId(ev.id);
    try {
      await api.patch(`/eventos/${ev.id}/cancelar`);
      toast.success(`"${ev.nombre}" cancelado`);
      cargar();
    } catch (err: unknown) {
      toast.error(err instanceof ApiError ? err.message : "No pudimos cancelar el evento.");
    } finally {
      setCancelandoId(null);
    }
  }

  const eventosOrdenados = [...(eventos ?? [])].sort((a, b) => {
    const est = ESTADO_ORDEN[a.estado] - ESTADO_ORDEN[b.estado];
    return est !== 0 ? est : a.fechaEvento.localeCompare(b.fechaEvento);
  });

  const publicadosCount = (eventos ?? []).filter((e) => e.estado === "Publicado").length;

  const resumen =
    totales && publicadosCount > 0
      ? [
          { label: "Entradas vendidas", value: String(totales.vendidas), icon: Ticket },
          { label: "Ingresos totales", value: fmt(totales.ingresos), icon: TrendingUp, strong: true },
          { label: "Validadas en puerta", value: String(totales.validadas), icon: ShieldCheck },
        ]
      : [];

  function vendidasEvento(ev: EventoResponseDTO): number {
    return ev.tandas.reduce((acc, t) => acc + (t.cupoMaximo - t.cupoDisponible), 0);
  }

  return (
    <div className="max-w-md lg:max-w-5xl mx-auto px-4 lg:px-8 py-6 lg:py-8 space-y-6">
      <div>
        <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Panel del organizador</p>
        <h2 className="text-xl lg:text-2xl font-extrabold text-foreground mt-0.5">
          Hola, {session?.nombre.split(" ")[0]} 👋
        </h2>
      </div>

      {error && <div className="rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-sm p-4">{error}</div>}

      {!error && eventos === null && (
        <div className="space-y-3">
          <div className="h-24 rounded-2xl bg-card border border-border animate-pulse" />
          <div className="h-40 rounded-2xl bg-card border border-border animate-pulse" />
        </div>
      )}

      {!error && eventos !== null && eventos.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 text-center py-14 px-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
            <Sparkles size={20} className="text-primary" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">Todavía no creaste ningún evento</p>
          <p className="text-xs text-muted-foreground mb-5">Creá tu primer evento y publicalo en minutos.</p>
          <button
            onClick={() => navigate("/organizador/crear")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors"
          >
            <Plus size={15} />
            Crear evento
          </button>
        </div>
      )}

      {/* Resumen global */}
      {resumen.length > 0 && (
        <section className="grid grid-cols-3 gap-3">
          {resumen.map((s) => (
            <div key={s.label} className={`rounded-2xl border p-4 ${s.strong ? "border-primary/30 bg-primary/[0.08]" : "border-border bg-card"}`}>
              <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                <s.icon size={13} />
                <span className="text-[10px] font-semibold uppercase tracking-wider hidden sm:inline">{s.label}</span>
              </div>
              <p className={`text-lg lg:text-xl font-extrabold ${s.strong ? "text-primary" : "text-foreground"}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 sm:hidden">{s.label}</p>
            </div>
          ))}
        </section>
      )}

      {/* Mis eventos */}
      {!error && eventos !== null && eventos.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground">Mis eventos ({eventos.length})</h3>
            <button
              onClick={() => navigate("/organizador/crear")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
            >
              <Plus size={13} />
              Crear evento
            </button>
          </div>
          <div className="space-y-2">
            {eventosOrdenados.map((ev) => {
              const vendidas = vendidasEvento(ev);
              return (
                <button
                  key={ev.id}
                  onClick={() => navigate(`/organizador/eventos/${ev.id}`)}
                  className={`w-full text-left rounded-xl border border-border bg-card p-3 flex items-center gap-3 hover:border-primary/40 transition-all ${
                    cancelandoId === ev.id ? "opacity-50" : ""
                  }`}
                >
                  {ev.imagenPortadaUrl ? (
                    <img src={ev.imagenPortadaUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-none bg-muted" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg flex-none bg-gradient-to-br from-primary/25 to-muted flex items-center justify-center">
                      <Sparkles size={16} className="text-primary/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{ev.nombre}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-none ${ESTADO_BADGE[ev.estado]}`}>
                        {ev.estado}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {formatFecha(ev.fechaEvento)} · {ev.tandas.length} tanda{ev.tandas.length !== 1 ? "s" : ""}
                      {ev.estado === "Publicado" && ` · ${vendidas} vendidas`}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 flex-none">
                    {ev.estado === "Publicado" && (
                      <span
                        role="button"
                        tabIndex={-1}
                        onClick={(e) => { e.stopPropagation(); navigate(`/eventos/${ev.urlPublica}`); }}
                        title="Ver página pública"
                        className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ExternalLink size={14} />
                      </span>
                    )}
                    {ev.estado !== "Cancelado" && (
                      <>
                        <span
                          role="button"
                          tabIndex={-1}
                          onClick={(e) => { e.stopPropagation(); navigate(`/organizador/eventos/${ev.id}/editar`); }}
                          title="Editar"
                          className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Pencil size={14} />
                        </span>
                        <span
                          role="button"
                          tabIndex={-1}
                          onClick={(e) => cancelarEvento(ev, e)}
                          title="Cancelar evento"
                          className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Ban size={14} />
                        </span>
                      </>
                    )}
                    <ChevronRight size={15} className="text-muted-foreground ml-0.5" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
