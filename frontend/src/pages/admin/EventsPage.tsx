import { useEffect, useState } from "react";
import { EventoImagen } from "../../components/EventoImagen";
import { useNavigate } from "react-router";
import { CalendarSearch, CircleX, Pencil, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "../../lib/api";
import { formatFecha } from "../../lib/format";
import type { EventoResponseDTO } from "../../lib/types";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useDialog } from "../../lib/dialogs";
import { Card, EmptyState, ErrorState, Input, Menu, PageHeader, Skeleton, StatusBadge } from "../../components/ui";
import { cn } from "../../lib/cn";

export function AdminEventsPage() {
  useDocumentTitle("Eventos · Admin");
  const { confirm } = useDialog();
  const navigate = useNavigate();
  const [eventos, setEventos] = useState<EventoResponseDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  function cargar() {
    setError(null);
    api
      .get<EventoResponseDTO[]>("/admin/eventos")
      .then(setEventos)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "No pudimos cargar los eventos."));
  }

  useEffect(cargar, []);

  const filtered = (eventos ?? []).filter((e) => e.nombre.toLowerCase().includes(search.toLowerCase()));

  function entradasVendidas(e: EventoResponseDTO): number {
    return e.tandas.reduce((acc, t) => acc + (t.cupoMaximo - t.cupoDisponible), 0);
  }

  async function cancelarEvento(e: EventoResponseDTO) {
    // Irreversible y avisa a terceros: se confirma, igual que desde el panel del organizador.
    const ok = await confirm({
      titulo: "Cancelar evento",
      mensaje: `¿Cancelar "${e.nombre}"? Se avisa por email a los compradores y al organizador, y se le devuelven los créditos de las entradas sin vender. No se puede deshacer.`,
      confirmarTexto: "Cancelar evento",
      cancelarTexto: "No, volver",
      variante: "destructiva",
    });
    if (!ok) return;
    setBusyId(e.id);
    try {
      const updated = await api.patch<EventoResponseDTO>(`/admin/eventos/${e.id}/cancelar`);
      setEventos((evs) => evs!.map((x) => (x.id === e.id ? updated : x)));
      toast.success(`${e.nombre} cancelado`);
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "No pudimos cancelar el evento.";
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  }

  async function eliminarEvento(e: EventoResponseDTO) {
    const ok = await confirm({
      titulo: "Eliminar evento",
      mensaje: `¿Eliminar "${e.nombre}" definitivamente? Esta acción no se puede deshacer.`,
      confirmarTexto: "Eliminar",
      variante: "destructiva",
    });
    if (!ok) return;
    setBusyId(e.id);
    try {
      await api.delete(`/admin/eventos/${e.id}`);
      setEventos((evs) => evs!.filter((x) => x.id !== e.id));
      toast.success(`${e.nombre} eliminado`);
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "No pudimos eliminar el evento.";
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Eventos"
        description={eventos === null ? "Todos los eventos de la plataforma." : `${eventos.length} ${eventos.length === 1 ? "evento" : "eventos"} en la plataforma.`}
      />

      {error && eventos === null && <ErrorState title="No pudimos cargar los eventos" description={error} onRetry={cargar} />}

      {!error && eventos === null && (
        <div className="space-y-2" aria-busy="true">
          <span className="sr-only">Cargando eventos…</span>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      )}

      {eventos !== null && (
        <Card as="section" padding="none" aria-label="Lista de eventos" className="overflow-hidden">
          <div className="border-b border-border p-4 md:p-5">
            <Input
              type="search"
              size="sm"
              surface="sunken"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por evento..."
              aria-label="Buscar eventos por nombre"
              leadingIcon={<Search size={15} />}
              className="sm:max-w-sm"
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState variant="plain" icon={CalendarSearch} title={search.trim() ? "Ningún evento coincide con la búsqueda" : "Todavía no hay eventos"} />
          ) : (
            // Una sola tabla: tabla desde lg, tarjetas (flex) en mobile/tablet.
            <table className="w-full text-sm">
              <thead className="sr-only lg:not-sr-only">
                <tr className="border-b border-border bg-surface-sunken text-2xs uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-5 py-2.5 text-left font-semibold">Evento</th>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">Organizador</th>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">Fecha</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Entradas</th>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">Estado</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-semibold">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((e) => (
                  <tr
                    key={e.id}
                    className={cn(
                      "flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors duration-(--duration-fast) hover:bg-surface-sunken lg:table-row lg:p-0",
                      busyId === e.id && "opacity-50",
                    )}
                  >
                    <td className="min-w-0 flex-1 basis-[calc(100%-3.5rem)] lg:px-5 lg:py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <EventoImagen src={e.imagenPortadaUrl} alt="" className="aspect-[3/4] w-8 flex-none rounded-md object-cover" iconSize={12} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground lg:max-w-64">{e.nombre}</p>
                          <p className="truncate text-xs text-muted-foreground lg:hidden">
                            {formatFecha(e.fechaEvento)} · Organizador #{e.idOrganizador}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">#{e.idOrganizador}</td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-muted-foreground lg:table-cell">{formatFecha(e.fechaEvento)}</td>
                    <td className="order-4 text-xs text-muted-foreground lg:order-none lg:table-cell lg:px-4 lg:py-3 lg:text-right lg:text-sm">
                      <span className="font-semibold tabular-nums text-foreground">{entradasVendidas(e).toLocaleString("es-AR")}</span>
                      <span className="lg:hidden"> vendidas</span>
                    </td>
                    <td className="order-3 pl-11 lg:order-none lg:table-cell lg:px-4 lg:py-3">
                      <StatusBadge tipo="evento" estado={e.estado} size="sm" />
                    </td>
                    <td className="order-2 flex-none lg:order-none lg:table-cell lg:px-5 lg:py-3 lg:text-right">
                      <Menu
                        label={`Acciones de ${e.nombre}`}
                        disabled={busyId === e.id}
                        placement="bottom-end"
                        items={[
                          { label: "Editar", icon: Pencil, onSelect: () => navigate(`/admin/eventos/${e.id}/editar`) },
                          ...(e.estado !== "Cancelado"
                            ? [{ label: "Cancelar evento", icon: CircleX, tone: "danger" as const, separatorBefore: true, onSelect: () => cancelarEvento(e) }]
                            : []),
                          {
                            label: "Eliminar",
                            icon: Trash2,
                            tone: "danger" as const,
                            separatorBefore: e.estado === "Cancelado",
                            onSelect: () => eliminarEvento(e),
                          },
                        ]}
                      />
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
