import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Calendar, Clock, MapPin, ShieldCheck, Ticket } from "lucide-react";
import { EventoImagen } from "../../components/EventoImagen";
import { BotonArrepentimiento } from "../../components/BotonArrepentimiento";
import { PublicHeader } from "../../components/PublicHeader";
import { MapView } from "../../components/EventMap";
import { Alert, Button, EmptyState, ErrorState, QuantityStepper, RadioCardGroup, Skeleton, StickyActionBar } from "../../components/ui";
import { api, ApiError } from "../../lib/api";
import { cn } from "../../lib/cn";
import { desglosePedido } from "../../lib/comisionesMp";
import { fmt, formatFecha, formatHora } from "../../lib/format";
import { estadoVentaTanda, mensajeSinVenta, ventanaVentaTexto } from "../../lib/tandas";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import type { EventoPublicoDetalleDTO } from "../../lib/types";

export function DetailPage() {
  const { urlPublica } = useParams<{ urlPublica: string }>();
  const navigate = useNavigate();
  const [evento, setEvento] = useState<EventoPublicoDetalleDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selId, setSelId] = useState<number | null>(null);
  const [qty, setQty] = useState(1);

  useDocumentTitle(evento?.nombre);

  const cargar = useCallback(() => {
    if (!urlPublica) return;
    setError(null);
    api
      .get<EventoPublicoDetalleDTO>(`/public/eventos/${urlPublica}`, { skipAuth: true })
      .then((data) => {
        setEvento(data);
        // Arranca elegida la primera tanda realmente comprable (dentro de su ventana de venta y
        // con cupo): antes se elegía la primera aunque estuviera agotada/fuera de fecha, y el
        // botón de compra quedaba deshabilitado sin explicar por qué.
        setSelId((data.tandas.find((t) => estadoVentaTanda(t) === "abierta") ?? data.tandas[0])?.id ?? null);
      })
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "No pudimos cargar el evento."));
  }, [urlPublica]);

  useEffect(cargar, [cargar]);

  if (error) {
    return (
      <div className="min-h-dvh bg-background">
        <PublicHeader back="historial" />
        <div className="mx-auto max-w-md px-4 py-16">
          <ErrorState
            title="No pudimos mostrar este evento"
            description={error}
            onRetry={cargar}
            secondaryAction={
              <Button variant="ghost" size="sm" onClick={() => navigate("/eventos")}>
                Ver otros eventos
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="min-h-dvh bg-background" aria-busy="true">
        <PublicHeader back="historial" />
        <span className="sr-only">Cargando evento…</span>
        <div className="mx-auto max-w-6xl px-4 py-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10 lg:px-8 lg:py-10">
          <div className="space-y-4">
            <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
          <Skeleton className="mt-6 hidden h-48 rounded-2xl lg:mt-0 lg:block" />
        </div>
      </div>
    );
  }

  // Un evento sin tandas cargadas no tiene nada para vender: antes `!sel` lo dejaba en el
  // skeleton de carga para siempre.
  if (evento.tandas.length === 0) {
    return (
      <div className="min-h-dvh bg-background">
        <PublicHeader back="historial" />
        <div className="mx-auto max-w-md px-4 py-16">
          <EmptyState
            icon={Ticket}
            title={evento.nombre}
            description="Este evento todavía no tiene entradas a la venta."
            action={
              <Button variant="secondary" onClick={() => navigate("/eventos")}>
                Ver otros eventos
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const sel = evento.tandas.find((t) => t.id === selId) ?? evento.tandas[0];
  const maxPorCompra = Math.max(1, Math.min(sel.cupoDisponible || 1, evento.maxEntradasPorCompra ?? 6));
  const qtyEfectivo = Math.min(qty, maxPorCompra);
  // "Finalizado" lo decide el backend. La venta cierra antes, a la hora de inicio: el backend ya la
  // rechaza (VentaService.validarEventoVendible); acá solo evitamos que el comprador llegue a intentarlo.
  const finalizado = evento.finalizado;
  const ventaCerrada = finalizado || new Date(`${evento.fechaEvento}T${evento.horaEvento}`) < new Date();
  const estadoSel = estadoVentaTanda(sel);
  const hayDisponibles = !ventaCerrada && evento.tandas.some((t) => estadoVentaTanda(t) === "abierta");
  const puedeComprar = !ventaCerrada && estadoSel === "abierta";
  // Con la comisión de Mercado Pago trasladada al comprador, el total ya incluye el cargo (desglosado en el checkout).
  const { cargo, total } = desglosePedido(sel.precio, sel.cargoServicio, qtyEfectivo);
  const textoBoton = ventaCerrada
    ? "Venta cerrada"
    : estadoSel === "abierta"
      ? "Comprar entradas"
      : estadoSel === "proximamente"
        ? "La venta aún no abrió"
        : estadoSel === "cerrada"
          ? "Venta cerrada"
          : "Entradas agotadas";

  function comprar() {
    navigate("/checkout", { state: { evento, tanda: sel, qty: qtyEfectivo } });
  }

  const estadoChip = finalizado
    ? "Evento finalizado"
    : ventaCerrada
      ? "Venta cerrada"
      : hayDisponibles
        ? "Entradas disponibles"
        : "Sin entradas disponibles";

  return (
    <div className="min-h-dvh bg-background">
      <PublicHeader back="historial" />

      <div
        className={cn(
          "mx-auto px-4 pt-4 lg:px-8 lg:py-10",
          finalizado
            ? "max-w-3xl pb-10"
            : "max-w-6xl pb-44 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-10 lg:pb-10",
        )}
      >
        <article className="min-w-0 space-y-7">
          {/* Portada */}
          <div className="overflow-hidden rounded-2xl border border-border-strong">
            <EventoImagen
              src={evento.imagenPortadaUrl}
              alt={evento.nombre}
              nombre={evento.nombre}
              loading="eager"
              className={cn("aspect-[16/9] w-full object-cover", finalizado && "opacity-60 grayscale")}
            />
          </div>

          {/* Encabezado editorial */}
          <header>
            <span
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-full px-3 font-mono text-2xs font-semibold uppercase tracking-[0.1em]",
                hayDisponibles ? "bg-accent text-accent-foreground" : "border border-border-strong text-muted-foreground",
              )}
            >
              {hayDisponibles && <span aria-hidden="true" className="size-1.5 rounded-full bg-accent-foreground" />}
              {estadoChip}
            </span>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-[1.02] tracking-[-0.03em] text-foreground sm:text-4xl lg:text-5xl">
              {evento.nombre}
            </h1>
            <ul className="mt-5 flex flex-wrap gap-2">
              <li className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border-strong px-3 font-mono text-xs tabular-nums text-foreground">
                <Calendar size={14} aria-hidden="true" className="flex-none text-secondary" />
                {formatFecha(evento.fechaEvento)}
              </li>
              <li className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border-strong px-3 font-mono text-xs tabular-nums text-foreground">
                <Clock size={14} aria-hidden="true" className="flex-none text-secondary" />
                {formatHora(evento.horaEvento)}
              </li>
              <li className="inline-flex h-8 min-w-0 items-center gap-1.5 rounded-full border border-border-strong px-3 text-xs text-foreground">
                <MapPin size={14} aria-hidden="true" className="flex-none text-secondary" />
                <span className="truncate">{evento.lugar}</span>
              </li>
            </ul>
          </header>

          {finalizado && <Alert tone="warning">Este evento ya finalizó: no se pueden comprar entradas.</Alert>}
          {!finalizado && ventaCerrada && <Alert tone="warning">Este evento ya comenzó: la venta de entradas está cerrada.</Alert>}
          {!ventaCerrada && !hayDisponibles && <Alert tone="warning">{mensajeSinVenta(evento.tandas)}</Alert>}

          {evento.descripcion && (
            <section>
              <h2 className="mb-2 font-display text-lg font-bold tracking-tight text-foreground">Sobre el evento</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{evento.descripcion}</p>
            </section>
          )}

          {/* Selección de tanda + cantidad (con el evento finalizado no hay nada para elegir) */}
          {!finalizado && (
            <section className="space-y-5 rounded-2xl border border-border-strong bg-card p-5 lg:p-6">
              <RadioCardGroup
                label="Elegí tu tanda"
                value={sel.id}
                onChange={(id) => setSelId(id)}
                options={evento.tandas.map((t) => {
                  const est = estadoVentaTanda(t);
                  const ventana = ventanaVentaTexto(t);
                  const disponibilidad =
                    est === "abierta"
                      ? `${t.cupoDisponible} disponibles`
                      : est === "proximamente"
                        ? "Próximamente"
                        : est === "cerrada"
                          ? "Venta cerrada"
                          : "Agotada";
                  return {
                    value: t.id,
                    label: t.nombre,
                    description: (
                      <>
                        <span className={est === "abierta" ? undefined : "font-medium text-warning"}>{disponibilidad}</span>
                        {ventana && <span className="mt-0.5 block font-mono text-2xs tabular-nums">{ventana}</span>}
                      </>
                    ),
                    aside: fmt(t.precio),
                    disabled: ventaCerrada || est !== "abierta",
                  };
                })}
              />
              <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
                <div>
                  <p className="text-sm font-semibold text-foreground">Cantidad</p>
                  <p className="font-mono text-2xs uppercase tracking-[0.08em] text-muted-foreground">Hasta {maxPorCompra} por compra</p>
                </div>
                <QuantityStepper value={qtyEfectivo} onChange={setQty} max={maxPorCompra} disabled={!puedeComprar} />
              </div>
            </section>
          )}

          {evento.latitud != null && evento.longitud != null && (
            <section>
              <h2 className="mb-3 font-display text-lg font-bold tracking-tight text-foreground">Cómo llegar</h2>
              <div className="overflow-hidden rounded-2xl border border-border-strong">
                <MapView coords={{ lat: evento.latitud, lng: evento.longitud }} lugar={evento.lugar} />
              </div>
            </section>
          )}

          <BotonArrepentimiento
            nombreEvento={evento.nombre}
            contactoWhatsapp={evento.contactoWhatsapp}
            contactoEmail={evento.contactoEmail}
          />
        </article>

        {/* Resumen de compra — talón de ticket troquelado, sticky en desktop */}
        {!finalizado && (
          <aside className="hidden lg:sticky lg:top-24 lg:block">
            <div className="relative rounded-2xl border border-foreground bg-card shadow-hard">
              <div className="p-5">
                <p className="font-mono text-2xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tu compra</p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {qtyEfectivo} × {sel.nombre}
                </p>
                <p className="mt-1 font-display text-4xl font-extrabold tabular-nums leading-none text-foreground">{fmt(total)}</p>
                {cargo > 0 && (
                  <p className="mt-2 font-mono text-2xs leading-relaxed text-muted-foreground">
                    Incluye {fmt(cargo)} de cargo por procesamiento de pago (Mercado Pago)
                  </p>
                )}
              </div>
              {/* Perforación con muescas */}
              <div className="relative h-0 border-t border-dashed border-border-strong">
                <span aria-hidden="true" className="absolute -left-2 -top-2 size-4 rounded-full border border-foreground bg-background" />
                <span aria-hidden="true" className="absolute -right-2 -top-2 size-4 rounded-full border border-foreground bg-background" />
              </div>
              <div className="space-y-3 p-5">
                <Button block size="lg" disabled={!puedeComprar} onClick={comprar}>
                  {textoBoton}
                </Button>
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck size={14} aria-hidden="true" className="flex-none text-success" />
                  Pago seguro con MercadoPago. Recibís las entradas por email.
                </p>
              </div>
            </div>
          </aside>
        )}
      </div>

      {!finalizado && (
        <StickyActionBar summary={`${qtyEfectivo} × ${sel.nombre}`} amount={fmt(total)}>
          <Button block size="lg" disabled={!puedeComprar} onClick={comprar}>
            {textoBoton}
          </Button>
        </StickyActionBar>
      )}
    </div>
  );
}
