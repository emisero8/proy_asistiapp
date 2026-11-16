import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Calendar, CircleDollarSign, History, Ticket, Users } from "lucide-react";
import { Card, EmptyState, ErrorState, PageHeader, Skeleton, StatCard } from "../../components/ui";
import { api, ApiError } from "../../lib/api";
import { describirAccion } from "../../lib/auditoria";
import { fmt, formatRelativo } from "../../lib/format";
import type { AdminMetricasResponseDTO, LogAuditoriaResponseDTO } from "../../lib/types";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

/**
 * Panel del Admin: métricas globales y la actividad reciente. Los tres "atajos" que había
 * (Usuarios, Eventos, Configuración) se sacaron: repetían el sidebar / la barra de pestañas.
 */
export function AdminDashboardPage() {
  useDocumentTitle("Dashboard · Admin");
  const [metrics, setMetrics] = useState<AdminMetricasResponseDTO | null>(null);
  const [actividad, setActividad] = useState<LogAuditoriaResponseDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function cargar() {
    setError(null);
    api
      .get<AdminMetricasResponseDTO>("/admin/metricas")
      .then(setMetrics)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "No pudimos cargar las métricas."));
    api
      .get<LogAuditoriaResponseDTO[]>("/admin/auditoria")
      .then((logs) => setActividad(logs.slice(0, 6)))
      .catch(() => setActividad([]));
  }

  useEffect(cargar, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6 lg:space-y-8 lg:px-8 lg:py-8">
      <PageHeader eyebrow="Administración" title="Panel general" />

      {error && metrics === null && <ErrorState title="No pudimos cargar las métricas" description={error} onRetry={cargar} />}

      {!error && metrics === null && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy="true">
          <span className="sr-only">Cargando métricas…</span>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      )}

      {metrics && (
        <section aria-label="Métricas de la plataforma" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Ingresos totales"
            value={fmt(metrics.ingresosTotales)}
            icon={CircleDollarSign}
            emphasis="primary"
            className="col-span-2 lg:col-span-1"
          />
          <StatCard label="Entradas vendidas" value={metrics.entradasVendidas.toLocaleString("es-AR")} icon={Ticket} />
          <StatCard label="Organizadores activos" value={metrics.organizadoresActivos.toLocaleString("es-AR")} icon={Users} />
          <StatCard
            label="Eventos activos"
            value={metrics.eventosActivos.toLocaleString("es-AR")}
            hint={`${metrics.eventosTotales.toLocaleString("es-AR")} en total`}
            icon={Calendar}
            className="col-span-2 lg:col-span-1"
          />
        </section>
      )}

      <Card as="section" padding="none" aria-labelledby="actividad-titulo" className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 md:px-5">
          <h2 id="actividad-titulo" className="flex items-center gap-2 text-base font-bold text-foreground">
            <History size={16} aria-hidden="true" className="text-secondary" />
            Actividad reciente
          </h2>
          <Link to="/admin/auditoria" className="inline-flex items-center gap-1 rounded-md text-sm font-semibold text-primary underline-offset-4 hover:underline">
            <span className="sm:hidden">Ver todo</span>
            <span className="hidden sm:inline">Ver toda la auditoría</span>
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
        {actividad === null ? (
          <div className="space-y-2 p-4" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : actividad.length === 0 ? (
          <EmptyState variant="plain" icon={History} title="Todavía no hay actividad registrada" />
        ) : (
          <ul className="divide-y divide-border">
            {actividad.map((log) => (
              <li key={log.id} className="flex items-center justify-between gap-3 px-4 py-3 md:px-5">
                <p className="min-w-0 truncate text-sm text-foreground">{describirAccion(log)}</p>
                <time dateTime={log.fechaHora} className="flex-none text-xs text-muted-foreground">
                  {formatRelativo(log.fechaHora)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
