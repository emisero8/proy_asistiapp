import { useEffect, useState } from "react";
import { ChevronDown, Copy, LogOut, Minus, Plus, QrCode, RotateCcw, Share2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, API_BASE_URL } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { fmt } from "../../lib/format";
import type {
  DisponibilidadCompradorResponseDTO,
  EntradaResponseDTO,
  EventoResponseDTO,
  TandaResponseDTO,
  VentaManualRequestDTO,
} from "../../lib/types";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

/** Link público (sin login) donde el comprador ve su entrada y el QR — para que el vendedor se lo pueda mandar. */
function linkEntrada(codigoQr: string) {
  return `${window.location.origin}/mi-entrada?codigoQr=${encodeURIComponent(codigoQr)}`;
}

async function copiarAlPortapapeles(texto: string, mensajeOk: string) {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success(mensajeOk);
  } catch {
    toast.error("No pudimos copiar el enlace. Copialo a mano.");
  }
}

export function StaffPosPage() {
  useDocumentTitle("Punto de venta");
  const { session, logout } = useAuth();

  const [eventos, setEventos] = useState<EventoResponseDTO[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [evento, setEvento] = useState<EventoResponseDTO | null>(null);
  const [tanda, setTanda] = useState<TandaResponseDTO | null>(null);
  const [qty, setQty] = useState(1);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");

  const [selling, setSelling] = useState(false);
  const [sellError, setSellError] = useState<string | null>(null);
  const [entradas, setEntradas] = useState<EntradaResponseDTO[]>([]);
  const [soldToday, setSoldToday] = useState(0);

  // Tope de entradas por comprador (CU-019): se re-consulta por evento y, con debounce,
  // cada vez que cambia el mail — así el selector de cantidad nunca deja armar una venta
  // que el backend vaya a rechazar a mitad de camino.
  const [disponibilidad, setDisponibilidad] = useState<DisponibilidadCompradorResponseDTO | null>(null);

  useEffect(() => {
    api
      .get<EventoResponseDTO[]>("/eventos/vendedor")
      .then((data) => {
        setEventos(data);
        if (data.length > 0) {
          setEvento(data[0]);
          setTanda(data[0].tandas[0] ?? null);
        }
      })
      .catch((e: unknown) => setLoadError(e instanceof ApiError ? e.message : "No pudimos cargar los eventos."));
  }, []);

  function selectEvento(e: EventoResponseDTO) {
    setEvento(e);
    setTanda(e.tandas[0] ?? null);
  }

  useEffect(() => {
    if (!evento) return;
    const email = buyerEmail.trim();
    const handle = setTimeout(() => {
      const params = new URLSearchParams({ idEvento: String(evento.id) });
      if (email) params.set("email", email);
      api
        .get<DisponibilidadCompradorResponseDTO>(`/tickets/disponibilidad-comprador?${params}`)
        .then((d) => {
          setDisponibilidad(d);
          setQty((q) => Math.min(q, Math.max(1, d.disponible)));
        })
        .catch(() => setDisponibilidad(null));
    }, 300);
    return () => clearTimeout(handle);
  }, [evento, buyerEmail]);

  const cupoMaximoVenta = Math.min(tanda?.cupoDisponible ?? 1, disponibilidad?.disponible ?? Infinity);

  async function handleGenerate() {
    if (!tanda) return;
    setSelling(true);
    setSellError(null);

    // El backend genera una Entrada por llamada — igual que en la compra online,
    // "vender qty entradas" son qty llamadas secuenciales a venta-manual.
    const nuevas: EntradaResponseDTO[] = [];
    try {
      for (let i = 0; i < qty; i++) {
        const entrada = await api.post<EntradaResponseDTO>("/tickets/venta-manual", {
          idTanda: tanda.id,
          nombreComprador: buyerName,
          emailComprador: buyerEmail,
        } satisfies VentaManualRequestDTO);
        nuevas.push(entrada);
      }
      setEntradas(nuevas);
      setSoldToday((c) => c + nuevas.length);
    } catch (e: unknown) {
      if (nuevas.length > 0) {
        setEntradas(nuevas);
        setSoldToday((c) => c + nuevas.length);
      }
      setSellError(e instanceof ApiError ? e.message : "No pudimos registrar la venta. Intentá de nuevo.");
    } finally {
      setSelling(false);
    }
  }

  function handleReset() {
    setEntradas([]);
    setSellError(null);
    setBuyerName("");
    setBuyerEmail("");
    setQty(1);
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background p-8 text-center">
        <p className="text-sm text-destructive">{loadError}</p>
        <button onClick={logout} className="text-primary text-sm font-semibold">
          Cerrar sesión
        </button>
      </div>
    );
  }

  if (!eventos) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">Cargando…</div>;
  }

  if (eventos.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background p-8 text-center">
        <p className="text-sm text-muted-foreground">Tu organizador todavía no tiene eventos publicados para vender.</p>
        <button onClick={logout} className="text-primary text-sm font-semibold">
          Cerrar sesión
        </button>
      </div>
    );
  }

  if (entradas.length > 0 && evento && tanda) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto flex flex-col min-h-screen">
          <div className="flex-none px-4 lg:px-0 pt-14 lg:pt-10 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                <QrCode size={16} className="text-green-400" />
              </div>
              <div>
                <h2 className="text-base lg:text-lg font-extrabold text-foreground">¡Entrada{entradas.length > 1 ? "s" : ""} generada{entradas.length > 1 ? "s" : ""}!</h2>
                <p className="text-xs text-muted-foreground">
                  {entradas.length} entrada{entradas.length > 1 ? "s" : ""} · {tanda.nombre}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 lg:px-0 py-4 lg:py-6 space-y-4">
            {sellError && <div className="rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-sm p-4">{sellError}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {entradas.map((entrada, i) => (
                <div key={entrada.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-4 py-4 border-b border-border space-y-2.5">
                    {[
                      ["Evento", evento.nombre],
                      ["Tanda", entrada.nombreTanda],
                      ["Titular", entrada.nombreComprador || "Sin nombre"],
                      ["Entrada", `${i + 1} de ${entradas.length}`],
                      ["Total", fmt(entrada.precioTanda)],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <span className="text-xs font-semibold text-foreground text-right max-w-[55%] truncate">{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-5 flex flex-col items-center">
                    <p className="text-[10px] text-muted-foreground tracking-widest uppercase mb-4">QR de acceso</p>
                    <div className="bg-white p-3 rounded-2xl shadow-xl shadow-black/30">
                      <img
                        src={`${API_BASE_URL}/tickets/${entrada.id}/qr-image?codigoQr=${encodeURIComponent(entrada.codigoQr)}`}
                        alt={`QR de la entrada ${entrada.codigoQr}`}
                        width={160}
                        height={160}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 font-mono tracking-wider">{entrada.codigoQr}</p>
                    <div className="w-full flex gap-2 mt-4">
                      <button
                        onClick={() => copiarAlPortapapeles(linkEntrada(entrada.codigoQr), "Enlace copiado")}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-muted text-foreground text-xs font-semibold hover:bg-muted/70 transition-colors"
                      >
                        <Copy size={13} />
                        Copiar enlace
                      </button>
                      {typeof navigator.share === "function" && (
                        <button
                          onClick={() =>
                            navigator
                              .share({
                                title: `Entrada — ${evento.nombre}`,
                                text: `Tu entrada para ${evento.nombre}`,
                                url: linkEntrada(entrada.codigoQr),
                              })
                              .catch(() => {})
                          }
                          aria-label="Compartir entrada"
                          className="w-10 flex-none flex items-center justify-center rounded-xl bg-muted text-foreground hover:bg-muted/70 transition-colors"
                        >
                          <Share2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {entradas.length > 1 && (
                <button
                  onClick={() =>
                    copiarAlPortapapeles(
                      entradas.map((e) => linkEntrada(e.codigoQr)).join("\n"),
                      `${entradas.length} enlaces copiados`,
                    )
                  }
                  className="w-full sm:w-auto sm:px-8 py-3.5 rounded-2xl bg-card border border-border text-foreground font-semibold text-sm hover:bg-muted transition-colors flex items-center justify-center gap-2"
                >
                  <Copy size={15} />
                  Copiar los {entradas.length} enlaces
                </button>
              )}
              <button
                onClick={handleReset}
                className="w-full sm:w-auto sm:px-8 py-3.5 rounded-2xl bg-card border border-border text-foreground font-semibold text-sm hover:bg-muted transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw size={15} />
                Nueva venta
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const total = (tanda?.precio ?? 0) * qty;
  const valid =
    !!tanda &&
    tanda.cupoDisponible > 0 &&
    cupoMaximoVenta > 0 &&
    qty <= cupoMaximoVenta &&
    buyerName.trim().length > 1 &&
    buyerEmail.includes("@");

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 lg:px-8 pt-14 lg:pt-8 pb-3 border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Punto de Venta</p>
            <h2 className="text-base lg:text-lg font-extrabold text-foreground">{session?.nombre}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Vendidas hoy</p>
              <p className="text-sm font-extrabold text-primary">{soldToday}</p>
            </div>
            <button onClick={logout} aria-label="Cerrar sesión" className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto lg:flex lg:gap-8 lg:px-8 lg:py-8 lg:items-start">
        <div className="lg:flex-1 lg:min-w-0 px-4 lg:px-0 py-4 lg:py-0 space-y-4 pb-40 lg:pb-0">
          {eventos.length > 1 && (
            <div>
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase mb-2">Evento</p>
              <div className="relative">
                <select
                  value={evento?.id ?? ""}
                  onChange={(e) => {
                    const next = eventos.find((ev) => ev.id === Number(e.target.value));
                    if (next) selectEvento(next);
                  }}
                  className="w-full appearance-none px-4 py-3 pr-10 bg-card border border-border rounded-xl text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                >
                  {eventos.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
              {evento && <p className="text-[11px] text-muted-foreground mt-1.5 px-1">{evento.lugar}</p>}
            </div>
          )}

          {eventos.length === 1 && evento && (
            <div>
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase mb-1">Evento</p>
              <p className="text-sm font-semibold text-foreground">{evento.nombre}</p>
              <p className="text-[11px] text-muted-foreground">{evento.lugar}</p>
            </div>
          )}

          <div>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase mb-2">Tanda</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {evento?.tandas.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTanda(t)}
                  disabled={t.cupoDisponible === 0}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed ${tanda?.id === t.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex-none ${tanda?.id === t.id ? "border-primary bg-primary" : "border-muted-foreground"}`} />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.nombre}</p>
                      <p className="text-[10px] text-muted-foreground">{t.cupoDisponible === 0 ? "Agotada" : `${t.cupoDisponible} disp.`}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-accent">{fmt(t.precio)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:max-w-xs">
            <div className="flex items-center justify-between bg-card rounded-xl px-4 py-3.5 border border-border">
              <span className="text-sm font-semibold text-foreground">Cantidad</span>
              <div className="flex items-center gap-4">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Quitar una entrada" className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors">
                  <Minus size={13} />
                </button>
                <span className="text-lg font-bold text-foreground w-4 text-center">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(cupoMaximoVenta, q + 1))}
                  disabled={qty >= cupoMaximoVenta}
                  aria-label="Agregar una entrada"
                  className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
            {disponibilidad && (
              <p className="text-[11px] text-muted-foreground mt-1.5 px-1">
                {disponibilidad.yaCompradas > 0
                  ? `Este comprador ya tiene ${disponibilidad.yaCompradas} — podés vender hasta ${disponibilidad.disponible} más (tope: ${disponibilidad.limite}).`
                  : `Máximo ${disponibilidad.limite} entradas por persona para este evento.`}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
            <div>
              <label className="text-[10px] text-muted-foreground tracking-widest uppercase block mb-2">Titular</label>
              <input
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Nombre del comprador..."
                className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground tracking-widest uppercase block mb-2">Email (recibe la entrada)</label>
              <input
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                placeholder="comprador@ejemplo.com"
                className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          </div>

          {sellError && <div className="rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-sm p-4">{sellError}</div>}
        </div>

        {/* Resumen + generar — sticky en desktop */}
        <div className="hidden lg:block lg:w-80 lg:flex-none lg:sticky lg:top-28">
          <div className="bg-card rounded-2xl p-4 border border-border">
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Resumen</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {qty} × {tanda?.nombre ?? "—"}
              </span>
              <span className="text-base font-extrabold text-foreground">{fmt(total)}</span>
            </div>
            <button
              disabled={!valid || selling}
              onClick={handleGenerate}
              className={`mt-4 w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 ${
                valid && !selling ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.015] active:scale-[0.98]" : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              <QrCode size={18} />
              {selling ? "Generando..." : "Generar entrada"}
            </button>
          </div>
        </div>
      </div>

      {/* Resumen + generar fijos — mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background/90 backdrop-blur-md px-4 py-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground">
              {qty} × {tanda?.nombre ?? "—"}
            </span>
            <span className="text-base font-extrabold text-foreground">{fmt(total)}</span>
          </div>
          <button
            disabled={!valid || selling}
            onClick={handleGenerate}
            className={`w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 ${
              valid && !selling ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.015] active:scale-[0.98]" : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            <QrCode size={18} />
            {selling ? "Generando..." : "Generar entrada"}
          </button>
        </div>
      </div>
    </div>
  );
}
