import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ReceiptText, Wallet } from "lucide-react";
import { Alert, Button, Card, EmptyState, ErrorState, PageHeader, RadioCardGroup, Skeleton, StatusBadge } from "../../components/ui";
import { api, ApiError } from "../../lib/api";
import { cn } from "../../lib/cn";
import { fmt } from "../../lib/format";
import type {
  CompraCreditoResponseDTO,
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

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

export function OrganizadorWalletPage() {
  useDocumentTitle("Créditos");
  const [historial, setHistorial] = useState<MovimientoCreditoResponseDTO[] | null>(null);
  const [compras, setCompras] = useState<CompraCreditoResponseDTO[] | null>(null);
  const [paquetes, setPaquetes] = useState<PaqueteCreditoDisponibleDTO[] | null>(null);
  const [selectedPack, setSelectedPack] = useState<number | null>(null);
  const [comprando, setComprando] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [errorCompra, setErrorCompra] = useState<string | null>(null);
  const [vistaHistorial, setVistaHistorial] = useState<"movimientos" | "compras">("movimientos");

  function cargar() {
    setErrorCarga(null);
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
      .catch((e: unknown) => setErrorCarga(e instanceof ApiError ? e.message : "No pudimos cargar tu billetera."));
  }

  useEffect(cargar, []);

  async function handleComprar() {
    if (selectedPack === null) return;
    setComprando(true);
    setErrorCompra(null);
    try {
      const orden = await api.post<IniciarCompraCreditoResponseDTO>("/creditos/comprar", { idPaquete: selectedPack });
      // Redirección real a Checkout Pro — el pago se confirma por el webhook de
      // MercadoPago, no acá. MercadoPago vuelve a /pago/resultado cuando termina.
      window.location.href = orden.urlPago;
    } catch (e: unknown) {
      setErrorCompra(e instanceof ApiError ? e.message : "No pudimos procesar la compra.");
      setComprando(false);
    }
  }

  const saldo = historial?.[0]?.saldoResultante ?? 0;
  const paqueteElegido = paquetes?.find((p) => p.id === selectedPack) ?? null;

  if (errorCarga && historial === null) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 lg:px-8 lg:py-8">
        <ErrorState title="No pudimos cargar tu billetera" description={errorCarga} onRetry={cargar} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <PageHeader title="Créditos" description="Publicar un evento y habilitar sus entradas consume créditos. Recargá cuando lo necesites." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-6">
          {/* Saldo */}
          {historial === null ? (
            <Skeleton className="h-32 rounded-2xl" />
          ) : (
            <section aria-label="Saldo" className="rounded-3xl bg-primary p-5 text-primary-foreground shadow-hard md:p-6">
              <p className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground/75">
                {/* Tile carbón fijo en ambos temas: en oscuro el hero pasa a papel y el ícono lima
                    perdía contraste; sobre carbón se lee nítido siempre. */}
                <span aria-hidden="true" className="flex size-5 flex-none items-center justify-center rounded-md bg-[#141311] text-accent">
                  <Wallet size={12} />
                </span>
                Saldo disponible
              </p>
              <p className="mt-2 font-display text-4xl font-extrabold tabular-nums">
                {saldo} <span className="text-lg font-semibold text-primary-foreground/75">créditos</span>
              </p>
              <p className="mt-3 text-xs text-primary-foreground/75">Sin comisiones por venta: vos cobrás el total de cada entrada.</p>
            </section>
          )}

          {/* Comprar */}
          <Card as="section" aria-labelledby="comprar-titulo" className="space-y-4">
            <h2 id="comprar-titulo" className="font-display text-base font-bold tracking-tight text-foreground">
              Comprar créditos
            </h2>
            {paquetes === null ? (
              <div className="grid gap-3 sm:grid-cols-2" aria-busy="true">
                {[0, 1].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : paquetes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay paquetes de crédito disponibles por ahora.</p>
            ) : (
              <>
                <RadioCardGroup<number>
                  label="Paquetes de créditos"
                  labelHidden
                  value={selectedPack}
                  onChange={setSelectedPack}
                  columns={2}
                  options={paquetes.map((pack) => ({
                    value: pack.id,
                    label: `${pack.cantidadCreditos} créditos`,
                    description: `Pack ${pack.nombre} · ${fmt(Math.round(pack.precio / pack.cantidadCreditos))} por crédito`,
                    aside: <span className="text-base font-extrabold tabular-nums text-foreground">{fmt(pack.precio)}</span>,
                  }))}
                />
                {errorCompra && <Alert tone="danger">{errorCompra}</Alert>}
                <Button block size="lg" disabled={selectedPack === null} loading={comprando} loadingText="Te llevamos a MercadoPago…" onClick={handleComprar}>
                  {paqueteElegido ? `Pagar ${fmt(paqueteElegido.precio)} con MercadoPago` : "Elegí un paquete"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">El pago se hace en MercadoPago. Los créditos se acreditan cuando se confirma.</p>
              </>
            )}
          </Card>
        </div>

        {/* Historial */}
        <Card as="section" padding="none" aria-labelledby="historial-titulo" className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 md:p-5">
            <h2 id="historial-titulo" className="font-display text-base font-bold tracking-tight text-foreground">
              Historial
            </h2>
            <div role="group" aria-label="Ver" className="inline-flex rounded-xl bg-muted p-1">
              {(
                [
                  { id: "movimientos", label: "Movimientos" },
                  { id: "compras", label: "Mis compras" },
                ] as const
              ).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={vistaHistorial === v.id}
                  onClick={() => setVistaHistorial(v.id)}
                  className={cn(
                    "h-8 rounded-lg px-3 text-xs font-semibold transition-colors duration-(--duration-fast)",
                    vistaHistorial === v.id ? "bg-card text-foreground shadow-raised" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {vistaHistorial === "movimientos" ? <ListaMovimientos historial={historial} /> : <ListaCompras compras={compras} />}
        </Card>
      </div>
    </div>
  );
}

function ListaCargando() {
  return (
    <div className="space-y-2 p-4" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-11" />
      ))}
    </div>
  );
}

function ListaMovimientos({ historial }: { historial: MovimientoCreditoResponseDTO[] | null }) {
  if (historial === null) return <ListaCargando />;
  if (historial.length === 0) return <EmptyState variant="plain" icon={ArrowDownLeft} title="Todavía no hay movimientos" />;
  return (
    <ul className="divide-y divide-border">
      {historial.map((tx) => {
        const esCredito = tx.monto > 0;
        return (
          <li key={tx.id} className="flex items-center justify-between gap-3 px-4 py-3 md:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                className={cn("flex size-8 flex-none items-center justify-center rounded-full", esCredito ? "bg-success/12 text-success" : "bg-muted text-muted-foreground")}
              >
                {esCredito ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight text-foreground">{TIPO_LABEL[tx.tipoMovimiento] ?? tx.tipoMovimiento}</p>
                <p className="text-xs text-muted-foreground">
                  {fechaCorta(tx.fechaMovimiento)} · saldo {tx.saldoResultante}
                </p>
              </div>
            </div>
            <span className={cn("flex-none text-sm font-bold tabular-nums", esCredito ? "text-success" : "text-foreground")}>
              {esCredito ? "+" : ""}
              {tx.monto} cr
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ListaCompras({ compras }: { compras: CompraCreditoResponseDTO[] | null }) {
  if (compras === null) return <ListaCargando />;
  if (compras.length === 0) return <EmptyState variant="plain" icon={ReceiptText} title="Todavía no compraste créditos" />;
  return (
    <ul className="divide-y divide-border">
      {compras.map((c, i) => (
        // Compras de antes de MercadoPago no tienen external_reference (columna agregada
        // después): el índice evita colisiones de key cuando varias comparten null.
        <li key={c.externalReference ?? `sin-ref-${i}`} className="flex items-center justify-between gap-3 px-4 py-3 md:px-5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight text-foreground">
              {c.nombrePaquete}
              {c.cantidadCreditos != null && ` · ${c.cantidadCreditos} créditos`}
            </p>
            <p className="text-xs text-muted-foreground">
              {fechaCorta(c.fechaTransaccion)} · {fmt(c.monto)}
            </p>
          </div>
          <StatusBadge tipo="transaccion" estado={c.estado} size="sm" />
        </li>
      ))}
    </ul>
  );
}
