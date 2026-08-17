import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Calendar, LogOut, Sparkles, Users, Ticket, TrendingUp, ShieldCheck, ArrowUpRight } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { fmt, formatFecha, formatHora, formatRelativo } from "../../lib/format";
import type { EntradaResponseDTO, EventoMetricasResponseDTO, EventoResponseDTO } from "../../lib/types";

const TANDA_COLORS = ["#7c3aed", "#9d5cf6", "#c084fc", "#e0b3ff"];

export function OrganizadorDashboardPage() {
  const navigate = useNavigate();
  const { session, logout } = useAuth();

  const [eventos, setEventos] = useState<EventoResponseDTO[] | null>(null);
  const [eventoActivo, setEventoActivo] = useState<EventoResponseDTO | null>(null);
  const [metricas, setMetricas] = useState<EventoMetricasResponseDTO | null>(null);
  const [ventasRecientes, setVentasRecientes] = useState<EntradaResponseDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<EventoResponseDTO[]>("/eventos")
      .then(async (lista) => {
        setEventos(lista);
        const publicados = lista.filter((e) => e.estado === "Publicado");
        const activo = [...publicados].sort((a, b) => (b.fechaPublicacion ?? "").localeCompare(a.fechaPublicacion ?? ""))[0] ?? null;
        setEventoActivo(activo);
        if (activo) {
          const [m, ventas] = await Promise.all([
            api.get<EventoMetricasResponseDTO>(`/eventos/${activo.id}/metricas`),
            api.get<EntradaResponseDTO[]>(`/tickets/evento/${activo.id}`),
          ]);
          setMetricas(m);
          setVentasRecientes(
            [...ventas].sort((a, b) => b.fechaCompra.localeCompare(a.fechaCompra)).slice(0, 4),
          );
        }
      })
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "No pudimos cargar tu panel."));
  }, []);

  function handleLogout() {
    logout();
    navigate("/organizador/login");
  }

  const metricCards = metricas
    ? [
        { label: "Entradas vendidas", value: String(metricas.entradasVendidas), icon: Ticket, color: "text-violet-400", bg: "bg-violet-400/10" },
        { label: "Ingresos totales", value: fmt(metricas.ingresosTotales), icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-400/10" },
        { label: "Aforo disponible", value: String(metricas.cupoDisponible), sub: `de ${metricas.cupoTotal} cap.`, icon: Users, color: "text-sky-400", bg: "bg-sky-400/10" },
        {
          label: "Validados en puerta",
          value: String(metricas.entradasValidadas),
          sub: metricas.entradasVendidas > 0 ? `${Math.round((metricas.entradasValidadas / metricas.entradasVendidas) * 100)}% del total` : undefined,
          icon: ShieldCheck,
          color: "text-amber-400",
          bg: "bg-amber-400/10",
        },
      ]
    : [];

  return (
    <div className="max-w-md lg:max-w-6xl mx-auto">
        <div className="relative overflow-hidden px-4 lg:px-8 pt-6 pb-4 border-b border-border">
          <div className="absolute -top-16 right-0 w-64 h-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Panel del organizador</p>
              <h2 className="text-lg lg:text-xl font-extrabold text-foreground">Hola, {session?.nombre.split(" ")[0]} 👋</h2>
            </div>
            <button
              onClick={handleLogout}
              className="lg:hidden w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut size={16} />
            </button>
            <button
              onClick={handleLogout}
              className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-muted-foreground text-sm font-semibold hover:text-foreground transition-colors"
            >
              <LogOut size={15} />
              Cerrar sesión
            </button>
          </div>
        </div>

        <div className="px-4 lg:px-8 py-4 lg:py-6 space-y-5">
          {error && <div className="rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-sm p-4">{error}</div>}

          {!error && eventos === null && <div className="h-40 rounded-2xl bg-card border border-border animate-pulse" />}

          {!error && eventos !== null && eventos.length === 0 && (
            <div className="text-center py-12 space-y-4">
              <p className="text-sm text-muted-foreground">Todavía no creaste ningún evento.</p>
              <button
                onClick={() => navigate("/organizador/crear")}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors"
              >
                <Sparkles size={16} />
                Crear tu primer evento
              </button>
            </div>
          )}

          {!error && eventoActivo && (
            <div className="bg-primary/10 border border-primary/20 rounded-2xl pl-3 pr-4 py-3 flex items-center gap-3">
              {eventoActivo.imagenPortadaUrl ? (
                <img
                  src={eventoActivo.imagenPortadaUrl}
                  alt={eventoActivo.nombre}
                  className="w-11 aspect-[3/4] rounded-lg object-cover flex-none bg-muted"
                />
              ) : (
                <div className="w-11 aspect-[3/4] rounded-lg flex-none bg-gradient-to-br from-primary/25 via-card to-background" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-primary uppercase tracking-widest font-bold">Evento activo</p>
                <p className="text-sm font-semibold text-foreground truncate">{eventoActivo.nombre}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Calendar size={10} />
                  {formatFecha(eventoActivo.fechaEvento)} · {formatHora(eventoActivo.horaEvento)}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-none">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-green-400 font-semibold">En venta</span>
              </div>
            </div>
          )}

          {!error && eventos !== null && eventos.length > 0 && !eventoActivo && (
            <div className="rounded-xl border border-border bg-card text-muted-foreground text-sm p-4">
              No tenés ningún evento publicado todavía. Publicá uno para ver sus métricas acá.
            </div>
          )}

          {metricas && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {metricCards.map((m) => (
                  <div key={m.label} className="bg-card border border-border rounded-2xl p-3.5">
                    <div className={`w-8 h-8 rounded-xl ${m.bg} flex items-center justify-center mb-2.5`}>
                      <m.icon size={16} className={m.color} />
                    </div>
                    <p className="text-lg font-extrabold text-foreground leading-none">{m.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{m.label}</p>
                    {m.sub && (
                      <p className="text-[10px] text-primary mt-1 font-semibold flex items-center gap-0.5">
                        <ArrowUpRight size={10} />
                        {m.sub}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="lg:grid lg:grid-cols-2 lg:gap-4 space-y-5 lg:space-y-0">
                {metricas.tandas.length > 0 && (
                  <div className="bg-card border border-border rounded-2xl p-4">
                    <p className="text-xs font-bold text-foreground mb-1">Ventas por tanda</p>
                    <p className="text-[10px] text-muted-foreground mb-4">{eventoActivo?.nombre}</p>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={metricas.tandas} barCategoryGap="30%">
                        <XAxis dataKey="nombreTanda" tick={{ fill: "#6e6b8f", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip
                          contentStyle={{ background: "#131222", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 11, color: "#f0eeff" }}
                          cursor={{ fill: "rgba(124,58,237,0.08)" }}
                          formatter={(v: number) => [`${v} entradas`, ""]}
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

                {ventasRecientes.length > 0 && (
                  <div className="bg-card border border-border rounded-2xl overflow-hidden self-start">
                    <div className="px-4 pt-4 pb-2">
                      <p className="text-xs font-bold text-foreground">Últimas ventas</p>
                    </div>
                    {ventasRecientes.map((v, i) => (
                      <div key={v.id} className={`px-4 py-3 flex items-center justify-between ${i < ventasRecientes.length - 1 ? "border-b border-border" : ""}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                            {v.nombreComprador.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{v.nombreComprador}</p>
                            <p className="text-[10px] text-muted-foreground">{v.nombreTanda}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{formatRelativo(v.fechaCompra)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {eventos !== null && eventos.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pb-2">
              <button
                onClick={() => navigate("/organizador/crear")}
                className="bg-primary rounded-2xl p-4 flex flex-col gap-2 hover:bg-primary/90 transition-colors"
              >
                <Sparkles size={18} className="text-white" />
                <p className="text-sm font-bold text-white">Crear evento</p>
              </button>
              <button
                onClick={() => navigate("/organizador/staff")}
                className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2 hover:border-primary/40 transition-colors"
              >
                <Users size={18} className="text-primary" />
                <p className="text-sm font-bold text-foreground">Gestionar staff</p>
              </button>
            </div>
          )}
        </div>
    </div>
  );
}
