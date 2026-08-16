import { useEffect, useState } from "react";
import { CircleX, Search, Sparkles, Trash2, X } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { formatFecha } from "../../lib/format";
import type { EventoRequestDTO, EventoResponseDTO } from "../../lib/types";

export function AdminEventsPage() {
  const [eventos, setEventos] = useState<EventoResponseDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editing, setEditing] = useState<EventoResponseDTO | null>(null);
  const [editForm, setEditForm] = useState<EventoRequestDTO>({ nombre: "", fechaEvento: "", horaEvento: "", lugar: "" });
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startEdit(e: EventoResponseDTO) {
    setOpenMenu(null);
    setEditing(e);
    setEditError(null);
    setEditForm({
      nombre: e.nombre,
      descripcion: e.descripcion ?? "",
      fechaEvento: e.fechaEvento,
      horaEvento: e.horaEvento.slice(0, 5),
      lugar: e.lugar,
      imagenPortadaUrl: e.imagenPortadaUrl ?? "",
    });
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    setEditError(null);
    try {
      const updated = await api.put<EventoResponseDTO>(`/admin/eventos/${editing.id}`, {
        ...editForm,
        horaEvento: `${editForm.horaEvento}:00`,
      });
      setEventos((evs) => evs!.map((x) => (x.id === editing.id ? updated : x)));
      setEditing(null);
    } catch (err: unknown) {
      setEditError(err instanceof ApiError ? err.message : "No pudimos guardar los cambios.");
    } finally {
      setSaving(false);
    }
  }

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
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "No pudimos cancelar el evento.");
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
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "No pudimos eliminar el evento.");
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
                    <p className="text-sm font-semibold text-foreground leading-snug max-w-[220px] truncate">{e.nombre}</p>
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
                        <div className="absolute right-0 top-9 z-50 bg-card border border-border rounded-xl shadow-xl shadow-black/40 overflow-hidden min-w-[170px]">
                          <button
                            onClick={() => startEdit(e)}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors flex items-center gap-2"
                          >
                            <Sparkles size={13} className="text-primary" />
                            Editar
                          </button>
                          <div className="border-t border-border" />
                          {e.estado !== "Cancelado" && (
                            <button
                              onClick={() => cancelarEvento(e)}
                              className="w-full text-left px-4 py-2.5 text-xs font-semibold text-amber-400 hover:bg-amber-400/10 transition-colors flex items-center gap-2"
                            >
                              <CircleX size={13} />
                              Cancelar Evento
                            </button>
                          )}
                          <div className="border-t border-border" />
                          <button
                            onClick={() => eliminarEvento(e)}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-400/10 transition-colors flex items-center gap-2"
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
          {eventos !== null && filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm">No se encontraron eventos.</p>
            </div>
          )}
          {eventos === null && !error && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm">Cargando…</p>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div
            className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">Editar evento</p>
              <button onClick={() => setEditing(null)} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground">
                <X size={15} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Nombre</label>
                <input
                  value={editForm.nombre}
                  onChange={(e) => setEditForm((f) => ({ ...f, nombre: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Descripción</label>
                <textarea
                  value={editForm.descripcion}
                  onChange={(e) => setEditForm((f) => ({ ...f, descripcion: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Fecha</label>
                  <input
                    type="date"
                    value={editForm.fechaEvento}
                    onChange={(e) => setEditForm((f) => ({ ...f, fechaEvento: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Hora</label>
                  <input
                    type="time"
                    value={editForm.horaEvento}
                    onChange={(e) => setEditForm((f) => ({ ...f, horaEvento: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Lugar</label>
                <input
                  value={editForm.lugar}
                  onChange={(e) => setEditForm((f) => ({ ...f, lugar: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">URL de imagen de portada</label>
                <input
                  value={editForm.imagenPortadaUrl}
                  onChange={(e) => setEditForm((f) => ({ ...f, imagenPortadaUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              {editError && <p className="text-xs text-destructive">{editError}</p>}
              <button
                disabled={saving || !editForm.nombre || !editForm.fechaEvento || !editForm.horaEvento || !editForm.lugar}
                onClick={saveEdit}
                className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
