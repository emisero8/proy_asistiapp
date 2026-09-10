import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ChevronLeft, Plus, Trash2, AlertCircle, CheckCircle2, ImagePlus, Save } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { fmt } from "../../lib/format";
import { validarTandaContraEvento } from "./WizardPage";
import type { EventoRequestDTO, EventoResponseDTO, TandaRequestDTO, TandaResponseDTO } from "../../lib/types";

interface EditTanda {
  id: number | null; // null = tanda nueva sin guardar
  nombre: string;
  precio: string;
  cupoMaximo: string;
  cupoDisponible: number | null;
  desde: string;
  hasta: string;
}

function toTandaFecha(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function tandaFromResponse(t: TandaResponseDTO): EditTanda {
  return {
    id: t.id,
    nombre: t.nombre,
    precio: String(t.precio),
    cupoMaximo: String(t.cupoMaximo),
    cupoDisponible: t.cupoDisponible,
    desde: toTandaFecha(t.fechaInicioVigencia),
    hasta: toTandaFecha(t.fechaFinVigencia),
  };
}

export function OrganizadorEditEventPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();

  // La misma pantalla la usan el Organizador y el Admin. El Admin pega contra
  // /admin/eventos/* (sin chequeo de propiedad); el Organizador contra /eventos/*.
  const esAdmin = session?.rol === "Administrador";
  const base = esAdmin ? `/admin/eventos/${id}` : `/eventos/${id}`;
  const volverA = esAdmin ? "/admin/eventos" : "/organizador/dashboard";

  const [evento, setEvento] = useState<EventoResponseDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [venue, setVenue] = useState("");
  const [img, setImg] = useState("");
  const [savingData, setSavingData] = useState(false);

  const [tandas, setTandas] = useState<EditTanda[]>([]);
  const [busyTanda, setBusyTanda] = useState<number | "nueva" | null>(null);

  const hoyStr = new Date().toISOString().slice(0, 10);

  function hidratar(ev: EventoResponseDTO) {
    setEvento(ev);
    setTitle(ev.nombre);
    setDesc(ev.descripcion ?? "");
    setDate(ev.fechaEvento);
    setTime(ev.horaEvento.slice(0, 5));
    setVenue(ev.lugar);
    setImg(ev.imagenPortadaUrl ?? "");
    setTandas(ev.tandas.map(tandaFromResponse));
  }

  useEffect(() => {
    if (!id) return;
    api
      .get<EventoResponseDTO>(base)
      .then(hidratar)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "No pudimos cargar el evento."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, base]);

  const bloqueado = evento?.estado === "Cancelado";
  const publicado = evento?.estado === "Publicado";
  const fechaEnPasado = date !== "" && date < hoyStr;
  const datosValidos = title.trim() && date && time && venue.trim() && !fechaEnPasado;

  function updateTanda(idx: number, field: keyof EditTanda, val: string) {
    setTandas((ts) => ts.map((t, i) => (i === idx ? { ...t, [field]: val } : t)));
  }

  function vendidasDe(t: EditTanda): number {
    const original = evento?.tandas.find((x) => x.id === t.id);
    if (!original) return 0;
    return original.cupoMaximo - original.cupoDisponible;
  }

  const tandaErrors = useMemo(
    () =>
      tandas.map((t) => {
        const err = validarTandaContraEvento(t, date);
        if (err) return err;
        if (t.id !== null && t.cupoMaximo !== "" && Number(t.cupoMaximo) < vendidasDe(t)) {
          return `El cupo no puede bajar de las ${vendidasDe(t)} entradas ya vendidas.`;
        }
        return null;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tandas, date, evento],
  );

  async function guardarDatos() {
    if (!id || !datosValidos) return;
    setSavingData(true);
    setError(null);
    setOkMsg(null);
    try {
      const dto: EventoRequestDTO = {
        nombre: title.trim(),
        descripcion: desc.trim() || undefined,
        fechaEvento: date,
        horaEvento: `${time}:00`,
        lugar: venue.trim(),
        imagenPortadaUrl: img.trim() || undefined,
      };
      const actualizado = await api.put<EventoResponseDTO>(base, dto);
      hidratar(actualizado);
      setOkMsg("Datos del evento guardados.");
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "No pudimos guardar los cambios.");
    } finally {
      setSavingData(false);
    }
  }

  function tandaDto(t: EditTanda): TandaRequestDTO {
    const finHora = t.hasta === date ? `${time}:00` : "23:59:59";
    return {
      nombre: t.nombre.trim(),
      precio: Number(t.precio),
      cupoMaximo: Number(t.cupoMaximo),
      fechaInicioVigencia: t.desde ? `${t.desde}T00:00:00` : undefined,
      fechaFinVigencia: t.hasta ? `${t.hasta}T${finHora}` : undefined,
    };
  }

  async function guardarTanda(idx: number) {
    if (!id) return;
    const t = tandas[idx];
    if (!t.nombre || !t.precio || !t.cupoMaximo || tandaErrors[idx]) return;
    if (t.id !== null && Number(t.cupoMaximo) < vendidasDe(t)) {
      setError(`No podés bajar el cupo de "${t.nombre}" por debajo de las ${vendidasDe(t)} entradas ya vendidas.`);
      return;
    }
    setBusyTanda(t.id ?? "nueva");
    setError(null);
    setOkMsg(null);
    try {
      if (t.id === null) {
        await api.post<TandaResponseDTO>(`${base}/tandas`, tandaDto(t));
      } else {
        await api.put<TandaResponseDTO>(`${base}/tandas/${t.id}`, tandaDto(t));
      }
      const refrescado = await api.get<EventoResponseDTO>(base);
      hidratar(refrescado);
      setOkMsg("Tanda guardada.");
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "No pudimos guardar la tanda.");
    } finally {
      setBusyTanda(null);
    }
  }

  async function eliminarTanda(idx: number) {
    const t = tandas[idx];
    if (t.id === null) {
      setTandas((ts) => ts.filter((_, i) => i !== idx));
      return;
    }
    if (!id) return;
    if (!window.confirm(`¿Eliminar la tanda "${t.nombre}"?`)) return;
    setBusyTanda(t.id);
    setError(null);
    try {
      await api.delete(`${base}/tandas/${t.id}`);
      const refrescado = await api.get<EventoResponseDTO>(base);
      hidratar(refrescado);
      setOkMsg("Tanda eliminada.");
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "No pudimos eliminar la tanda.");
    } finally {
      setBusyTanda(null);
    }
  }

  function addTanda() {
    setTandas((ts) => [
      ...ts,
      { id: null, nombre: "", precio: "", cupoMaximo: "", cupoDisponible: null, desde: "", hasta: "" },
    ]);
  }

  if (error && !evento) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <p className="text-sm text-destructive text-center">{error}</p>
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="max-w-md lg:max-w-3xl mx-auto px-4 lg:px-8 pt-8 space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/2" />
        <div className="h-40 bg-card border border-border rounded-2xl" />
        <div className="h-40 bg-card border border-border rounded-2xl" />
      </div>
    );
  }

  const inputBase =
    "w-full px-4 py-3 bg-card border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all";

  return (
    <div className="max-w-md lg:max-w-3xl mx-auto px-4 lg:px-8 pt-6 pb-28 md:pb-12">
      <button
        onClick={() => navigate(volverA)}
        className="flex items-center gap-1 text-muted-foreground text-sm mb-3 hover:text-foreground transition-colors"
      >
        <ChevronLeft size={15} />
        {esAdmin ? "Volver a eventos" : "Volver al dashboard"}
      </button>

      <div className="flex items-center gap-3 mb-1">
        <h2 className="text-lg lg:text-xl font-extrabold text-foreground">Editar evento</h2>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            publicado
              ? "bg-green-400/15 text-green-400"
              : evento.estado === "Borrador"
                ? "bg-muted text-muted-foreground"
                : "bg-red-400/15 text-red-400"
          }`}
        >
          {evento.estado}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-5">{evento.nombre}</p>

      {bloqueado && (
        <div className="rounded-xl border border-border bg-card text-sm text-muted-foreground p-4 flex gap-2">
          <AlertCircle size={15} className="flex-none mt-0.5" />
          Este evento está cancelado. No se puede editar.
        </div>
      )}

      {publicado && !bloqueado && (
        <div className="rounded-xl border border-primary/25 bg-primary/10 text-xs text-foreground p-3.5 flex gap-2 mb-4">
          <AlertCircle size={14} className="flex-none mt-0.5 text-primary" />
          Este evento está publicado y en venta. Los cambios impactan de inmediato a los compradores. No podés
          reducir el cupo de una tanda por debajo de lo ya vendido ni dejar el evento sin tandas.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-sm p-4 flex gap-2 mb-4">
          <AlertCircle size={15} className="flex-none mt-0.5" />
          {error}
        </div>
      )}
      {okMsg && (
        <div className="rounded-xl border border-green-400/30 bg-green-400/10 text-green-400 text-sm p-4 flex gap-2 mb-4">
          <CheckCircle2 size={15} className="flex-none mt-0.5" />
          {okMsg}
        </div>
      )}

      {!bloqueado && (
        <>
          {/* ── Datos básicos ── */}
          <div className="bg-card/40 border border-border rounded-2xl p-4 lg:p-5 space-y-4 mb-5">
            <p className="text-xs font-bold text-foreground uppercase tracking-wider">Datos del evento</p>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Nombre *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={`${inputBase} border-border`} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Descripción</label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={3}
                className={`${inputBase} border-border resize-none`}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Fecha *</label>
                <input
                  type="date"
                  value={date}
                  min={hoyStr}
                  onChange={(e) => setDate(e.target.value)}
                  className={`${inputBase} ${fechaEnPasado ? "border-red-500/60" : "border-border"}`}
                />
                {fechaEnPasado && <p className="text-[11px] text-red-400 mt-1">La fecha no puede estar en el pasado.</p>}
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Hora *</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={`${inputBase} border-border`}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Lugar *</label>
              <input value={venue} onChange={(e) => setVenue(e.target.value)} className={`${inputBase} border-border`} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">URL imagen de portada</label>
              <div className="relative">
                <ImagePlus size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={img}
                  onChange={(e) => setImg(e.target.value)}
                  placeholder="https://..."
                  className={`${inputBase} border-border pl-9`}
                />
              </div>
              {img && <img src={img} alt="preview" className="w-full h-32 object-cover rounded-xl mt-2 bg-muted" />}
            </div>
            <button
              disabled={!datosValidos || savingData}
              onClick={guardarDatos}
              className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                datosValidos && !savingData
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              <Save size={15} />
              {savingData ? "Guardando..." : "Guardar datos"}
            </button>
          </div>

          {/* ── Tandas ── */}
          <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Tandas</p>
          <div className="space-y-3">
            {tandas.map((t, i) => {
              const vendidas = t.id !== null ? vendidasDe(t) : 0;
              return (
                <div
                  key={t.id ?? `nueva-${i}`}
                  className={`bg-card border rounded-2xl p-4 space-y-3 ${tandaErrors[i] ? "border-red-500/50" : "border-border"}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground uppercase tracking-wider">
                      {t.id === null ? "Nueva tanda" : t.nombre || `Tanda ${i + 1}`}
                    </p>
                    <button
                      onClick={() => eliminarTanda(i)}
                      disabled={busyTanda !== null}
                      className="text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Nombre *</label>
                    <input
                      value={t.nombre}
                      onChange={(e) => updateTanda(i, "nombre", e.target.value)}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Precio *</label>
                      <input
                        value={t.precio}
                        inputMode="numeric"
                        onChange={(e) => updateTanda(i, "precio", e.target.value)}
                        className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Cupo máximo *</label>
                      <input
                        value={t.cupoMaximo}
                        inputMode="numeric"
                        onChange={(e) => updateTanda(i, "cupoMaximo", e.target.value)}
                        className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Venta desde</label>
                      <input
                        type="date"
                        value={t.desde}
                        max={date || undefined}
                        onChange={(e) => updateTanda(i, "desde", e.target.value)}
                        className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Venta hasta</label>
                      <input
                        type="date"
                        value={t.hasta}
                        max={date || undefined}
                        onChange={(e) => updateTanda(i, "hasta", e.target.value)}
                        className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
                    </div>
                  </div>
                  {t.id !== null && (
                    <p className="text-[10px] text-muted-foreground">
                      {vendidas} vendidas · {t.cupoDisponible} disponibles · el cupo no puede bajar de {vendidas}
                    </p>
                  )}
                  {tandaErrors[i] && (
                    <p className="text-[11px] text-red-400 flex items-start gap-1">
                      <AlertCircle size={12} className="flex-none mt-0.5" />
                      {tandaErrors[i]}
                    </p>
                  )}
                  <button
                    disabled={busyTanda !== null || !t.nombre || !t.precio || !t.cupoMaximo || !!tandaErrors[i]}
                    onClick={() => guardarTanda(i)}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      busyTanda === null && t.nombre && t.precio && t.cupoMaximo && !tandaErrors[i]
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    <Save size={13} />
                    {t.id === null ? "Crear tanda" : "Guardar tanda"}
                  </button>
                </div>
              );
            })}
            <button
              onClick={addTanda}
              className="w-full py-3 rounded-2xl border border-dashed border-border text-muted-foreground text-sm flex items-center justify-center gap-2 hover:border-primary/50 hover:text-foreground transition-all"
            >
              <Plus size={15} />
              Agregar tanda
            </button>
          </div>

          {evento.estado === "Borrador" && !esAdmin && (
            <p className="text-[11px] text-muted-foreground mt-4">
              Este evento todavía está en borrador. El organizador lo publica desde su panel (consume 1 crédito).
            </p>
          )}
        </>
      )}

      {/* resumen de precios visible siempre */}
      {evento.tandas.length > 0 && (
        <div className="mt-6 bg-card border border-border rounded-2xl p-4">
          <p className="text-xs font-bold text-foreground mb-2">Precios actuales</p>
          {evento.tandas.map((t) => (
            <div key={t.id} className="flex items-center justify-between text-xs py-1">
              <span className="text-muted-foreground">{t.nombre}</span>
              <span className="text-foreground font-semibold">{fmt(t.precio)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
