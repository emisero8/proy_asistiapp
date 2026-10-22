import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { describirAccion } from "../../lib/auditoria";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import type { LogAuditoriaResponseDTO } from "../../lib/types";

export function AdminAuditoriaPage() {
  useDocumentTitle("Auditoría · Admin");
  const [logs, setLogs] = useState<LogAuditoriaResponseDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .get<LogAuditoriaResponseDTO[]>("/admin/auditoria")
      .then(setLogs)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "No pudimos cargar la auditoría."));
  }, []);

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

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 lg:px-8 pt-8 pb-5 border-b border-border">
        <h1 className="text-xl font-extrabold text-foreground">Auditoría del sistema</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {logs?.length ?? 0} acci{(logs?.length ?? 0) === 1 ? "ón" : "ones"} registrada{(logs?.length ?? 0) === 1 ? "" : "s"}
        </p>
      </div>

      <div className="px-4 lg:px-8 py-5 space-y-4">
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por acción, entidad o admin..."
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
        </div>

        {error && <div className="rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-sm p-4">{error}</div>}

        {logs === null && !error && (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-2xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        )}

        {logs !== null && (
          <div className="bg-card border border-border rounded-2xl overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-border">
                  {["Fecha y hora", "Acción", "Entidad afectada", "Detalle"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((log, i) => (
                  <tr key={log.id} className={`${i < filtrados.length - 1 ? "border-b border-border" : ""} hover:bg-muted/30 transition-colors`}>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(log.fechaHora).toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-foreground">{describirAccion(log)}</td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">
                      {log.entidadAfectada}
                      {log.idEntidadAfectada != null && ` #${log.idEntidadAfectada}`}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground max-w-[280px] truncate" title={log.detalle ?? undefined}>
                      {log.detalle ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtrados.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-muted-foreground text-sm">
                  {logs.length === 0 ? "Todavía no hay acciones registradas." : "Ninguna acción coincide con la búsqueda."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
