import { useEffect, useState } from "react";
import { CreditCard, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { fmt } from "../../lib/format";
import type {
  CompraCreditoResponseDTO,
  EstadoTransaccion,
  IniciarCompraCreditoResponseDTO,
  MovimientoCreditoResponseDTO,
  PaqueteCreditoDisponibleDTO,
} from "../../lib/types";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

const TIPO_LABEL: Record<string, string> = {
  Bienvenida: "Créditos de bienvenida",
  Recarga: "Recarga de créditos",
  Consumo_Publicacion: "Publicación de evento",
  Consumo_Tanda: "Entradas de tanda",
  Devolucion_Tanda: "Devolución de tanda",
};

const ESTADO_COMPRA_BADGE: Record<EstadoTransaccion, string> = {
  Pendiente: "bg-amber-400/15 text-amber-400",
  Aprobada: "bg-emerald-400/15 text-emerald-400",
  Rechazada: "bg-red-400/15 text-red-400",
  Expirada: "bg-muted text-muted-foreground",
  Reembolsada: "bg-blue-400/15 text-blue-400",
};

export function OrganizadorWalletPage() {
  useDocumentTitle("Créditos");
  const { session } = useAuth();
  const [historial, setHistorial] = useState<MovimientoCreditoResponseDTO[] | null>(null);
  const [compras, setCompras] = useState<CompraCreditoResponseDTO[] | null>(null);
  const [paquetes, setPaquetes] = useState<PaqueteCreditoDisponibleDTO[] | null>(null);
  const [selectedPack, setSelectedPack] = useState<number | null>(null);
  const [comprando, setComprando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vistaHistorial, setVistaHistorial] = useState<"movimientos" | "compras">("movimientos");

  function cargar() {
    Promise.all([
      api.get<MovimientoCreditoResponseDTO[]>("/creditos/historial"),
      api.get<CompraCreditoResponseDTO[]>("/creditos/compras"),
      api.get<PaqueteCreditoDisponibleDTO[]>("/creditos/paquetes"),
    ])
      .then(([h, c, p]) => {
        setHistorial(h);
        setCompras(c);
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
      // Redirección real a Checkout Pro — el pago se confirma por el webhook de
      // MercadoPago, no acá. MercadoPago vuelve a /pago/resultado cuando termina.
      window.location.href = orden.urlPago;
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "No pudimos procesar la compra.");
      setComprando(false);
    }
  }

  const saldo = historial?.[0]?.saldoResultante ?? 0;

  return (
    <div className="max-w-md lg:max-w-[1800px] mx-auto">
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
              <p className="text-primary-foreground/70 text-xs uppercase tracking-widest font-semibold relative">Saldo disponible</p>
              <p className="text-4xl font-extrabold text-primary-foreground mt-1 relative">
                {saldo} <span className="text-xl font-semibold text-primary-foreground/70">créditos</span>
              </p>
              <p className="text-primary-foreground/60 text-xs mt-2 relative">
                {session?.nombre} · {session?.email}
              </p>
              <div className="mt-4 relative">
                <div className="bg-primary-foreground/20 rounded-full px-3 py-1 text-xs font-semibold text-primary-foreground inline-flex items-center gap-1.5">
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
                        className="mt-3 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
          <div className="flex items-center gap-1 mb-3 bg-muted rounded-xl p-1 w-fit">
            <button
              onClick={() => setVistaHistorial("movimientos")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                vistaHistorial === "movimientos" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Movimientos
            </button>
            <button
              onClick={() => setVistaHistorial("compras")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                vistaHistorial === "compras" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mis compras
            </button>
          </div>

          {vistaHistorial === "movimientos" ? (
            historial === null ? (
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
            )
          ) : compras === null ? (
            <div className="h-40 rounded-2xl bg-card border border-border animate-pulse" />
          ) : compras.length === 0 ? (
            <p className="text-xs text-muted-foreground">Todavía no compraste créditos.</p>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {compras.map((c, i) => (
                // Compras de antes de MercadoPago no tienen external_reference (columna agregada
                // después): el índice evita colisiones de key cuando varias comparten null.
                <div key={c.externalReference ?? `sin-ref-${i}`} className={`px-4 py-3 flex items-center justify-between gap-3 ${i < compras.length - 1 ? "border-b border-border" : ""}`}>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground leading-tight truncate">
                      {c.nombrePaquete}
                      {c.cantidadCreditos != null && ` · ${c.cantidadCreditos} créditos`}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(c.fechaTransaccion).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })} · {fmt(c.monto)}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-none ${ESTADO_COMPRA_BADGE[c.estado]}`}>{c.estado}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
