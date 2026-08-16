import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Calendar, CalendarCheck, ChevronRight, CircleDollarSign, Ticket, Users } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { fmt } from "../../lib/format";
import type { AdminMetricasResponseDTO } from "../../lib/types";

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<AdminMetricasResponseDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AdminMetricasResponseDTO>("/admin/metricas")
      .then(setMetrics)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "No pudimos cargar las métricas."));
  }, []);

  const cards = metrics
    ? [
        { label: "Organizadores activos", value: metrics.organizadoresActivos.toLocaleString("es-AR"), icon: Users, color: "text-violet-400", bg: "bg-violet-400/10" },
        { label: "Eventos activos", value: metrics.eventosActivos.toLocaleString("es-AR"), sub: `${metrics.eventosTotales.toLocaleString("es-AR")} en total`, icon: Calendar, color: "text-emerald-400", bg: "bg-emerald-400/10" },
        { label: "Ingresos totales", value: fmt(metrics.ingresosTotales), icon: CircleDollarSign, color: "text-amber-400", bg: "bg-amber-400/10" },
        { label: "Entradas vendidas", value: metrics.entradasVendidas.toLocaleString("es-AR"), icon: Ticket, color: "text-sky-400", bg: "bg-sky-400/10" },
      ]
    : [];

  const shortcuts = [
    { label: "Gestión de Usuarios", desc: "Ver y administrar todos los usuarios", to: "/admin/usuarios", icon: Users, color: "text-violet-400", bg: "bg-violet-400/10" },
    { label: "Gestión de Eventos", desc: "Supervisar eventos de toda la plataforma", to: "/admin/eventos", icon: CalendarCheck, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { label: "Configuración y Paquetes", desc: "Paquetes de créditos y ajustes globales", to: "/admin/config", icon: CircleDollarSign, color: "text-amber-400", bg: "bg-amber-400/10" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 lg:px-8 pt-8 pb-5 border-b border-border">
        <p className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase font-semibold">Sistema · Backoffice</p>
        <h1 className="text-xl font-extrabold text-foreground mt-0.5">Dashboard Global</h1>
      </div>

      <div className="px-4 lg:px-8 py-5 space-y-5">
        {error && <div className="rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-sm p-4">{error}</div>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics === null && !error
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-card border border-border rounded-2xl p-4 h-28 animate-pulse" />)
            : cards.map((m) => (
                <div key={m.label} className="bg-card border border-border rounded-2xl p-4 hover:border-primary/30 transition-colors">
                  <div className={`w-9 h-9 rounded-xl ${m.bg} flex items-center justify-center mb-3`}>
                    <m.icon size={17} className={m.color} />
                  </div>
                  <p className="text-2xl font-extrabold text-foreground leading-none">{m.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
                  {m.sub && <p className="text-[10px] text-muted-foreground mt-1.5">{m.sub}</p>}
                </div>
              ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {shortcuts.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.to)}
              className="bg-card border border-border rounded-2xl p-4 text-left hover:border-primary/40 transition-all group"
            >
              <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <item.icon size={17} className={item.color} />
              </div>
              <p className="text-sm font-bold text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">{item.desc}</p>
              <div className="flex items-center gap-1 mt-3 text-primary text-xs font-semibold">
                Ir <ChevronRight size={12} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
