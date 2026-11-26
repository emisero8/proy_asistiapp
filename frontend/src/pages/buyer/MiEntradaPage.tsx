import { useState, useEffect, type CSSProperties, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Check, Copy, Download, Share2, Sun, Ticket } from "lucide-react";
import { api, ApiError, API_BASE_URL } from "../../lib/api";
import { PublicHeader } from "../../components/PublicHeader";
import { SupportContactLine } from "../../components/SupportContactLine";
import { Alert, Button, ErrorState, Skeleton } from "../../components/ui";
import { fmt, formatFecha, formatFechaHoraCorta, formatHora, formatRelativo } from "../../lib/format";
import { generarImagenEntrada } from "../../lib/entradaImagen";
import type { EntradaResponseDTO } from "../../lib/types";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

/** Solo visual: "felipe PRONO" → "Felipe Prono". No modifica lo que está guardado. */
function aTitleCase(texto: string): string {
  return texto
    .toLocaleLowerCase("es-AR")
    .split(/(\s+)/)
    .map((parte) => parte.charAt(0).toLocaleUpperCase("es-AR") + parte.slice(1))
    .join("");
}

/** Portada sin imagen: carbón con un resplandor lima y un patrón de rayas diagonales, sutil pero visible. */
const PORTADA_SIN_IMAGEN: CSSProperties = {
  backgroundColor: "#141311",
  backgroundImage: [
    "repeating-linear-gradient(135deg, rgba(182,242,74,0.10) 0 1px, transparent 1px 14px)",
    "radial-gradient(120% 140% at 88% 0%, rgba(182,242,74,0.75) 0%, rgba(182,242,74,0.18) 38%, transparent 62%)",
    "linear-gradient(160deg, #1d2b0a 0%, #141311 70%)",
  ].join(", "),
};

export function MiEntradaPage() {
  useDocumentTitle("Mi entrada");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const codigoQr = searchParams.get("codigoQr") ?? "";

  const [entrada, setEntrada] = useState<EntradaResponseDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  useEffect(() => {
    if (!codigoQr) {
      setError("El enlace no incluye el código de la entrada.");
      setLoading(false);
      return;
    }

    api
      .get<EntradaResponseDTO>(`/tickets/by-codigo?codigoQr=${encodeURIComponent(codigoQr)}`, {
        skipAuth: true,
      })
      .then((data) => setEntrada(data))
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : "No pudimos encontrar tu entrada. El código QR puede ser inválido.");
      })
      .finally(() => setLoading(false));
  }, [codigoQr]);

  async function copiarCodigo(codigo: string) {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles: el código está visible y se puede seleccionar a mano.
    }
  }

  /** Comparte el link de la entrada (hoja nativa del celular) o, si no hay, lo copia. */
  async function compartir(e: EntradaResponseDTO) {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: e.nombreEvento, text: `Mi entrada para ${e.nombreEvento}`, url });
        return;
      } catch (err) {
        // Cerrar la hoja de compartir no es un error; cualquier otra falla cae al copiado del link.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2000);
    } catch {
      // Sin portapapeles: el link está en la barra del navegador.
    }
  }

  async function descargar(e: EntradaResponseDTO, qrUrl: string) {
    setDescargando(true);
    setErrorDescarga(null);
    try {
      const cuando = [e.fechaEvento && formatFecha(e.fechaEvento), e.horaEvento && formatHora(e.horaEvento)].filter(Boolean).join(" · ");
      const blob = await generarImagenEntrada({
        nombreEvento: e.nombreEvento,
        detalle: [cuando, e.lugarEvento].filter(Boolean).join(" — "),
        nombreTanda: e.nombreTanda,
        precio: fmt(e.precioTanda),
        titular: aTitleCase(e.nombreComprador),
        codigo: e.codigoQr,
        qrUrl,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `entrada-${e.codigoQr}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setErrorDescarga("No pudimos generar la imagen. Probá de nuevo o sacale una captura a la pantalla.");
    } finally {
      setDescargando(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-background" aria-busy="true">
        <PublicHeader />
        <span className="sr-only">Cargando tu entrada…</span>
        <div className="mx-auto max-w-md space-y-4 px-4 py-8">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="aspect-square w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error || !entrada) {
    return (
      <div className="min-h-dvh bg-background">
        <PublicHeader />
        <div className="mx-auto max-w-md px-4 py-16">
          <ErrorState
            title="No encontramos tu entrada"
            description={error ?? "El código QR no es válido o la entrada no existe."}
            secondaryAction={
              <Button variant="secondary" size="sm" onClick={() => navigate("/")}>
                Volver al inicio
              </Button>
            }
          />
          <div className="mt-6 flex justify-center">
            <SupportContactLine />
          </div>
        </div>
      </div>
    );
  }

  const qrImageUrl = `${API_BASE_URL}/tickets/${entrada.id}/qr-image?codigoQr=${encodeURIComponent(entrada.codigoQr)}`;
  const usada = entrada.estado === "Usada";
  // Anulada por el Organizador (8.6): ya no sirve para entrar, aunque el QR siga existiendo.
  const anulada = entrada.estado === "Anulada";
  const cancelado = entrada.eventoCancelado;
  const finalizado = entrada.eventoFinalizado;
  // Con el evento cancelado o terminado no queda nada para descargar ni compartir.
  const sinEvento = cancelado || finalizado;
  // Usada, anulada o sin evento: el QR ya no sirve para entrar.
  const inactiva = usada || anulada || sinEvento;

  return (
    <div className="min-h-dvh bg-background">
      <PublicHeader />

      <main className="mx-auto max-w-[400px] space-y-5 px-4 py-8">
        {anulada && (
          <Alert tone="danger" title="Esta entrada fue anulada">
            El Organizador la anuló{entrada.motivoAnulacion ? ` (${entrada.motivoAnulacion})` : ""}: ya no sirve para entrar al evento.
            {entrada.reembolsadaEn ? " Te devolvimos el pago con Mercado Pago." : ""}
          </Alert>
        )}
        {usada && (
          <Alert tone="warning" title="Esta entrada ya fue utilizada">
            Se validó en la puerta {entrada.fechaUso ? formatRelativo(entrada.fechaUso) : "anteriormente"}.
          </Alert>
        )}

        {cancelado && !anulada && !usada && (
          <Alert tone="danger" title="El evento fue cancelado">
            Esta entrada ya no sirve para ingresar. Por la devolución del pago, contactá al Organizador.
          </Alert>
        )}
        {finalizado && !cancelado && !anulada && !usada && (
          <Alert tone="info" title="El evento ya finalizó">
            Esta entrada ya no sirve para ingresar.
          </Alert>
        )}

        {/* Borde en degradé (1px) con la tarjeta adentro: un brillo sutil de la marca arriba. */}
        <section
          aria-label="Tu entrada"
          className="animate-fade-in-up relative rounded-3xl bg-linear-to-b from-accent/70 via-border-strong to-border p-px shadow-raised"
        >
          <div className="overflow-hidden rounded-[calc(1.5rem-1px)] bg-card">
            {/* Portada: la imagen del evento con overlay oscuro; si no tiene, un degradé de la marca con patrón. */}
            <div className="relative flex h-48 flex-col justify-between overflow-hidden px-5 pb-5 pt-4 text-white" style={entrada.imagenPortadaUrl ? undefined : PORTADA_SIN_IMAGEN}>
              {entrada.imagenPortadaUrl ? (
                <img src={entrada.imagenPortadaUrl} alt="" className={`absolute inset-0 size-full object-cover ${sinEvento ? "grayscale" : ""}`} />
              ) : (
                <Ticket aria-hidden="true" size={150} strokeWidth={1} className="absolute -right-6 top-10 rotate-[-14deg] text-accent/25" />
              )}
              <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/85 via-black/35 to-black/10" />
              <div className="relative flex items-start justify-between gap-3">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-white/85">Pase digital</p>
                <EstadoChip usada={usada} anulada={anulada} cancelado={cancelado} finalizado={finalizado} />
              </div>
              <h1 className="relative font-display text-[26px] font-extrabold leading-[1.05] tracking-[-0.02em] [overflow-wrap:anywhere] [text-shadow:0_1px_12px_rgba(0,0,0,0.5)]">
                {entrada.nombreEvento}
              </h1>
            </div>

            {/* Cuándo y dónde, y de quién es */}
            <div className="space-y-4 px-5 pb-5 pt-5">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                {entrada.fechaEvento && <Campo label="Fecha">{formatFecha(entrada.fechaEvento)}</Campo>}
                {entrada.horaEvento && <Campo label="Hora">{formatHora(entrada.horaEvento)}</Campo>}
                {entrada.lugarEvento && (
                  <Campo label="Lugar" full>
                    {entrada.lugarEvento}
                  </Campo>
                )}
                <Campo label="Titular">{aTitleCase(entrada.nombreComprador)}</Campo>
                <Campo label="N.º de entrada" mono>
                  {String(entrada.id).padStart(6, "0")}
                </Campo>
              </dl>
              {/* Detalle de la compra, en segundo plano */}
              <dl className="grid grid-cols-3 gap-x-3 border-t border-border pt-3">
                <CampoChico label="Tanda">{entrada.nombreTanda}</CampoChico>
                <CampoChico label="Precio" mono>
                  {fmt(entrada.precioTanda)}
                </CampoChico>
                <CampoChico label="Compra">{formatFechaHoraCorta(entrada.fechaCompra)}</CampoChico>
              </dl>
            </div>

            {/* Troquelado: línea punteada con dos muescas recortadas con el color de fondo de la página */}
            <div className="relative h-0 border-t-2 border-dashed border-foreground/45">
              <span aria-hidden="true" className="absolute -left-2.5 -top-2.5 z-10 size-5 rounded-full bg-background" />
              <span aria-hidden="true" className="absolute -right-2.5 -top-2.5 z-10 size-5 rounded-full bg-background" />
            </div>

            {/* Talón: QR siempre negro sobre blanco, también en modo oscuro, para que se lea */}
            <div className="flex flex-col items-center gap-3 bg-surface-sunken px-5 pb-4 pt-6">
              <div className={`rounded-3xl bg-white p-4 shadow-raised ${inactiva ? "opacity-40 grayscale" : ""}`}>
                <img src={qrImageUrl} alt="Código QR de tu entrada" width={232} height={232} className="block size-[min(232px,58vw)]" />
              </div>
              <code className="block max-w-full select-all break-all text-center font-mono text-[11px] leading-relaxed tracking-wider text-foreground">
                {entrada.codigoQr}
              </code>
              <Button
                variant="ghost"
                onClick={() => copiarCodigo(entrada.codigoQr)}
                leftIcon={copiado ? <Check size={14} /> : <Copy size={14} />}
              >
                {copiado ? "Copiado ✓" : "Copiar código"}
              </Button>
            </div>
          </div>
        </section>

        {/* Acciones */}
        <div className="space-y-3">
          {!sinEvento && (
            <>
              <Button variant="accent" block leftIcon={<Download size={16} />} disabled={descargando} onClick={() => descargar(entrada, qrImageUrl)}>
                {descargando ? "Generando imagen…" : "Descargar entrada"}
              </Button>
              {errorDescarga && (
                <p role="alert" className="text-sm text-destructive">
                  {errorDescarga}
                </p>
              )}
            </>
          )}
          <div className={sinEvento ? "grid gap-3" : "grid grid-cols-2 gap-3"}>
            {!sinEvento && (
              <Button variant="secondary" leftIcon={linkCopiado ? <Check size={16} /> : <Share2 size={16} />} onClick={() => compartir(entrada)}>
                {linkCopiado ? "Link copiado ✓" : "Compartir"}
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate("/eventos")}>
              Ver más eventos
            </Button>
          </div>
        </div>

        {!inactiva && (
          <ul className="space-y-2 rounded-xl border border-border bg-card/60 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            <li className="flex items-start gap-2.5">
              <Ticket size={14} aria-hidden="true" className="mt-0.5 flex-none text-secondary" />
              Mostrá este QR en la puerta del evento. Se valida una sola vez.
            </li>
            <li className="flex items-start gap-2.5">
              <Sun size={14} aria-hidden="true" className="mt-0.5 flex-none text-secondary" />
              Subí el brillo de la pantalla para que se lea más rápido. Guardá este link: es tu comprobante.
            </li>
          </ul>
        )}

        <div className="flex justify-center pt-1">
          <SupportContactLine />
        </div>
      </main>
    </div>
  );
}

/** Dato principal: etiqueta de 10px en `IBM Plex Mono` (mayúsculas, espaciada) + valor de 15px semibold. */
function Campo({ label, children, full, mono }: { label: string; children: ReactNode; full?: boolean; mono?: boolean }) {
  return (
    <div className={full ? "col-span-2" : undefined}>
      <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className={`mt-1 text-[15px] font-semibold leading-snug text-foreground [overflow-wrap:anywhere] ${mono ? "font-mono tabular-nums" : ""}`}>{children}</dd>
    </div>
  );
}

/** Dato secundario (tanda, precio, compra): misma lógica pero más chico. */
function CampoChico({ label, children, mono }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 text-xs font-medium text-foreground [overflow-wrap:anywhere] ${mono ? "font-mono tabular-nums" : ""}`}>{children}</dd>
    </div>
  );
}

/**
 * Estado sobre la portada: fondo sólido del color del estado con texto oscuro y un punto,
 * así se lee sobre cualquier imagen (los colores son fijos: la portada siempre es oscura).
 */
function EstadoChip({ usada, anulada, cancelado, finalizado }: { usada: boolean; anulada: boolean; cancelado: boolean; finalizado: boolean }) {
  const { texto, caja } = anulada
    ? { texto: "Anulada", caja: "bg-[#f87171] text-[#2a0707]" }
    : usada
      ? { texto: "Usada", caja: "bg-[#d6d4cc] text-[#141311]" }
      : cancelado
        ? { texto: "Cancelado", caja: "bg-[#f87171] text-[#2a0707]" }
        : finalizado
          ? { texto: "Finalizado", caja: "bg-[#d6d4cc] text-[#141311]" }
          : { texto: "Válida", caja: "bg-[#6ee7a4] text-[#05200f]" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold leading-none ${caja}`}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {texto}
    </span>
  );
}
