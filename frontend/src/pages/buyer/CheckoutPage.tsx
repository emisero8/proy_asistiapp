import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Calendar, MapPin, ShieldCheck, ShoppingBag } from "lucide-react";
import { EventoImagen } from "../../components/EventoImagen";
import { PublicHeader } from "../../components/PublicHeader";
import { Alert, Button, Card, EmptyState, Field, Input, StickyActionBar } from "../../components/ui";
import { api, ApiError } from "../../lib/api";
import { fmt, formatFecha } from "../../lib/format";
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
    <Button type="submit" form={FORM_ID} block size="lg" loading={loading} loadingText="Redirigiendo a MercadoPago…">
      Pagar {fmt(total)}
    </Button>
  );

  return (
    <div className="min-h-dvh bg-background">
      <PublicHeader back="historial" />

      <div className="mx-auto max-w-6xl px-4 pt-6 pb-44 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-10 lg:px-8 lg:py-10">
        <div className="min-w-0 space-y-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground lg:text-3xl">Finalizar compra</h1>
            <p className="mt-1 text-sm text-muted-foreground">No necesitás crear una cuenta: te mandamos las entradas por email.</p>
          </div>

          {/* Resumen del pedido — también en mobile (antes solo se veía "2 × General", sin el evento) */}
          <Card padding="sm" as="section" aria-label="Tu pedido" className="lg:hidden">
            <ResumenPedido evento={evento} etiqueta={etiquetaCantidad} total={total} />
          </Card>

          <Card as="section" aria-labelledby="checkout-datos-titulo">
            <h2 id="checkout-datos-titulo" className="text-base font-bold text-foreground">
              Tus datos
            </h2>
            <form
              id={FORM_ID}
              ref={formRef}
              noValidate
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (loading) return;
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

        {/* Resumen + pago — panel sticky en desktop */}
        <aside className="hidden lg:sticky lg:top-24 lg:block">
          <Card className="space-y-5" as="section" aria-label="Tu pedido">
            <ResumenPedido evento={evento} etiqueta={etiquetaCantidad} total={total} />
            {botonPagar}
            <NotaPago />
          </Card>
        </aside>
      </div>

      <StickyActionBar summary={etiquetaCantidad} amount={fmt(total)}>
        {botonPagar}
      </StickyActionBar>
    </div>
  );
}

function ResumenPedido({ evento, etiqueta, total }: { evento: EventoPublicoDetalleDTO; etiqueta: string; total: number }) {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <EventoImagen src={evento.imagenPortadaUrl} alt="" className="aspect-[3/4] w-16 flex-none rounded-xl object-cover" iconSize={16} />
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-bold leading-snug text-foreground">{evento.nombre}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar size={12} aria-hidden="true" className="flex-none" />
            {formatFecha(evento.fechaEvento)}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin size={12} aria-hidden="true" className="flex-none" />
            <span className="truncate">{evento.lugar}</span>
          </p>
        </div>
      </div>
      <div className="flex items-baseline justify-between gap-3 border-t border-border pt-4">
        <span className="text-sm text-muted-foreground">{etiqueta}</span>
        <span className="text-xl font-extrabold tabular-nums text-foreground">{fmt(total)}</span>
      </div>
    </div>
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
