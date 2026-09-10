import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { CircleX, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "../../lib/api";
import { formatFecha } from "../../lib/format";
import type { EventoResponseDTO } from "../../lib/types";

export function AdminEventsPage() {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState<EventoResponseDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    api
      .get<EventoResponseDTO[]>("/admin/eventos")
      .then(setEventos)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "No pudimos cargar los eventos."));
  }, []);

  const filtered = (eventos ?? []).filter((e) => e.nombre.toLowerCase().includes(search.toLowerCase()));

  function entradasVendidas(e: EventoResponseDTO): number {
    return e.tandas.reduce((acc, t) => acc + (t.cupoMaximo - t.cupoDisponible), 0);
  }

  async function cancelarEvento(e: EventoResponseDTO) {
    setOpenMenu(null);
    setBusyId(e.id);
    try {
      const updated = await api.patch<EventoResponseDTO>(`/admin/eventos/${e.id}/cancelar`);
      setEventos((evs) => evs!.map((x) => (x.id === e.id ? updated : x)));
      toast.success(`${e.nombre} cancelado`);
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "No pudimos cancelar el evento.";
      setError(message);
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  }

  async function eliminarEvento(e: EventoResponseDTO) {
    setOpenMenu(null);
    if (!window.confirm(`¿Eliminar "${e.nombre}" definitivamente? Esta acción no se puede deshacer.`)) return;
    setBusyId(e.id);
    try {
      await api.delete(`/admin/eventos/${e.id}`);
      setEventos((evs) => evs!.filter((x) => x.id !== e.id));
      toast.success(`${e.nombre} eliminado`);
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "No pudimos eliminar el evento.";
      setError(message);
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  }

  const ESTADO_COLORS: Record<EventoResponseDTO["estado"], string> = {
    Borrador: "bg-muted text-muted-foreground",
    Publicado: "bg-emerald-400/15 text-emerald-400",
    Cancelado: "bg-red-400/15 text-red-400",
  };

  return (
    <div className="min-h-screen bg-background" onClick={() => setOpenMenu(null)}>
      <div className="px-4 lg:px-8 pt-8 pb-5 border-b border-border">
        <h1 className="text-xl font-extrabold text-foreground">Gestión Global de Eventos</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{eventos?.length ?? 0} eventos en la plataforma</p>
      </div>

      <div className="px-4 lg:px-8 py-5 space-y-4">
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por evento..."
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
        </div>

        {error && <div className="rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-sm p-4">{error}</div>}

        {eventos === null && !error && (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-2xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        )}

        {eventos !== null && (
        <div className="bg-card border border-border rounded-2xl overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-border">
                {["Evento", "Organizador", "Fecha", "Entradas", "Estado", "Acciones"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => (
                <tr key={e.id} className={`${i < filtered.length - 1 ? "border-b border-border" : ""} hover:bg-muted/30 transition-colors ${busyId === e.id ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      {e.imagenPortadaUrl ? (
                        <img src={e.imagenPortadaUrl} alt="" className="w-7 aspect-[3/4] rounded-md object-cover flex-none bg-muted" />
                      ) : (
                        <div className="w-7 aspect-[3/4] rounded-md flex-none bg-gradient-to-br from-primary/20 via-card to-background" />
                      )}
                      <p className="text-sm font-semibold text-foreground leading-snug max-w-[190px] truncate">{e.nombre}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">#{e.idOrganizador}</td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">{formatFecha(e.fechaEvento)}</td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-bold text-foreground">{entradasVendidas(e).toLocaleString("es-AR")}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${ESTADO_COLORS[e.estado]}`}>{e.estado}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="relative" onClick={(ev) => ev.stopPropagation()}>
                      <button
                        disabled={busyId === e.id}
                        onClick={() => setOpenMenu(openMenu === e.id ? null : e.id)}
                        className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        ···
                      </button>
                      {openMenu === e.id && (
                        <div className="absolute right-0 top-9 z-50 bg-card border border-border origin-top-right animate-scale-in rounded-xl shadow-xl shadow-black/40 overflow-hidden min-w-[170px]">
                          <button
                            onClick={() => navigate(`/admin/eventos/${e.id}/editar`)}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors flex items-center gap-2"
                          >
                            <Pencil size={13} className="text-primary" />
                            Editar
                          </button>
                          <div className="border-t border-border" />
                          {e.estado !== "Cancelado" && (
                            <button
                              onClick={() => cancelarEvento(e)}
                              className="w-full text-left px-4 py-2.5 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
                            >
                              <CircleX size={13} />
                              Cancelar Evento
                            </button>
                          )}
                          <div className="border-t border-border" />
                          <button
                            onClick={() => eliminarEvento(e)}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
                          >
                            <Trash2 size={13} />
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm">No se encontraron eventos.</p>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
