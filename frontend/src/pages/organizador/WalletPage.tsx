import { useEffect, useState } from "react";
import { CreditCard, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { fmt } from "../../lib/format";
import type {
  IniciarCompraCreditoResponseDTO,
  MovimientoCreditoResponseDTO,
  PaqueteCreditoDisponibleDTO,
} from "../../lib/types";

const TIPO_LABEL: Record<string, string> = {
  Bienvenida: "Créditos de bienvenida",
  Recarga: "Recarga de créditos",
  Consumo_Publicacion: "Publicación de evento",
};

export function OrganizadorWalletPage() {
  const { session } = useAuth();
  const [historial, setHistorial] = useState<MovimientoCreditoResponseDTO[] | null>(null);
  const [paquetes, setPaquetes] = useState<PaqueteCreditoDisponibleDTO[] | null>(null);
  const [selectedPack, setSelectedPack] = useState<number | null>(null);
  const [comprando, setComprando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cargar() {
    Promise.all([
      api.get<MovimientoCreditoResponseDTO[]>("/creditos/historial"),
      api.get<PaqueteCreditoDisponibleDTO[]>("/creditos/paquetes"),
    ])
      .then(([h, p]) => {
        setHistorial(h);
        setPaquetes(p);
      })
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "No pudimos cargar tu billetera."));
  }

  useEffect(cargar, []);

  async function handleComprar(idPaquete: number) {
    setComprando(true);
    setError(null);
    try {
      const orden = await api.post<IniciarCompraCreditoResponseDTO>("/creditos/comprar", { idPaquete });
      await api.post("/creditos/webhook/pago", { transaccionId: orden.ordenId, paymentId: Date.now() });
      setSelectedPack(null);
      cargar();
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "No pudimos procesar la compra.");
    } finally {
      setComprando(false);
    }
  }

  const saldo = historial?.[0]?.saldoResultante ?? 0;

  return (
    <div className="max-w-md lg:max-w-5xl mx-auto">
      <div className="px-4 lg:px-8 pt-6 pb-4 border-b border-border bg-background">
        <h2 className="text-lg lg:text-xl font-extrabold text-foreground">Billetera de créditos</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Recargá para publicar nuevos eventos</p>
      </div>

      <div className="px-4 lg:px-8 py-4 lg:py-6 pb-8 lg:grid lg:grid-cols-[1.4fr_1fr] lg:gap-6 lg:items-start">
        <div className="space-y-5">
          {error && <div className="rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-sm p-4">{error}</div>}

          {historial === null ? (
            <div className="h-32 rounded-3xl bg-card border border-border animate-pulse" />
          ) : (
            <div className="relative overflow-hidden rounded-3xl bg-primary p-5">
              <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
              <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-white/5" />
              <p className="text-white/70 text-xs uppercase tracking-widest font-semibold relative">Saldo disponible</p>
              <p className="text-4xl font-extrabold text-white mt-1 relative">
                {saldo} <span className="text-xl font-semibold text-white/70">créditos</span>
              </p>
              <p className="text-white/60 text-xs mt-2 relative">
                {session?.nombre} · {session?.email}
              </p>
              <div className="mt-4 relative">
                <div className="bg-white/20 rounded-full px-3 py-1 text-xs font-semibold text-white inline-flex items-center gap-1.5">
                  <CreditCard size={11} />
                  Sin comisiones por venta
                </div>
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Comprar créditos</p>
            {paquetes === null ? (
              <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
                {[0, 1].map((i) => (
                  <div key={i} className="h-20 rounded-2xl bg-card border border-border animate-pulse" />
                ))}
              </div>
            ) : paquetes.length === 0 ? (
              <p className="text-xs text-muted-foreground">No hay paquetes de crédito disponibles por ahora.</p>
            ) : (
              <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0 lg:items-start">
                {paquetes.map((pack) => (
                  <div
                    key={pack.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedPack(pack.id === selectedPack ? null : pack.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setSelectedPack(pack.id === selectedPack ? null : pack.id);
                    }}
                    className={`w-full text-left rounded-2xl border p-4 transition-all relative cursor-pointer ${
                      selectedPack === pack.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-extrabold text-foreground">{pack.cantidadCreditos} créditos</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Pack {pack.nombre}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-extrabold text-foreground">{fmt(pack.precio)}</p>
                        <p className="text-[10px] text-muted-foreground">{fmt(Math.round(pack.precio / pack.cantidadCreditos))}/cr</p>
                      </div>
                    </div>
                    {selectedPack === pack.id && (
                      <button
                        disabled={comprando}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleComprar(pack.id);
                        }}
                        className="mt-3 w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {comprando ? "Procesando..." : "Pagar con MercadoPago"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 lg:mt-0">
          <p className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Historial</p>
          {historial === null ? (
            <div className="h-40 rounded-2xl bg-card border border-border animate-pulse" />
          ) : historial.length === 0 ? (
            <p className="text-xs text-muted-foreground">Todavía no hay movimientos.</p>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {historial.map((tx, i) => {
                const esCredito = tx.monto > 0;
                return (
                  <div key={tx.id} className={`px-4 py-3 flex items-center justify-between ${i < historial.length - 1 ? "border-b border-border" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-none ${esCredito ? "bg-emerald-400/15" : "bg-red-400/10"}`}>
                        {esCredito ? <ArrowDownLeft size={13} className="text-emerald-400" /> : <ArrowUpRight size={13} className="text-red-400" />}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground leading-tight">{TIPO_LABEL[tx.tipoMovimiento] ?? tx.tipoMovimiento}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(tx.fechaMovimiento).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${esCredito ? "text-emerald-400" : "text-red-400"}`}>
                      {tx.monto > 0 ? "+" : ""}
                      {tx.monto} cr
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
