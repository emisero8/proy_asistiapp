import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import {
  ChevronLeft, Pencil, ExternalLink, Ban, Ticket, TrendingUp, Users, ShieldCheck,
  Search, Store, CreditCard, CheckCircle2, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "../../lib/api";
import { fmt, formatFecha, formatHora } from "../../lib/format";
import type { EntradaResponseDTO, EventoMetricasResponseDTO, EventoResponseDTO } from "../../lib/types";

const TANDA_COLORS = ["#7c3aed", "#4a5d8f", "#b794f6", "#9cadd3"];

function formatFechaHora(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })} ${d.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function OrganizadorEventoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [evento, setEvento] = useState<EventoResponseDTO | null>(null);
  const [metricas, setMetricas] = useState<EventoMetricasResponseDTO | null>(null);
  const [entradas, setEntradas] = useState<EntradaResponseDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);

  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"todas" | "Pagada" | "Usada" | "Online" | "Manual">("todas");

  function cargar() {
    if (!id) return;
    api
      .get<EventoResponseDTO>(`/eventos/${id}`)
      .then(async (ev) => {
        setEvento(ev);
        if (ev.estado !== "Borrador") {
          const [m, ent] = await Promise.all([
            api.get<EventoMetricasResponseDTO>(`/eventos/${id}/metricas`),
            api.get<EntradaResponseDTO[]>(`/tickets/evento/${id}`),
          ]);
          setMetricas(m);
          setEntradas([...ent].sort((a, b) => b.fechaCompra.localeCompare(a.fechaCompra)));
        } else {
          setEntradas([]);
        }
      })
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "No pudimos cargar el evento."));
  }

  useEffect(cargar, [id]);

  async function cancelarEvento() {
    if (!evento) return;
    if (!window.confirm(`¿Cancelar "${evento.nombre}"? Se avisa por email a los compradores y no se devuelven créditos.`)) return;
    setCancelando(true);
    try {
      await api.patch(`/eventos/${evento.id}/cancelar`);
      toast.success("Evento cancelado");
      cargar();
    } catch (e: unknown) {
      toast.error(e instanceof ApiError ? e.message : "No pudimos cancelar el evento.");
    } finally {
      setCancelando(false);
    }
  }

  const entradasFiltradas = useMemo(() => {
    const term = q.toLowerCase();
    return (entradas ?? []).filter((e) => {
      const matchQ = !term || e.nombreComprador.toLowerCase().includes(term) || e.emailComprador.toLowerCase().includes(term);
      const matchF =
        filtro === "todas" ||
        (filtro === "Pagada" && e.estado === "Pagada") ||
        (filtro === "Usada" && e.estado === "Usada") ||
        (filtro === "Online" && e.canalVenta === "Online") ||
        (filtro === "Manual" && e.canalVenta === "Manual");
      return matchQ && matchF;
    });
  }, [entradas, q, filtro]);

  if (error && !evento) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <p className="text-sm text-destructive text-center">{error}</p>
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="max-w-md lg:max-w-5xl mx-auto px-4 lg:px-8 pt-8 space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/2" />
        <div className="h-28 bg-card border border-border rounded-2xl" />
        <div className="h-64 bg-card border border-border rounded-2xl" />
      </div>
    );
  }

  const stats = metricas
    ? [
        { label: "Entradas vendidas", value: String(metricas.entradasVendidas), icon: Ticket },
        { label: "Ingresos totales", value: fmt(metricas.ingresosTotales), icon: TrendingUp, strong: true },
        { label: "Aforo disponible", value: `${metricas.cupoDisponible} / ${metricas.cupoTotal}`, icon: Users },
        { label: "Validados en puerta", value: String(metricas.entradasValidadas), icon: ShieldCheck },
      ]
    : [];

  const hayVentas = (metricas?.entradasVendidas ?? 0) > 0;

  return (
    <div className="max-w-md lg:max-w-5xl mx-auto px-4 lg:px-8 py-6 lg:py-8 pb-24 md:pb-12 space-y-6">
      <button
        onClick={() => navigate("/organizador/dashboard")}
        className="flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground transition-colors"
      >
        <ChevronLeft size={15} />
        Volver al dashboard
      </button>

      {/* Cabecera */}
      <section className="rounded-2xl border border-border bg-card p-4 lg:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        {evento.imagenPortadaUrl ? (
          <img src={evento.imagenPortadaUrl} alt="" className="w-full sm:w-20 h-32 sm:h-20 rounded-xl object-cover flex-none bg-muted" />
        ) : (
          <div className="w-full sm:w-20 h-32 sm:h-20 rounded-xl flex-none bg-gradient-to-br from-primary/30 to-muted" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg lg:text-xl font-extrabold text-foreground">{evento.nombre}</h2>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                evento.estado === "Publicado"
                  ? "bg-green-400/15 text-green-400"
                  : evento.estado === "Borrador"
                    ? "bg-amber-400/15 text-amber-400"
                    : "bg-red-400/15 text-red-400"
              }`}
            >
              {evento.estado}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatFecha(evento.fechaEvento)} · {formatHora(evento.horaEvento)} · {evento.lugar}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-none">
          {evento.estado === "Publicado" && (
            <button
              onClick={() => navigate(`/eventos/${evento.urlPublica}`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-xs font-semibold text-foreground hover:text-primary transition-colors"
            >
              <ExternalLink size={13} />
              Ver
            </button>
          )}
          {evento.estado !== "Cancelado" && (
            <>
              <button
                onClick={() => navigate(`/organizador/eventos/${evento.id}/editar`)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
              >
                <Pencil size={13} />
                Editar
              </button>
              <button
                onClick={cancelarEvento}
                disabled={cancelando}
                title="Cancelar evento"
                className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
              >
                <Ban size={14} />
              </button>
            </>
          )}
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-sm p-4 flex gap-2">
          <AlertCircle size={15} className="flex-none mt-0.5" />
          {error}
        </div>
      )}

      {evento.estado === "Borrador" && (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 text-center py-12 px-6">
          <p className="text-sm font-semibold text-foreground mb-1">Este evento todavía está en borrador</p>
          <p className="text-xs text-muted-foreground">Publicalo para empezar a vender entradas y ver las métricas acá.</p>
        </div>
      )}

      {metricas && (
        <>
          {/* Stats */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.label} className={`rounded-2xl border p-4 ${s.strong ? "border-primary/30 bg-primary/[0.08]" : "border-border bg-card"}`}>
                <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                  <s.icon size={13} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">{s.label}</span>
                </div>
                <p className={`text-xl font-extrabold ${s.strong ? "text-primary" : "text-foreground"}`}>{s.value}</p>
              </div>
            ))}
          </section>

          {/* Ventas por tanda */}
          <section className="rounded-2xl border border-border bg-card overflow-hidden">
            <p className="text-xs font-bold text-foreground px-4 pt-4">Ventas e ingresos por tanda</p>
            {hayVentas && metricas.tandas.length >= 2 && (
              <div className="px-4 pt-3">
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={metricas.tandas} barCategoryGap="35%">
                    <XAxis dataKey="nombre" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 11, color: "var(--foreground)" }}
                      cursor={{ fill: "rgba(124,58,237,0.1)" }}
                      formatter={(v: number, n: string) => [n === "ingresos" ? fmt(v) : `${v} entradas`, ""]}
                    />
                    <Bar dataKey="vendidas" radius={[6, 6, 0, 0]}>
                      {metricas.tandas.map((_, i) => (
                        <Cell key={i} fill={TANDA_COLORS[i % TANDA_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm mt-2">
                <thead>
                  <tr className="border-y border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left font-bold px-4 py-2">Tanda</th>
                    <th className="text-right font-bold px-4 py-2">Precio</th>
                    <th className="text-right font-bold px-4 py-2">Vendidas</th>
                    <th className="text-right font-bold px-4 py-2">Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {metricas.tandas.map((t) => (
                    <tr key={t.idTanda} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 text-foreground font-medium">{t.nombre}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">
                        {t.vendidas > 0 ? fmt(t.ingresos / t.vendidas) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-foreground">
                        {t.vendidas} <span className="text-muted-foreground">/ {t.cupoMaximo}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-foreground">{fmt(t.ingresos)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-muted/40">
                    <td className="px-4 py-2.5 font-bold text-foreground" colSpan={2}>Total</td>
                    <td className="px-4 py-2.5 text-right font-bold text-foreground">{metricas.entradasVendidas}</td>
                    <td className="px-4 py-2.5 text-right font-extrabold text-primary">{fmt(metricas.ingresosTotales)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* Compradores */}
          <section className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 border-b border-border">
              <div className="flex-1">
                <p className="text-xs font-bold text-foreground">Compradores</p>
                <p className="text-[11px] text-muted-foreground">{entradasFiltradas.length} de {entradas?.length ?? 0} entradas</p>
              </div>
              <div className="relative sm:w-56">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por nombre o email"
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-muted text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            {(entradas?.length ?? 0) > 0 && (
              <div className="flex gap-1.5 px-4 py-2.5 border-b border-border overflow-x-auto hide-scrollbar">
                {(["todas", "Pagada", "Usada", "Online", "Manual"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFiltro(f)}
                    className={`flex-none px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                      filtro === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f === "todas" ? "Todas" : f}
                  </button>
                ))}
              </div>
            )}

            {entradas === null ? (
              <div className="p-4 space-y-2">
                {[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
              </div>
            ) : entradas.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">Todavía no se vendieron entradas para este evento.</p>
              </div>
            ) : entradasFiltradas.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">Ninguna entrada coincide con la búsqueda.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {entradasFiltradas.map((e) => (
                  <div key={e.id} className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-muted/30 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-tight truncate">{e.nombreComprador}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{e.emailComprador}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
                        <span>{e.nombreTanda}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          {e.canalVenta === "Online" ? <CreditCard size={10} /> : <Store size={10} />}
                          {e.canalVenta}
                        </span>
                        <span>·</span>
                        <span>{formatFechaHora(e.fechaCompra)}</span>
                      </div>
                    </div>
                    <div className="flex-none text-right">
                      <p className="text-sm font-bold text-foreground">{fmt(e.precioTanda)}</p>
                      {e.estado === "Usada" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary">
                          <CheckCircle2 size={11} />
                          Usada
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-green-400">Pagada</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
