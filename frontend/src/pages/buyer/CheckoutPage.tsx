import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ChevronLeft } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { fmt } from "../../lib/format";
import type { EntradaResponseDTO, EventoPublicoDetalleDTO, IniciarCompraResponseDTO, TandaResponseDTO } from "../../lib/types";

interface CheckoutState {
  evento: EventoPublicoDetalleDTO;
  tanda: TandaResponseDTO;
  qty: number;
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as CheckoutState | null;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!state) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <p className="text-sm text-muted-foreground">No hay ninguna compra en curso.</p>
        <button onClick={() => navigate("/")} className="text-primary text-sm font-semibold">
          Volver al inicio
        </button>
      </div>
    );
  }

  const { evento, tanda, qty } = state;
  const total = tanda.precio * qty;
  const valid = name.trim().length > 1 && email.length > 4 && email.includes("@");

  async function handleConfirm() {
    setLoading(true);
    setError(null);

    // El backend genera una Entrada (con su propio QR) por cada compra —
    // "qty" entradas significa qty llamadas secuenciales, cada una es un
    // acceso individual y escaneable por separado en la puerta (CU-018).
    const entradas: EntradaResponseDTO[] = [];
    try {
      for (let i = 0; i < qty; i++) {
        const orden = await api.post<IniciarCompraResponseDTO>(
          "/tickets/comprar-online",
          { idTanda: tanda.id, nombreComprador: name, emailComprador: email },
          { skipAuth: true },
        );
        const entrada = await api.post<EntradaResponseDTO>(
          "/tickets/webhook/pago",
          { ordenId: orden.ordenId, paymentId: Date.now() + i },
          { skipAuth: true },
        );
        entradas.push(entrada);
      }
      navigate(`/ticket/${entradas[0].id}`, { state: { entradas, evento, buyerName: name } });
    } catch (e: unknown) {
      if (entradas.length > 0) {
        // Se compraron algunas entradas antes de que fallara el resto (ej. la tanda se agotó a mitad de camino).
        navigate(`/ticket/${entradas[0].id}`, { state: { entradas, evento, buyerName: name } });
        return;
      }
      setError(e instanceof ApiError ? e.message : "No pudimos procesar la compra. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto">
        <div className="px-4 pt-6 pb-3 border-b border-border bg-background sticky top-0">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-muted-foreground text-sm mb-3 hover:text-foreground transition-colors"
          >
            <ChevronLeft size={15} />
            Volver
          </button>
          <h2 className="text-lg font-extrabold text-foreground">Finalizar compra</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Sin registro. Solo tu nombre y email.</p>
        </div>

        <div className="px-4 py-4 space-y-5 pb-32">
          <div className="bg-card rounded-2xl p-4 border border-border">
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Resumen</p>
            <div className="flex gap-3">
              {evento.imagenPortadaUrl ? (
                <img src={evento.imagenPortadaUrl} alt={evento.nombre} className="w-16 h-16 rounded-xl object-cover flex-none bg-muted" />
              ) : (
                <div className="w-16 h-16 rounded-xl flex-none bg-muted" />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-foreground leading-tight line-clamp-2">{evento.nombre}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{tanda.nombre}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <span className="text-sm text-muted-foreground">
                {qty} entrada{qty > 1 ? "s" : ""} × {fmt(tanda.precio)}
              </span>
              <span className="text-base font-extrabold text-foreground">{fmt(total)}</span>
            </div>
          </div>

          <div>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Tus datos</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Nombre completo</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="María García"
                  className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="maria@ejemplo.com"
                  className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
                <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                  <span className="text-green-400 font-bold">✓</span> Recibís la entrada en este email.
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Método de pago</p>
            <div className="p-3.5 rounded-xl border border-primary bg-primary/10">
              <span className="text-xl block mb-1.5">🔵</span>
              <p className="text-xs font-bold text-foreground">MercadoPago</p>
              <p className="text-[11px] text-muted-foreground">Único método disponible por ahora</p>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-sm p-4">{error}</div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/90 backdrop-blur-md px-4 py-4">
        <div className="max-w-md mx-auto">
          <button
            disabled={!valid || loading}
            onClick={handleConfirm}
            className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
              valid && !loading
                ? "bg-primary text-white hover:bg-primary/90 active:scale-[0.98]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {loading ? "Procesando..." : `Confirmar compra · ${fmt(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
