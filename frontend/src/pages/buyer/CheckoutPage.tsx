import { useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { Calendar, MapPin, ShieldCheck, ShoppingBag } from "lucide-react";
import { EventoImagen } from "../../components/EventoImagen";
import { PublicHeader } from "../../components/PublicHeader";
import { Alert, Button, Card, EmptyState, Field, Input, StickyActionBar } from "../../components/ui";
import { api, ApiError } from "../../lib/api";
import { fmt, formatFecha } from "../../lib/format";
import { estadoVentaTanda } from "../../lib/tandas";
import type { EventoPublicoDetalleDTO, IniciarCompraResponseDTO, TandaResponseDTO } from "../../lib/types";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

interface CheckoutState {
  evento: EventoPublicoDetalleDTO;
  tanda: TandaResponseDTO;
  qty: number;
}

const FORM_ID = "checkout-datos";

export function CheckoutPage() {
  useDocumentTitle("Finalizar compra");
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as CheckoutState | null;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tocados, setTocados] = useState({ name: false, email: false });
  const [intento, setIntento] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!state) {
    return (
      <div className="min-h-dvh bg-background">
        <PublicHeader />
        <div className="mx-auto max-w-md px-4 py-16">
          <EmptyState
            icon={ShoppingBag}
            title="No hay ninguna compra en curso"
            description="Elegí un evento y la cantidad de entradas para empezar."
            action={<Button onClick={() => navigate("/eventos")}>Ver eventos</Button>}
          />
        </div>
      </div>
    );
  }

  const { evento, tanda, qty } = state;
  const total = tanda.precio * qty;

  // Validación temprana (espeja al backend): si la tanda llegó fuera de su ventana de venta o el
  // evento ya pasó, se avisa apenas se entra, sin obligar a llenar el formulario para enterarse
  // recién al enviar. La validación real (la que corta) sigue siendo la del backend.
  const eventoFinalizado = new Date(`${evento.fechaEvento}T${evento.horaEvento}`) < new Date();
  const estadoTanda = estadoVentaTanda(tanda);
  const disponible = !eventoFinalizado && estadoTanda === "abierta";
  const avisoNoDisponible = eventoFinalizado
    ? "Este evento ya finalizó: no se pueden comprar entradas."
    : estadoTanda === "proximamente"
      ? `La venta de la tanda "${tanda.nombre}" todavía no está abierta.`
      : estadoTanda === "cerrada"
        ? `La venta de la tanda "${tanda.nombre}" ya cerró.`
        : estadoTanda === "agotada"
          ? `La tanda "${tanda.nombre}" está agotada.`
          : null;

  const errorNombre = name.trim().length > 1 ? undefined : "Ingresá tu nombre y apellido.";
  const errorEmail = email.length > 4 && email.includes("@") ? undefined : "Ingresá un email válido: ahí te llegan las entradas.";
  const valid = !errorNombre && !errorEmail;

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      // Una sola orden para las "qty" entradas: el backend genera una Entrada (con
      // su propio QR) por cada unidad al confirmarse el pago, pero la cobra en una
      // sola preferencia de MercadoPago.
      const orden = await api.post<IniciarCompraResponseDTO>(
        "/tickets/comprar-online",
        { idTanda: tanda.id, cantidad: qty, nombreComprador: name, emailComprador: email },
        { skipAuth: true },
      );
      // Redirección real a Checkout Pro — el pago se confirma por el webhook de
      // MercadoPago, no acá. MercadoPago vuelve a /pago/resultado cuando termina.
      window.location.href = orden.urlPago;
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "No pudimos iniciar el pago. Intentá de nuevo.");
      setLoading(false);
    }
  }

  const etiquetaCantidad = `${qty} entrada${qty > 1 ? "s" : ""} · ${tanda.nombre}`;
  const botonPagar = (
    <Button type="submit" form={FORM_ID} variant="accent" block size="lg" disabled={!disponible} loading={loading} loadingText="Redirigiendo a MercadoPago…">
      Pagar {fmt(total)}
    </Button>
  );

  return (
    <div className="min-h-dvh bg-background">
      <PublicHeader back="historial" />

      <div className="mx-auto max-w-6xl px-4 pt-6 pb-44 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-10 lg:px-8 lg:py-10 lg:pb-10">
        <div className="min-w-0 space-y-6">
          <div>
            <p className="font-mono text-2xs font-semibold uppercase tracking-[0.16em] text-secondary">Paso final</p>
            <h1 className="mt-1.5 font-display text-3xl font-extrabold leading-[1.02] tracking-[-0.02em] text-foreground lg:text-4xl">
              Finalizar compra
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">No necesitás crear una cuenta: te mandamos las entradas por email.</p>
          </div>

          {avisoNoDisponible && (
            <Alert
              tone="warning"
              title="Esta entrada ya no está disponible"
              action={
                <Button variant="secondary" size="sm" onClick={() => navigate(`/eventos/${evento.urlPublica}`)}>
                  Volver al evento
                </Button>
              }
            >
              {avisoNoDisponible}
            </Alert>
          )}

          {/* Resumen del pedido como recibo troquelado — también en mobile (la barra fija solo lleva el total). */}
          <ReciboPedido evento={evento} tanda={tanda} qty={qty} etiqueta={etiquetaCantidad} total={total} className="lg:hidden" />

          <Card as="section" aria-labelledby="checkout-datos-titulo">
            <h2 id="checkout-datos-titulo" className="font-display text-base font-bold tracking-tight text-foreground">
              Tus datos
            </h2>
            <form
              id={FORM_ID}
              ref={formRef}
              noValidate
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (loading || !disponible) return;
                if (!valid) {
                  setIntento(true);
                  requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
                  return;
                }
                handleConfirm();
              }}
            >
              <Field label="Nombre y apellido" error={intento || tocados.name ? errorNombre : undefined}>
                <Input
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setTocados((t) => ({ ...t, name: true }))}
                  placeholder="María García"
                />
              </Field>
              <Field
                label="Email"
                hint="Te mandamos las entradas a este email: revisá que esté bien escrito."
                error={intento || tocados.email ? errorEmail : undefined}
              >
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTocados((t) => ({ ...t, email: true }))}
                  placeholder="maria@ejemplo.com"
                />
              </Field>
            </form>
          </Card>

          {error && <Alert tone="danger">{error}</Alert>}
        </div>

        {/* Recibo + pago — panel sticky en desktop */}
        <aside className="hidden lg:sticky lg:top-24 lg:block">
          <ReciboPedido evento={evento} tanda={tanda} qty={qty} etiqueta={etiquetaCantidad} total={total}>
            {botonPagar}
            <NotaPago />
          </ReciboPedido>
        </aside>
      </div>

      <StickyActionBar summary={etiquetaCantidad} amount={fmt(total)}>
        {botonPagar}
      </StickyActionBar>
    </div>
  );
}

interface ReciboPedidoProps {
  evento: EventoPublicoDetalleDTO;
  tanda: TandaResponseDTO;
  qty: number;
  etiqueta: string;
  total: number;
  className?: string;
  /** Acciones bajo el total (botón de pago + nota), solo en el panel de desktop. */
  children?: ReactNode;
}

/**
 * Resumen del pedido con forma de **recibo / talón de ticket troquelado**: borde fuerte +
 * sombra dura, perforación punteada con muescas entre el desglose y el total, y precios
 * en `IBM Plex Mono` tabular. El `aria-label="Tu pedido"` lo mantiene como región localizable.
 */
function ReciboPedido({ evento, tanda, qty, etiqueta, total, className, children }: ReciboPedidoProps) {
  return (
    <section aria-label="Tu pedido" className={["relative rounded-2xl border border-foreground bg-card shadow-hard", className].filter(Boolean).join(" ")}>
      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-2xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tu pedido</p>
          <span aria-hidden="true" className="font-mono text-2xs tabular-nums text-muted-foreground">×{qty}</span>
        </div>

        <div className="flex gap-3">
          <EventoImagen
            src={evento.imagenPortadaUrl}
            alt=""
            nombre={evento.nombre}
            className="aspect-[3/4] w-14 flex-none rounded-lg border border-border-strong object-cover"
          />
          <div className="min-w-0">
            <p className="line-clamp-2 font-display text-sm font-bold leading-snug text-foreground">{evento.nombre}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar size={12} aria-hidden="true" className="flex-none text-secondary" />
              {formatFecha(evento.fechaEvento)}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin size={12} aria-hidden="true" className="flex-none text-secondary" />
              <span className="truncate">{evento.lugar}</span>
            </p>
          </div>
        </div>

        {/* Desglose: tanda · cantidad, en mono tabular */}
        <dl className="space-y-2 border-t border-border pt-4 font-mono text-xs">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="min-w-0 truncate text-muted-foreground">{tanda.nombre}</dt>
            <dd className="flex-none tabular-nums text-foreground">{fmt(tanda.precio)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">Cantidad</dt>
            <dd className="flex-none tabular-nums text-foreground">× {qty}</dd>
          </div>
        </dl>
      </div>

      {/* Perforación con muescas */}
      <div className="relative h-0 border-t border-dashed border-border-strong">
        <span aria-hidden="true" className="absolute -left-2 -top-2 size-4 rounded-full border border-foreground bg-background" />
        <span aria-hidden="true" className="absolute -right-2 -top-2 size-4 rounded-full border border-foreground bg-background" />
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <span className="block font-mono text-2xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Total</span>
            <span className="mt-0.5 block font-mono text-2xs text-muted-foreground">{etiqueta}</span>
          </div>
          <span className="font-display text-3xl font-extrabold leading-none tabular-nums text-foreground">{fmt(total)}</span>
        </div>
        {children}
      </div>
    </section>
  );
}

function NotaPago() {
  return (
    <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
      <ShieldCheck size={14} aria-hidden="true" className="mt-0.5 flex-none text-success" />
      Te llevamos a MercadoPago para pagar de forma segura. Al confirmarse el pago, te llegan las entradas con su QR.
    </p>
  );
}
