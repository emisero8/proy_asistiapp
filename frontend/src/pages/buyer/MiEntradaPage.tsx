import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Check, Copy, Sun, Ticket } from "lucide-react";
import { api, ApiError, API_BASE_URL } from "../../lib/api";
import { PublicHeader } from "../../components/PublicHeader";
import { SupportContactLine } from "../../components/SupportContactLine";
import { Alert, Badge, Button, Card, ErrorState, Skeleton } from "../../components/ui";
import { formatRelativo } from "../../lib/format";
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

      <main className="mx-auto max-w-md space-y-4 px-4 py-8">
        {usada && (
          <Alert tone="warning" title="Esta entrada ya fue utilizada">
            Se validó en la puerta {entrada.fechaUso ? formatRelativo(entrada.fechaUso) : "anteriormente"}.
          </Alert>
        )}

        <Card padding="none" className="overflow-hidden rounded-3xl">
          {/* Datos del evento */}
          <div className="border-b border-dashed border-border-strong px-6 py-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Tu entrada</p>
              {usada ? <Badge tone="warning">Usada</Badge> : <Badge tone="success">Válida</Badge>}
            </div>
            <h1 className="mt-1 text-xl font-extrabold leading-tight text-foreground">{entrada.nombreEvento}</h1>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Tanda</dt>
                <dd className="font-semibold text-foreground">{entrada.nombreTanda}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Titular</dt>
                <dd className="truncate font-semibold text-foreground">{entrada.nombreComprador}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Compra</dt>
                <dd className="text-foreground">{formatRelativo(entrada.fechaCompra)}</dd>
              </div>
            </dl>
          </div>

          {/* QR — siempre sobre blanco, en los dos temas, para que el lector lo tome rápido */}
          <div className="flex flex-col items-center bg-surface-sunken px-6 py-7">
            <div className={`rounded-2xl bg-white p-4 shadow-raised ${usada ? "opacity-40 grayscale" : ""}`}>
              <img src={qrImageUrl} alt="Código QR de tu entrada" width={232} height={232} className="block size-[min(232px,60vw)]" />
            </div>
            <div className="mt-4 flex items-center gap-2">
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
        </Card>

        {!usada && (
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2.5">
              <Ticket size={16} aria-hidden="true" className="mt-0.5 flex-none text-primary" />
              Mostrá este QR en la puerta del evento. Se valida una sola vez.
            </li>
            <li className="flex items-start gap-2.5">
              <Sun size={16} aria-hidden="true" className="mt-0.5 flex-none text-primary" />
              Subí el brillo de la pantalla para que se lea más rápido. Guardá este link: es tu comprobante.
            </li>
          </ul>
        )}

        <Button variant="secondary" block onClick={() => navigate("/eventos")}>
          Ver más eventos
        </Button>

        <div className="flex justify-center pt-2">
          <SupportContactLine />
        </div>
      </main>
    </div>
  );
}
