import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Sparkles, Ticket, TrendingUp, ShieldCheck, Pencil, ExternalLink, Ban, Plus, ChevronRight, Search, Wallet, CircleDollarSign, CalendarDays, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { fmt, formatFecha } from "../../lib/format";
import type { EventoResponseDTO, EstadoEvento, ResumenOrganizadorResponseDTO } from "../../lib/types";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useDialog } from "../../lib/dialogs";

const ESTADO_BADGE: Record<EstadoEvento, string> = {
  Publicado: "bg-green-400/15 text-green-400",
  Borrador: "bg-amber-400/15 text-amber-400",
  Cancelado: "bg-red-400/15 text-red-400",
};

/** Días que faltan para una fecha (YYYY-MM-DD), en texto corto. */
function diasHasta(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
  const dias = Math.round((new Date(y, m - 1, d).getTime() - inicioHoy) / 86400000);
  if (dias <= 0) return "Hoy";
  if (dias === 1) return "Mañana";
  return `En ${dias} días`;
}

interface MetricaCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  strong?: boolean;
  sub?: string;
}

function MetricaCard({ label, value, icon: Icon, strong, sub }: MetricaCardProps) {
  return (
    <div className={`rounded-2xl border p-4 min-w-0 ${strong ? "border-primary/30 bg-primary/[0.08]" : "border-border bg-card"}`}>
      <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
        <Icon size={13} />
        <span className="text-[10px] font-semibold uppercase tracking-wider hidden sm:inline">{label}</span>
      </div>
      <p className={`text-lg lg:text-xl font-extrabold ${strong ? "text-primary" : "text-foreground"}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
      <p className="text-[10px] text-muted-foreground mt-0.5 sm:hidden">{label}</p>
    </div>
  );
}

export function OrganizadorDashboardPage() {
  useDocumentTitle("Panel del organizador");
  const { confirm } = useDialog();
  const navigate = useNavigate();
  const { session } = useAuth();

  const [eventos, setEventos] = useState<EventoResponseDTO[] | null>(null);
  const [resumenGeneral, setResumenGeneral] = useState<ResumenOrganizadorResponseDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelandoId, setCancelandoId] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | EstadoEvento>("todos");

  function cargar() {
    // Dos llamadas en paralelo: la lista (para "Mis eventos") y el resumen calculado en el backend
    Promise.all([
      api.get<EventoResponseDTO[]>("/eventos"),
      api.get<ResumenOrganizadorResponseDTO>("/eventos/resumen").catch(() => null),
    ])
      .then(([lista, resumenApi]) => {
        setEventos(lista);
        setResumenGeneral(resumenApi);
      })
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "No pudimos cargar tu panel."));
  }

  useEffect(cargar, []);

  async function cancelarEvento(ev: EventoResponseDTO) {
    const ok = await confirm({
      titulo: "Cancelar evento",
      mensaje: `¿Cancelar "${ev.nombre}"? Se avisa por email a los compradores y no se devuelven créditos.`,
      confirmarTexto: "Cancelar evento",
      cancelarTexto: "No, volver",
      variante: "destructiva",
    });
    if (!ok) return;
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

  // El backend ya devuelve "Mis eventos" del más nuevo al más antiguo (por fecha de creación):
  // no se reordena acá, solo se filtra manteniendo ese orden.
  const termino = busqueda.trim().toLowerCase();
  const eventosFiltrados = (eventos ?? []).filter((ev) => {
    if (estadoFiltro !== "todos" && ev.estado !== estadoFiltro) return false;
    if (!termino) return true;
    return ev.nombre.toLowerCase().includes(termino) || ev.lugar.toLowerCase().includes(termino);
  });

  // Métricas de ventas: solo cuando hay eventos publicados
  const metricasVentas =
    resumenGeneral && resumenGeneral.eventosPublicados > 0
      ? [
          { label: "Entradas vendidas", value: String(resumenGeneral.entradasVendidas), icon: Ticket },
          { label: "Ingresos totales", value: fmt(resumenGeneral.ingresosTotales), icon: TrendingUp, strong: true },
          { label: "Validadas en puerta", value: String(resumenGeneral.entradasValidadas), icon: ShieldCheck },
        ]
      : [];

  // Créditos y próximo evento: siempre que el resumen haya llegado
  const proximo = resumenGeneral?.proximoEvento ?? null;
  const metricasCreditos = resumenGeneral
    ? [
        { label: "Créditos disponibles", value: String(resumenGeneral.saldoCreditos), icon: Wallet },
        { label: "Créditos usados", value: String(resumenGeneral.creditosConsumidos), icon: CircleDollarSign },
        {
          label: "Próximo evento",
          value: proximo ? diasHasta(proximo.fechaEvento) : "—",
          sub: proximo?.nombre ?? "Sin eventos próximos",
          icon: CalendarDays,
        },
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

      {/* Resumen global: ventas y créditos */}
      {metricasVentas.length > 0 && (
        <section className="grid grid-cols-3 gap-3">
          {metricasVentas.map((s) => (
            <MetricaCard key={s.label} {...s} />
          ))}
        </section>
      )}
      {metricasCreditos.length > 0 && (
        <section className="grid grid-cols-3 gap-3">
          {metricasCreditos.map((s) => (
            <MetricaCard key={s.label} {...s} />
          ))}
        </section>
      )}

      {/* Mis eventos */}
      {!error && eventos !== null && eventos.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground">
              Mis eventos ({eventosFiltrados.length}
              {eventosFiltrados.length !== eventos.length && ` de ${eventos.length}`})
            </h3>
            <button
              onClick={() => navigate("/organizador/crear")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
            >
              <Plus size={13} />
              Crear evento
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o lugar…"
                aria-label="Buscar eventos por nombre o lugar"
                className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value as typeof estadoFiltro)}
              aria-label="Filtrar por estado"
              className="px-3 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            >
              <option value="todos">Todos los estados</option>
              <option value="Publicado">Publicados</option>
              <option value="Borrador">Borradores</option>
              <option value="Cancelado">Cancelados</option>
            </select>
          </div>
          {eventosFiltrados.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">Ningún evento coincide con la búsqueda.</p>
          )}
          <div className="space-y-2">
            {eventosFiltrados.map((ev) => {
              const vendidas = vendidasEvento(ev);
              return (
                // La tarjeta es un contenedor (no un <button>): un control dentro de otro <button> es HTML inválido y las acciones
                // no se alcanzaban con teclado. El botón principal cubre toda la tarjeta con ::after ("enlace extendido") y las
                // acciones son botones reales por encima (z-10), así que con mouse se comporta igual que antes.
                <div
                  key={ev.id}
                  className={`relative rounded-xl border border-border bg-card p-3 flex items-center gap-3 hover:border-primary/40 focus-within:border-primary/40 transition-all ${
                    cancelandoId === ev.id ? "opacity-50" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/organizador/eventos/${ev.id}`)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 after:absolute after:inset-0 after:rounded-xl after:content-['']"
                  >
                    {ev.imagenPortadaUrl ? (
                      <img src={ev.imagenPortadaUrl} alt="" loading="lazy" decoding="async" className="w-12 h-12 rounded-lg object-cover flex-none bg-muted" />
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
                  </button>
                  <div className="relative z-10 flex items-center gap-0.5 flex-none">
                    {ev.estado === "Publicado" && (
                      <button
                        type="button"
                        onClick={() => navigate(`/eventos/${ev.urlPublica}`)}
                        title="Ver página pública"
                        aria-label={`Ver la página pública de ${ev.nombre}`}
                        className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      >
                        <ExternalLink size={14} />
                      </button>
                    )}
                    {ev.estado !== "Cancelado" && (
                      <>
                        <button
                          type="button"
                          onClick={() => navigate(`/organizador/eventos/${ev.id}/editar`)}
                          title="Editar"
                          aria-label={`Editar ${ev.nombre}`}
                          className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelarEvento(ev)}
                          disabled={cancelandoId === ev.id}
                          title="Cancelar evento"
                          aria-label={`Cancelar ${ev.nombre}`}
                          className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50"
                        >
                          <Ban size={14} />
                        </button>
                      </>
                    )}
                    <ChevronRight size={15} aria-hidden="true" className="text-muted-foreground ml-0.5 pointer-events-none" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
