import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, ChevronRight, ImagePlus, Plus, Trash2, CircleDollarSign, PartyPopper, AlertCircle } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { MapPicker, type Coords } from "../../components/EventMap";
import type { EventoRequestDTO, EventoResponseDTO, MovimientoCreditoResponseDTO, TandaRequestDTO } from "../../lib/types";

interface WizardTanda {
  id: number;
  nombre: string;
  precio: string;
  cupoMaximo: string;
  desde: string;
  hasta: string;
}

/**
 * Valida una tanda contra la fecha del evento. Devuelve el primer problema
 * encontrado o null si está bien. Refleja las reglas del backend
 * (TandaService.validarVentana) para avisar antes de mandar el request.
 */
export function validarTandaContraEvento(
  t: { precio: string; cupoMaximo: string; desde: string; hasta: string },
  fechaEvento: string,
): string | null {
  const precio = Number(t.precio);
  if (t.precio !== "" && (!Number.isFinite(precio) || precio < 0)) return "El precio no puede ser negativo.";
  const cupo = Number(t.cupoMaximo);
  if (t.cupoMaximo !== "" && (!Number.isInteger(cupo) || cupo < 1)) return "El cupo debe ser un número entero de 1 o más.";
  if (t.desde && t.hasta && t.desde > t.hasta) return "El inicio de la venta debe ser anterior al cierre.";
  if (fechaEvento && t.hasta && t.hasta > fechaEvento) return "La venta no puede cerrar después de la fecha del evento.";
  if (fechaEvento && t.desde && t.desde > fechaEvento) return "La venta no puede empezar después de la fecha del evento.";
  return null;
}

export function OrganizadorWizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [published, setPublished] = useState(false);
  const [eventoId, setEventoId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movimiento, setMovimiento] = useState<MovimientoCreditoResponseDTO | null>(null);
  const [saldo, setSaldo] = useState<number | null>(null);

  useEffect(() => {
    api
      .get<MovimientoCreditoResponseDTO[]>("/creditos/historial")
      .then((h) => setSaldo(h[0]?.saldoResultante ?? 0))
      .catch(() => setSaldo(0));
  }, []);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [venue, setVenue] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [img, setImg] = useState("");
  const [tandas, setTandas] = useState<WizardTanda[]>([{ id: 1, nombre: "Anticipada", precio: "", cupoMaximo: "", desde: "", hasta: "" }]);

  const addTanda = () => setTandas((t) => [...t, { id: Date.now(), nombre: "", precio: "", cupoMaximo: "", desde: "", hasta: "" }]);
  const removeTanda = (id: number) => setTandas((t) => t.filter((x) => x.id !== id));
  const updateTanda = (id: number, field: keyof WizardTanda, val: string) =>
    setTandas((t) => t.map((x) => (x.id === id ? { ...x, [field]: val } : x)));

  const hoyStr = new Date().toISOString().slice(0, 10);
  const fechaEnPasado = date !== "" && date < hoyStr;
  const step1Valid = title.trim() && date && time && venue.trim() && !fechaEnPasado;

  const tandaErrors = tandas.map((t) => validarTandaContraEvento(t, date));
  const sinCreditos = saldo !== null && saldo < 1;
  const step2Valid =
    tandas.every((t) => t.nombre && t.precio && t.cupoMaximo) &&
    tandaErrors.every((e) => e === null) &&
    !sinCreditos;

  async function handleNext() {
    setLoading(true);
    setError(null);
    try {
      const dto: EventoRequestDTO = {
        nombre: title,
        descripcion: desc || undefined,
        fechaEvento: date,
        horaEvento: `${time}:00`,
        lugar: venue,
        latitud: coords?.lat ?? null,
        longitud: coords?.lng ?? null,
        imagenPortadaUrl: img || undefined,
      };
      const evento = eventoId
        ? await api.put<EventoResponseDTO>(`/eventos/${eventoId}`, dto)
        : await api.post<EventoResponseDTO>("/eventos", dto);
      setEventoId(evento.id);
      setStep(2);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "No pudimos guardar el evento.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePublicar() {
    if (!eventoId) return;
    setLoading(true);
    setError(null);
    try {
      for (const t of tandas) {
        // Si el "hasta" cae el mismo día del evento, la venta cierra cuando
        // empieza el evento (no a las 23:59) para no chocar con la validación.
        const finHora = t.hasta === date ? `${time}:00` : "23:59:59";
        const dto: TandaRequestDTO = {
          nombre: t.nombre,
          precio: Number(t.precio),
          cupoMaximo: Number(t.cupoMaximo),
          fechaInicioVigencia: t.desde ? `${t.desde}T00:00:00` : undefined,
          fechaFinVigencia: t.hasta ? `${t.hasta}T${finHora}` : undefined,
        };
        await api.post(`/eventos/${eventoId}/tandas`, dto);
      }
      await api.patch(`/eventos/${eventoId}/publicar`);
      const historial = await api.get<MovimientoCreditoResponseDTO[]>("/creditos/historial");
      setMovimiento(historial[0] ?? null);
      setPublished(true);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "No pudimos publicar el evento.");
    } finally {
      setLoading(false);
    }
  }

  if (published) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mb-6">
          <PartyPopper size={36} className="text-primary" />
        </div>
        <p className="text-primary text-xs font-bold tracking-[0.25em] uppercase mb-2">¡Evento publicado!</p>
        <h2 className="text-2xl font-extrabold text-foreground mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground mb-1">{venue}</p>
        <p className="text-sm text-muted-foreground mb-6">
          {date} {time && `· ${time} hs`}
        </p>
        {movimiento && (
          <div className="bg-card border border-border rounded-2xl p-4 w-full max-w-sm mb-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Créditos consumidos</span>
              <span className="text-sm font-bold text-red-400">{movimiento.monto} créditos</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Saldo restante</span>
              <span className="text-sm font-bold text-foreground">{movimiento.saldoResultante} créditos</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Tandas creadas</span>
              <span className="text-sm font-bold text-foreground">{tandas.length}</span>
            </div>
          </div>
        )}
        <button
          onClick={() => navigate("/organizador/dashboard")}
          className="w-full max-w-sm py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 transition-all"
        >
          Volver al dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md lg:max-w-2xl mx-auto">
      <div className="px-4 lg:px-0 pt-6 pb-4 border-b border-border bg-background">
        <button onClick={() => navigate("/organizador/dashboard")} className="flex items-center gap-1 text-muted-foreground text-sm mb-3 hover:text-foreground transition-colors">
          <ChevronLeft size={15} />
          Volver
        </button>
        <h2 className="text-lg lg:text-xl font-extrabold text-foreground">Crear evento</h2>
        <div className="flex items-center gap-2 mt-3">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {s}
              </div>
              {s === 1 && <div className={`h-0.5 w-20 rounded-full transition-all ${step >= 2 ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
          <div className="ml-2 flex gap-4">
            <span className={`text-xs font-semibold ${step === 1 ? "text-foreground" : "text-muted-foreground"}`}>Datos básicos</span>
            <span className={`text-xs font-semibold ${step === 2 ? "text-foreground" : "text-muted-foreground"}`}>Tandas</span>
          </div>
        </div>
      </div>

      <div className="px-4 lg:px-0 py-4 space-y-4 pb-32 md:pb-24">
        {step === 1 && (
          <>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Nombre del evento *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Festival de Jazz al Aire Libre"
                className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Descripción</label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={3}
                placeholder="Describí el evento para los compradores..."
                className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
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
                  className={`w-full px-3 py-3 bg-card border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
                    fechaEnPasado ? "border-red-500/60" : "border-border"
                  }`}
                />
                {fechaEnPasado && <p className="text-[11px] text-red-400 mt-1">La fecha no puede estar en el pasado.</p>}
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Hora *</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-3 bg-card border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Lugar / dirección *</label>
              <input
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Av. Díaz Vélez 5555, Parque Centenario, CABA"
                className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Ubicación en el mapa</label>
              <MapPicker direccion={venue} value={coords} onChange={setCoords} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">URL imagen de portada</label>
              <div className="relative">
                <ImagePlus size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={img}
                  onChange={(e) => setImg(e.target.value)}
                  placeholder="https://..."
                  className="w-full pl-9 pr-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
              {img && <img src={img} alt="preview" className="w-full h-32 object-cover rounded-xl mt-2 bg-muted" />}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-xs text-muted-foreground">Configurá las tandas de precios y sus cupos.</p>
            {tandas.map((t, i) => (
              <div key={t.id} className={`bg-card border rounded-2xl p-4 space-y-3 ${tandaErrors[i] ? "border-red-500/50" : "border-border"}`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground uppercase tracking-wider">Tanda {i + 1}</p>
                  {tandas.length > 1 && (
                    <button onClick={() => removeTanda(t.id)} className="text-muted-foreground hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Nombre *</label>
                  <input
                    value={t.nombre}
                    onChange={(e) => updateTanda(t.id, "nombre", e.target.value)}
                    placeholder="Anticipada 1"
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Precio *</label>
                    <input
                      value={t.precio}
                      onChange={(e) => updateTanda(t.id, "precio", e.target.value)}
                      placeholder="12000"
                      inputMode="numeric"
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Cupo *</label>
                    <input
                      value={t.cupoMaximo}
                      onChange={(e) => updateTanda(t.id, "cupoMaximo", e.target.value)}
                      placeholder="200"
                      inputMode="numeric"
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
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
                      onChange={(e) => updateTanda(t.id, "desde", e.target.value)}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Venta hasta</label>
                    <input
                      type="date"
                      value={t.hasta}
                      max={date || undefined}
                      onChange={(e) => updateTanda(t.id, "hasta", e.target.value)}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Si dejás las fechas vacías, la tanda se vende desde que publicás hasta que empieza el evento.
                </p>
                {tandaErrors[i] && (
                  <p className="text-[11px] text-red-400 flex items-start gap-1">
                    <AlertCircle size={12} className="flex-none mt-0.5" />
                    {tandaErrors[i]}
                  </p>
                )}
              </div>
            ))}
            <button
              onClick={addTanda}
              className="w-full py-3 rounded-2xl border border-dashed border-border text-muted-foreground text-sm flex items-center justify-center gap-2 hover:border-primary/50 hover:text-foreground transition-all"
            >
              <Plus size={15} />
              Agregar tanda
            </button>
            {sinCreditos ? (
              <div className="bg-destructive/10 border border-destructive/30 rounded-2xl px-4 py-3 flex gap-3">
                <AlertCircle size={16} className="text-destructive flex-none mt-0.5" />
                <div className="text-xs">
                  <p className="text-foreground font-semibold">No te alcanzan los créditos para publicar.</p>
                  <p className="text-muted-foreground mt-0.5">
                    Publicar consume al menos 1 crédito y tu saldo es {saldo}.{" "}
                    <button
                      type="button"
                      onClick={() => navigate("/organizador/creditos")}
                      className="text-primary font-semibold underline"
                    >
                      Comprar créditos
                    </button>
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-primary/10 border border-primary/20 rounded-2xl px-4 py-3 flex gap-3">
                <CircleDollarSign size={16} className="text-primary flex-none mt-0.5" />
                <p className="text-xs text-foreground">
                  Publicar consume 1 crédito.{saldo !== null && ` Tenés ${saldo} disponible${saldo === 1 ? "" : "s"}.`}
                </p>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-sm p-4 flex gap-2">
            <AlertCircle size={15} className="flex-none mt-0.5" />
            {error}
          </div>
        )}
      </div>

      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 md:left-56 border-t border-border bg-background/90 backdrop-blur-md px-4 py-4">
        <div className="max-w-md lg:max-w-2xl mx-auto">
          {step === 1 ? (
            <button
              disabled={!step1Valid || loading}
              onClick={handleNext}
              className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
                step1Valid && !loading ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              {loading ? "Guardando..." : "Siguiente: configurar tandas"} <ChevronRight size={18} />
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-none py-4 px-5 rounded-2xl bg-card border border-border text-foreground font-semibold text-sm hover:bg-muted transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={!step2Valid || loading}
                onClick={handlePublicar}
                className={`flex-1 py-4 rounded-2xl font-bold text-sm transition-all ${
                  step2Valid && !loading ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.015] active:scale-[0.98]" : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                {loading ? "Publicando..." : "Publicar evento"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
