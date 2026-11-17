import { useState, useEffect, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Check, Copy, Sun, Ticket } from "lucide-react";
import { api, ApiError, API_BASE_URL } from "../../lib/api";
import { PublicHeader } from "../../components/PublicHeader";
import { SupportContactLine } from "../../components/SupportContactLine";
import { Alert, Badge, Button, ErrorState, Skeleton } from "../../components/ui";
import { fmt, formatRelativo } from "../../lib/format";
import type { EntradaResponseDTO } from "../../lib/types";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

export function MiEntradaPage() {
  useDocumentTitle("Mi entrada");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const codigoQr = searchParams.get("codigoQr") ?? "";

  const [entrada, setEntrada] = useState<EntradaResponseDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

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

  return (
    <div className="min-h-dvh bg-background">
      <PublicHeader />

      <main className="mx-auto max-w-md space-y-5 px-4 py-8">
        {usada && (
          <Alert tone="warning" title="Esta entrada ya fue utilizada">
            Se validó en la puerta {entrada.fechaUso ? formatRelativo(entrada.fechaUso) : "anteriormente"}.
          </Alert>
        )}

        {/* Pase físico digital: boarding pass troquelado — bloque de datos + talón con el QR */}
        <section aria-label="Tu entrada" className="relative overflow-hidden rounded-2xl border border-foreground bg-card shadow-hard">
          {/* Banda superior */}
          <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-3">
            <p className="font-mono text-2xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pase digital</p>
            {usada ? <Badge tone="warning">Usada</Badge> : <Badge tone="success">Válida</Badge>}
          </div>

          {/* Datos del evento y del titular */}
          <div className="px-6 py-6">
            <h1 className="font-display text-2xl font-extrabold leading-[1.05] tracking-[-0.02em] text-foreground">{entrada.nombreEvento}</h1>
            <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5">
              <Campo label="Tanda">{entrada.nombreTanda}</Campo>
              <Campo label="Precio" mono>
                {fmt(entrada.precioTanda)}
              </Campo>
              <Campo label="Titular" full>
                {entrada.nombreComprador}
              </Campo>
              <Campo label="Compra" full>
                {formatRelativo(entrada.fechaCompra)}
              </Campo>
            </dl>
          </div>

          {/* Perforación con muescas entre el bloque principal y el talón */}
          <div className="relative h-0 border-t border-dashed border-border-strong">
            <span aria-hidden="true" className="absolute -left-2 -top-2 size-4 rounded-full border border-foreground bg-background" />
            <span aria-hidden="true" className="absolute -right-2 -top-2 size-4 rounded-full border border-foreground bg-background" />
          </div>

          {/* Talón: QR de alta legibilidad, siempre sobre blanco en los dos temas */}
          <div className="flex flex-col items-center gap-4 bg-surface-sunken px-6 py-7">
            <div className={`rounded-2xl bg-white p-4 shadow-raised ${usada ? "opacity-40 grayscale" : ""}`}>
              <img src={qrImageUrl} alt="Código QR de tu entrada" width={232} height={232} className="block size-[min(232px,60vw)]" />
            </div>
            <div className="flex items-center gap-2">
              <code className="select-all font-mono text-sm tracking-wider text-foreground">{entrada.codigoQr}</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copiarCodigo(entrada.codigoQr)}
                leftIcon={copiado ? <Check size={14} /> : <Copy size={14} />}
              >
                {copiado ? "Código copiado" : "Copiar código"}
              </Button>
            </div>
          </div>
        </section>

        {!usada && (
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2.5">
              <Ticket size={16} aria-hidden="true" className="mt-0.5 flex-none text-secondary" />
              Mostrá este QR en la puerta del evento. Se valida una sola vez.
            </li>
            <li className="flex items-start gap-2.5">
              <Sun size={16} aria-hidden="true" className="mt-0.5 flex-none text-secondary" />
              Subí el brillo de la pantalla para que se lea más rápido. Guardá este link: es tu comprobante.
            </li>
          </ul>
        )}

        <Button variant="secondary" block onClick={() => navigate("/eventos")}>
          Ver más eventos
        </Button>

        <div className="flex justify-center pt-1">
          <SupportContactLine />
        </div>
      </main>
    </div>
  );
}

/** Dato del pase: etiqueta en `IBM Plex Mono` (mayúsculas, espaciada) + valor destacado. */
function Campo({ label, children, full, mono }: { label: string; children: ReactNode; full?: boolean; mono?: boolean }) {
  return (
    <div className={full ? "col-span-2" : undefined}>
      <dt className="font-mono text-2xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className={`mt-1 truncate font-semibold text-foreground ${mono ? "font-mono tabular-nums" : ""}`}>{children}</dd>
    </div>
  );
}
