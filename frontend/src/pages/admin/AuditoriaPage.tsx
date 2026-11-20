import { useEffect, useState } from "react";
import { History, Search } from "lucide-react";
import { Card, EmptyState, ErrorState, Input, PageHeader, Skeleton } from "../../components/ui";
import { api, ApiError } from "../../lib/api";
import { describirAccion } from "../../lib/auditoria";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import type { LogAuditoriaResponseDTO } from "../../lib/types";

function fechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function AdminAuditoriaPage() {
  useDocumentTitle("Auditoría · Admin");
  const [logs, setLogs] = useState<LogAuditoriaResponseDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  function cargar() {
    setError(null);
    api
      .get<LogAuditoriaResponseDTO[]>("/admin/auditoria")
      .then(setLogs)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "No pudimos cargar la auditoría."));
  }

  useEffect(cargar, []);

  const termino = search.trim().toLowerCase();
  const filtrados = (logs ?? []).filter((log) => {
    if (!termino) return true;
    return (
      log.accion.toLowerCase().includes(termino) ||
      log.entidadAfectada.toLowerCase().includes(termino) ||
      String(log.idAdmin).includes(termino) ||
      (log.detalle ?? "").toLowerCase().includes(termino)
    );
  });

  const total = logs?.length ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Auditoría"
        description={logs === null ? "Las acciones registradas en el sistema." : `${total} ${total === 1 ? "acción registrada" : "acciones registradas"}.`}
      />

      {error && logs === null && <ErrorState title="No pudimos cargar la auditoría" description={error} onRetry={cargar} />}

      {!error && logs === null && (
        <div className="space-y-2" aria-busy="true">
          <span className="sr-only">Cargando auditoría…</span>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      )}

      {logs !== null && (
        <Card as="section" padding="none" aria-label="Registro de auditoría" className="overflow-hidden">
          <div className="border-b border-border p-4 md:p-5">
            <Input
              type="search"
              size="sm"
              surface="sunken"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por acción, entidad o admin..."
              aria-label="Buscar en la auditoría por acción, entidad o admin"
              leadingIcon={<Search size={15} />}
              className="sm:max-w-sm"
            />
          </div>

          {filtrados.length === 0 ? (
            <EmptyState
              variant="plain"
              icon={History}
              title={logs.length === 0 ? "Todavía no hay acciones registradas" : "Ninguna acción coincide con la búsqueda"}
            />
          ) : (
            // Tabla desde lg; en mobile/tablet cada fila es un bloque con el detalle completo.
            <table className="w-full text-sm">
              <thead className="sr-only lg:not-sr-only">
                <tr className="border-b border-border bg-surface-sunken text-2xs uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-5 py-2.5 text-left font-semibold">Fecha y hora</th>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">Acción</th>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">Entidad afectada</th>
                  <th scope="col" className="px-5 py-2.5 text-left font-semibold">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtrados.map((log) => (
                  <tr key={log.id} className="flex flex-col gap-1 px-4 py-3 lg:table-row lg:p-0">
                    <td className="order-2 whitespace-nowrap text-xs text-muted-foreground lg:order-none lg:table-cell lg:px-5 lg:py-3 lg:text-sm">
                      {fechaHora(log.fechaHora)}
                    </td>
                    <td className="order-1 font-semibold text-foreground lg:order-none lg:table-cell lg:px-4 lg:py-3">{describirAccion(log)}</td>
                    <td className="order-3 text-xs text-muted-foreground lg:order-none lg:table-cell lg:px-4 lg:py-3 lg:text-sm">
                      {log.entidadAfectada}
                      {log.idEntidadAfectada != null && ` #${log.idEntidadAfectada}`}
                    </td>
                    <td className="order-4 text-xs text-muted-foreground lg:order-none lg:table-cell lg:max-w-80 lg:px-5 lg:py-3">
                      {log.detalle ? <span className="lg:line-clamp-2">{log.detalle}</span> : <span className="hidden lg:inline">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}
