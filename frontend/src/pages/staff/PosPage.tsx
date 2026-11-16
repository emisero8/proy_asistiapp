import { useEffect, useState } from "react";
import { CalendarX, CheckCircle2, Copy, LogOut, QrCode, RotateCcw, Share2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, API_BASE_URL } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { ThemeToggle } from "../../components/ThemeToggle";
import { Alert, Button, Card, EmptyState, ErrorState, Field, IconButton, Input, QuantityStepper, RadioCardGroup, Select, Skeleton, StickyActionBar } from "../../components/ui";
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

/** La primera tanda con cupo (antes la primera aunque estuviera agotada: el botón quedaba gris sin explicación). */
function tandaInicial(e: EventoResponseDTO): TandaResponseDTO | null {
  return e.tandas.find((t) => t.cupoDisponible > 0) ?? e.tandas[0] ?? null;
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
          setTanda(tandaInicial(data[0]));
        }
      })
      .catch((e: unknown) => setLoadError(e instanceof ApiError ? e.message : "No pudimos cargar los eventos."));
  }, []);

  function selectEvento(e: EventoResponseDTO) {
    setEvento(e);
    setTanda(tandaInicial(e));
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

  const header = <PosHeader nombre={session?.nombre} vendidas={soldToday} onLogout={logout} />;

  if (loadError) {
    return (
      <div className="min-h-dvh bg-background">
        {header}
        <div className="mx-auto max-w-xl px-4 py-10">
          <ErrorState
            title="No pudimos cargar tus eventos"
            description={loadError}
            secondaryAction={
              <Button variant="secondary" onClick={logout}>
                Cerrar sesión
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  if (!eventos) {
    return (
      <div className="min-h-dvh bg-background">
        {header}
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 lg:px-8" aria-busy="true">
          <span className="sr-only">Cargando…</span>
          <Skeleton className="h-11 max-w-md" />
          <div className="grid gap-2 lg:grid-cols-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (eventos.length === 0) {
    return (
      <div className="min-h-dvh bg-background">
        {header}
        <div className="mx-auto max-w-xl px-4 py-10">
          <EmptyState
            icon={CalendarX}
            title="No hay eventos para vender"
            description="Tu organizador todavía no tiene eventos publicados para vender."
            action={
              <Button variant="secondary" onClick={logout}>
                Cerrar sesión
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  if (entradas.length > 0 && evento && tanda) {
    const plural = entradas.length > 1;
    return (
      <div className="min-h-dvh bg-background">
        {header}
        <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 lg:px-8 lg:py-8">
          <div className="flex items-center gap-3" role="status">
            <span aria-hidden="true" className="flex size-11 flex-none items-center justify-center rounded-full bg-success/12 text-success">
              <CheckCircle2 size={22} />
            </span>
            <div>
              <h1 className="text-lg font-extrabold text-foreground lg:text-xl">
                {plural ? `¡${entradas.length} entradas generadas!` : "¡Entrada generada!"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {evento.nombre} · {tanda.nombre} · Pasale al comprador el enlace o que escanee el QR.
              </p>
            </div>
          </div>

          {sellError && <Alert tone="danger">{sellError}</Alert>}

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entradas.map((entrada, i) => (
              <li key={entrada.id}>
                <Card padding="none" className="overflow-hidden">
                  <dl className="space-y-2 border-b border-border p-4 text-sm">
                    {[
                      ["Titular", entrada.nombreComprador || "Sin nombre"],
                      ["Tanda", entrada.nombreTanda],
                      ["Entrada", `${i + 1} de ${entradas.length}`],
                      ["Precio", fmt(entrada.precioTanda)],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-3">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="truncate text-right font-semibold text-foreground">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="flex flex-col items-center p-4">
                    {/* El QR siempre sobre blanco (en los dos temas) para que se lea bien. */}
                    <div className="rounded-2xl bg-white p-3 shadow-raised">
                      <img
                        src={`${API_BASE_URL}/tickets/${entrada.id}/qr-image?codigoQr=${encodeURIComponent(entrada.codigoQr)}`}
                        alt={`QR de la entrada ${entrada.codigoQr}`}
                        width={168}
                        height={168}
                      />
                    </div>
                    <p className="mt-3 font-mono text-sm tracking-wider text-foreground">{entrada.codigoQr}</p>
                    <div className="mt-4 flex w-full gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        block
                        leftIcon={<Copy size={15} />}
                        onClick={() => copiarAlPortapapeles(linkEntrada(entrada.codigoQr), "Enlace copiado")}
                      >
                        Copiar enlace
                      </Button>
                      {typeof navigator.share === "function" && (
                        <IconButton
                          label="Compartir entrada"
                          icon={<Share2 size={15} />}
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            navigator
                              .share({
                                title: `Entrada — ${evento.nombre}`,
                                text: `Tu entrada para ${evento.nombre}`,
                                url: linkEntrada(entrada.codigoQr),
                              })
                              .catch(() => {})
                          }
                        />
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" leftIcon={<RotateCcw size={17} />} onClick={handleReset}>
              Nueva venta
            </Button>
            {plural && (
              <Button
                variant="secondary"
                size="lg"
                leftIcon={<Copy size={17} />}
                onClick={() => copiarAlPortapapeles(entradas.map((e) => linkEntrada(e.codigoQr)).join("\n"), `${entradas.length} enlaces copiados`)}
              >
                Copiar los {entradas.length} enlaces
              </Button>
            )}
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
  const resumen = `${qty} × ${tanda?.nombre ?? "—"}`;
  const botonGenerar = (
    <Button block size="lg" leftIcon={<QrCode size={18} />} disabled={!valid} loading={selling} loadingText="Generando…" onClick={handleGenerate}>
      Generar entrada{qty > 1 ? "s" : ""}
    </Button>
  );

  return (
    <div className="min-h-dvh bg-background">
      {header}

      <div className="mx-auto max-w-6xl px-4 py-6 pb-44 lg:flex lg:items-start lg:gap-8 lg:px-8 lg:py-8 lg:pb-8">
        <div className="min-w-0 flex-1 space-y-6">
          {eventos.length > 1 ? (
            <Field label="Evento" hint={evento?.lugar}>
              <Select
                value={evento?.id ?? ""}
                onChange={(e) => {
                  const next = eventos.find((ev) => ev.id === Number(e.target.value));
                  if (next) selectEvento(next);
                }}
              >
                {eventos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            evento && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Evento</p>
                <p className="text-base font-bold text-foreground">{evento.nombre}</p>
                <p className="text-xs text-muted-foreground">{evento.lugar}</p>
              </div>
            )
          )}

          {evento && (
            <RadioCardGroup<number>
              label="Tanda"
              value={tanda?.id ?? null}
              onChange={(id) => setTanda(evento.tandas.find((t) => t.id === id) ?? null)}
              columns={2}
              options={evento.tandas.map((t) => ({
                value: t.id,
                label: t.nombre,
                description: t.cupoDisponible === 0 ? "Agotada" : `${t.cupoDisponible} disponibles`,
                aside: <span className="text-sm font-bold tabular-nums text-foreground">{fmt(t.precio)}</span>,
                disabled: t.cupoDisponible === 0,
              }))}
            />
          )}

          <div>
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-3 sm:max-w-sm">
              <span className="text-sm font-semibold text-foreground">Cantidad</span>
              <QuantityStepper value={qty} onChange={setQty} max={Math.max(1, cupoMaximoVenta)} />
            </div>
            {disponibilidad && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {disponibilidad.yaCompradas > 0
                  ? `Este comprador ya tiene ${disponibilidad.yaCompradas} — podés vender hasta ${disponibilidad.disponible} más (tope: ${disponibilidad.limite}).`
                  : `Máximo ${disponibilidad.limite} entradas por persona para este evento.`}
              </p>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Titular" required>
              <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Nombre del comprador" autoComplete="off" />
            </Field>
            <Field label="Email del comprador" required hint="Se usa para el tope de entradas por persona. La entrada no se envía por mail: pasale el enlace.">
              <Input type="email" inputMode="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} placeholder="comprador@ejemplo.com" autoComplete="off" />
            </Field>
          </div>

          {sellError && <Alert tone="danger">{sellError}</Alert>}
        </div>

        {/* Resumen + generar: panel sticky en desktop, barra fija en mobile/tablet. */}
        <aside aria-label="Resumen de la venta" className="hidden w-80 flex-none lg:sticky lg:top-24 lg:block">
          <Card className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Resumen</p>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">{resumen}</span>
              <span className="text-xl font-extrabold tabular-nums text-foreground">{fmt(total)}</span>
            </div>
            {botonGenerar}
          </Card>
        </aside>
      </div>

      <StickyActionBar summary={resumen} amount={fmt(total)}>
        {botonGenerar}
      </StickyActionBar>
    </div>
  );
}

interface PosHeaderProps {
  nombre?: string;
  vendidas: number;
  onLogout: () => void;
}

/** Header del POS: vendedor, vendidas en esta sesión, tema y salir (antes el tema flotaba encima). */
function PosHeader({ nombre, vendidas, onLogout }: PosHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 lg:px-8">
        <div className="min-w-0">
          <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Punto de venta</p>
          <p className="truncate text-sm font-bold text-foreground">{nombre}</p>
        </div>
        <div className="flex flex-none items-center gap-2">
          <div className="mr-1 text-right">
            <p className="text-2xs text-muted-foreground">Vendidas</p>
            <p className="text-sm font-extrabold tabular-nums text-primary" aria-live="polite">
              {vendidas}
            </p>
          </div>
          <ThemeToggle />
          <IconButton label="Cerrar sesión" icon={<LogOut size={16} />} round onClick={onLogout} />
        </div>
      </div>
    </header>
  );
}
