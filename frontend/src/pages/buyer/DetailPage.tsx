import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Calendar, Clock, MapPin, ShieldCheck, Ticket } from "lucide-react";
import { EventoImagen } from "../../components/EventoImagen";
import { PublicHeader } from "../../components/PublicHeader";
import { MapView } from "../../components/EventMap";
import { Alert, Button, Card, EmptyState, ErrorState, QuantityStepper, RadioCardGroup, Skeleton, StickyActionBar } from "../../components/ui";
import { api, ApiError } from "../../lib/api";
import { fmt, formatFecha, formatHora } from "../../lib/format";
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
        // Arranca elegida la primera tanda CON cupo: antes se elegía la primera aunque estuviera
        // agotada, y el botón de compra quedaba deshabilitado sin explicar por qué.
        setSelId((data.tandas.find((t) => t.cupoDisponible > 0) ?? data.tandas[0])?.id ?? null);
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
  // El backend ya rechaza la compra de un evento vencido (VentaService.validarTandaDisponible);
  // acá solo evitamos que el comprador llegue a intentarlo.
  const eventoFinalizado = new Date(`${evento.fechaEvento}T${evento.horaEvento}`) < new Date();
  const agotado = evento.tandas.every((t) => t.cupoDisponible <= 0);
  const puedeComprar = !eventoFinalizado && sel.cupoDisponible > 0;
  const total = sel.precio * qtyEfectivo;
  const textoBoton = eventoFinalizado ? "Evento finalizado" : agotado ? "Entradas agotadas" : "Comprar entradas";

  function comprar() {
    navigate("/checkout", { state: { evento, tanda: sel, qty: qtyEfectivo } });
  }

  return (
    <div className="min-h-dvh bg-background">
      <PublicHeader back="historial" />

      <div className="mx-auto max-w-6xl px-4 pt-4 pb-44 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-10 lg:px-8 lg:py-10">
        <article className="min-w-0 space-y-6">
          <EventoImagen
            src={evento.imagenPortadaUrl}
            alt={evento.nombre}
            loading="eager"
            className="aspect-[16/9] w-full rounded-2xl object-cover"
            iconSize={32}
          />

          <header>
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-foreground lg:text-4xl">{evento.nombre}</h1>
            <ul className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-5">
              <li className="flex items-center gap-2">
                <Calendar size={16} aria-hidden="true" className="flex-none text-primary" />
                {formatFecha(evento.fechaEvento)}
              </li>
              <li className="flex items-center gap-2">
                <Clock size={16} aria-hidden="true" className="flex-none text-primary" />
                {formatHora(evento.horaEvento)}
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={16} aria-hidden="true" className="flex-none text-primary" />
                {evento.lugar}
              </li>
            </ul>
          </header>

          {eventoFinalizado && <Alert tone="warning">Este evento ya finalizó: no se pueden comprar entradas.</Alert>}
          {!eventoFinalizado && agotado && <Alert tone="warning">Las entradas para este evento están agotadas.</Alert>}

          {evento.descripcion && (
            <section>
              <h2 className="mb-2 text-base font-bold text-foreground">Sobre el evento</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{evento.descripcion}</p>
            </section>
          )}

          <section className="space-y-4">
            <RadioCardGroup
              label="Elegí tu tanda"
              value={sel.id}
              onChange={(id) => setSelId(id)}
              options={evento.tandas.map((t) => ({
                value: t.id,
                label: t.nombre,
                description: t.cupoDisponible > 0 ? `${t.cupoDisponible} disponibles` : "Agotada",
                aside: fmt(t.precio),
                disabled: eventoFinalizado || t.cupoDisponible <= 0,
              }))}
            />
            <Card padding="sm" className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Cantidad</p>
                <p className="text-xs text-muted-foreground">Hasta {maxPorCompra} por compra</p>
              </div>
              <QuantityStepper value={qtyEfectivo} onChange={setQty} max={maxPorCompra} disabled={!puedeComprar} />
            </Card>
          </section>

          {evento.latitud != null && evento.longitud != null && (
            <section>
              <h2 className="mb-3 text-base font-bold text-foreground">Cómo llegar</h2>
              <MapView coords={{ lat: evento.latitud, lng: evento.longitud }} lugar={evento.lugar} />
            </section>
          )}
        </article>

        {/* Resumen de compra — panel sticky en desktop */}
        <aside className="hidden lg:sticky lg:top-24 lg:block">
          <Card className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">
                {qtyEfectivo} × {sel.nombre}
              </p>
              <p className="mt-0.5 text-3xl font-extrabold tabular-nums text-foreground">{fmt(total)}</p>
            </div>
            <Button block size="lg" disabled={!puedeComprar} onClick={comprar}>
              {textoBoton}
            </Button>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck size={14} aria-hidden="true" className="flex-none text-success" />
              Pago seguro con MercadoPago. Recibís las entradas por email.
            </p>
          </Card>
        </aside>
      </div>

      <StickyActionBar summary={`${qtyEfectivo} × ${sel.nombre}`} amount={fmt(total)}>
        <Button block size="lg" disabled={!puedeComprar} onClick={comprar}>
          {textoBoton}
        </Button>
      </StickyActionBar>
    </div>
  );
}
