import { useEffect, useState } from "react";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "../../lib/api";
import { fmt } from "../../lib/format";
import type { ConfiguracionSistemaResponseDTO, PaqueteCreditoRequestDTO, PaqueteCreditoResponseDTO } from "../../lib/types";

const CLAVE_BIENVENIDA = "creditos_bienvenida";
const CLAVE_PUBLICACION = "creditos_por_publicacion";
const DEFAULT_BIENVENIDA = 5;
const DEFAULT_PUBLICACION = 1;

export function AdminConfigPage() {
  const [packs, setPacks] = useState<PaqueteCreditoResponseDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editPackId, setEditPackId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [packBusy, setPackBusy] = useState<number | null>(null);

  const [newPackOpen, setNewPackOpen] = useState(false);
  const [newPack, setNewPack] = useState({ nombre: "", cantidadCreditos: "", precio: "" });
  const [creatingPack, setCreatingPack] = useState(false);

  const [welcomeCredits, setWelcomeCredits] = useState(String(DEFAULT_BIENVENIDA));
  const [publicacionCost, setPublicacionCost] = useState(String(DEFAULT_PUBLICACION));
  const [savingConfig, setSavingConfig] = useState(false);
  const [saved, setSaved] = useState(false);

  function load() {
    Promise.all([api.get<PaqueteCreditoResponseDTO[]>("/admin/paquetes-credito"), api.get<ConfiguracionSistemaResponseDTO[]>("/admin/configuraciones")])
      .then(([packsData, configsData]) => {
        setPacks(packsData);
        const map: Record<string, ConfiguracionSistemaResponseDTO> = {};
        configsData.forEach((c) => (map[c.clave] = c));
        if (map[CLAVE_BIENVENIDA]) setWelcomeCredits(map[CLAVE_BIENVENIDA].valor);
        if (map[CLAVE_PUBLICACION]) setPublicacionCost(map[CLAVE_PUBLICACION].valor);
      })
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "No pudimos cargar la configuración."));
  }

  useEffect(load, []);

  async function togglePack(p: PaqueteCreditoResponseDTO) {
    setPackBusy(p.id);
    try {
      const path = p.estado === "Activo" ? `/admin/paquetes-credito/${p.id}/deshabilitar` : `/admin/paquetes-credito/${p.id}/habilitar`;
      const updated = await api.patch<PaqueteCreditoResponseDTO>(path);
      setPacks((ps) => ps!.map((x) => (x.id === p.id ? updated : x)));
      toast.success(updated.estado === "Activo" ? `Pack ${p.nombre} activado` : `Pack ${p.nombre} desactivado`);
    } catch (e: unknown) {
      const message = e instanceof ApiError ? e.message : "No pudimos actualizar el paquete.";
      setError(message);
      toast.error(message);
    } finally {
      setPackBusy(null);
    }
  }

  function startEditPrice(p: PaqueteCreditoResponseDTO) {
    setEditPackId(p.id);
    setEditPrice(String(p.precio));
  }

  async function savePrice(p: PaqueteCreditoResponseDTO) {
    const precio = parseFloat(editPrice);
    if (!precio || precio <= 0) {
      setEditPackId(null);
      return;
    }
    setPackBusy(p.id);
    try {
      const updated = await api.put<PaqueteCreditoResponseDTO>(`/admin/paquetes-credito/${p.id}`, {
        nombre: p.nombre,
        cantidadCreditos: p.cantidadCreditos,
        precio,
      } satisfies PaqueteCreditoRequestDTO);
      setPacks((ps) => ps!.map((x) => (x.id === p.id ? updated : x)));
      toast.success(`Precio de ${p.nombre} actualizado a ${fmt(precio)}`);
    } catch (e: unknown) {
      const message = e instanceof ApiError ? e.message : "No pudimos actualizar el precio.";
      setError(message);
      toast.error(message);
    } finally {
      setPackBusy(null);
      setEditPackId(null);
    }
  }

  async function createPack() {
    const cantidadCreditos = parseInt(newPack.cantidadCreditos, 10);
    const precio = parseFloat(newPack.precio);
    if (!newPack.nombre.trim() || !cantidadCreditos || cantidadCreditos <= 0 || !precio || precio <= 0) return;
    setCreatingPack(true);
    setError(null);
    try {
      const created = await api.post<PaqueteCreditoResponseDTO>("/admin/paquetes-credito", {
        nombre: newPack.nombre.trim(),
        cantidadCreditos,
        precio,
      } satisfies PaqueteCreditoRequestDTO);
      setPacks((ps) => [...(ps ?? []), created]);
      setNewPack({ nombre: "", cantidadCreditos: "", precio: "" });
      setNewPackOpen(false);
      toast.success(`Pack ${created.nombre} creado`);
    } catch (e: unknown) {
      const message = e instanceof ApiError ? e.message : "No pudimos crear el paquete.";
      setError(message);
      toast.error(message);
    } finally {
      setCreatingPack(false);
    }
  }

  async function handleSaveConfig() {
    setSavingConfig(true);
    setError(null);
    try {
      await api.put(`/admin/configuraciones/${CLAVE_BIENVENIDA}`, {
        valor: welcomeCredits,
        descripcion: "Créditos asignados automáticamente al crear una cuenta de Organizador nueva.",
      });
      await api.put(`/admin/configuraciones/${CLAVE_PUBLICACION}`, {
        valor: publicacionCost,
        descripcion: "Créditos que cuesta publicar un evento.",
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
      load();
    } catch (e: unknown) {
      const message = e instanceof ApiError ? e.message : "No pudimos guardar la configuración.";
      setError(message);
      toast.error(message);
    } finally {
      setSavingConfig(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 lg:px-8 pt-8 pb-5 border-b border-border">
        <h1 className="text-xl font-extrabold text-foreground">Configuración y Paquetes</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Paquetes de créditos y ajustes globales del sistema</p>
      </div>

      <div className="px-4 lg:px-8 py-5 space-y-5">
        {error && <div className="rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-sm p-4">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {/* Paquetes de créditos */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">Paquetes de Créditos</p>
                <p className="text-xs text-muted-foreground mt-0.5">Configurar precios y disponibilidad</p>
              </div>
              <button
                onClick={() => setNewPackOpen((o) => !o)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 text-primary text-xs font-bold hover:bg-primary/25 transition-colors"
              >
                <Plus size={12} />
                Nuevo
              </button>
            </div>

            {newPackOpen && (
              <div className="px-5 py-4 border-b border-border space-y-2 bg-background/50">
                <input
                  value={newPack.nombre}
                  onChange={(e) => setNewPack((p) => ({ ...p, nombre: e.target.value }))}
                  placeholder="Nombre del paquete (ej. Pro)"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={newPack.cantidadCreditos}
                    onChange={(e) => setNewPack((p) => ({ ...p, cantidadCreditos: e.target.value }))}
                    placeholder="Créditos"
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <input
                    type="number"
                    value={newPack.precio}
                    onChange={(e) => setNewPack((p) => ({ ...p, precio: e.target.value }))}
                    placeholder="Precio $"
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    disabled={creatingPack}
                    onClick={createPack}
                    className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {creatingPack ? "..." : "Crear"}
                  </button>
                </div>
              </div>
            )}

            <div className="divide-y divide-border">
              {packs?.map((pack) => (
                <div key={pack.id} className={`px-5 py-3.5 transition-colors ${pack.estado === "Deshabilitado" ? "opacity-50" : ""} ${packBusy === pack.id ? "opacity-30" : ""}`}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                          pack.estado === "Activo" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {pack.cantidadCreditos}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{pack.nombre}</p>
                        <p className="text-xs text-muted-foreground">{pack.cantidadCreditos} créditos</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="flex flex-col items-end">
                        {editPackId === pack.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">$</span>
                            <input
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              className="w-20 px-2 py-1 bg-background border border-primary/50 rounded-lg text-xs text-foreground focus:outline-none"
                            />
                            <button onClick={() => savePrice(pack)} className="px-2 py-1 bg-primary text-white text-xs rounded-lg font-bold">
                              OK
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => startEditPrice(pack)}>
                            <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity font-semibold">Editar precio</span>
                            <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{fmt(pack.precio)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5 border-l border-border pl-5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${pack.estado === "Activo" ? "text-emerald-400" : "text-muted-foreground"}`}>
                          {pack.estado === "Activo" ? "Activo" : "Inactivo"}
                        </span>
                        <button
                          onClick={() => togglePack(pack)}
                          className={`w-10 h-6 rounded-full transition-all flex items-center px-0.5 ${
                            pack.estado === "Activo" ? "bg-primary justify-end" : "bg-muted justify-start"
                          }`}
                        >
                          <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {packs !== null && packs.length === 0 && (
                <div className="py-10 text-center">
                  <p className="text-muted-foreground text-sm">Todavía no hay paquetes de crédito.</p>
                </div>
              )}
              {packs === null && (
                <div className="p-5 space-y-2.5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-14 rounded-xl bg-background/60 animate-pulse" />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Configuración global */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <p className="text-sm font-bold text-foreground">Configuración Global</p>
              <p className="text-xs text-muted-foreground mt-0.5">Parámetros operativos del sistema</p>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Créditos de bienvenida (por registro)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={welcomeCredits}
                    onChange={(e) => setWelcomeCredits(e.target.value)}
                    className="flex-1 px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  />
                  <span className="text-xs text-muted-foreground flex-none">créditos</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Asignados automáticamente al crear una cuenta nueva.</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Costo de publicación por evento</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={publicacionCost}
                    onChange={(e) => setPublicacionCost(e.target.value)}
                    className="flex-1 px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  />
                  <span className="text-xs text-muted-foreground flex-none">créditos</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Se descuentan del Organizador al publicar un evento.</p>
              </div>

              <button
                disabled={savingConfig}
                onClick={handleSaveConfig}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 ${
                  saved ? "bg-emerald-500 text-white" : "bg-primary text-white hover:bg-primary/90"
                }`}
              >
                {saved ? (
                  <span className="flex items-center justify-center gap-2">
                    <Check size={15} />
                    ¡Cambios guardados!
                  </span>
                ) : savingConfig ? (
                  "Guardando..."
                ) : (
                  "Guardar cambios"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
