import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { BadgePercent, CheckCircle2, Wallet } from "lucide-react";
import { Alert, Button, Card, Skeleton } from "../../components/ui";
import { api, ApiError } from "../../lib/api";
import { redirigirA } from "../../lib/navegacion";
import { InfoComisionesMp } from "./ComisionMpPanel";
import { EncabezadoTarjeta } from "./EncabezadoTarjeta";
import type { EstadoCuentaMpResponseDTO, IniciarVinculacionResponseDTO } from "../../lib/types";

/**
 * Cuenta de Mercado Pago del Organizador (8.4): el dinero de sus entradas cae directo en ella. Mercado Pago vuelve a
 * esta pantalla con `?mp=ok|cancelado|error`, que se avisa una vez y se saca de la dirección.
 *
 * `children`: la preferencia de quién paga la comisión (`ComisionMpPanel`), que vive en el perfil y la pasa Mi perfil.
 */
export function CuentaMercadoPagoCard({ children }: { children?: ReactNode }) {
  const [estado, setEstado] = useState<EstadoCuentaMpResponseDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    api
      .get<EstadoCuentaMpResponseDTO>("/organizador/mercadopago/estado")
      .then(setEstado)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "No pudimos cargar el estado de tu cuenta de Mercado Pago."));

    const params = new URLSearchParams(window.location.search);
    const resultado = params.get("mp");
    if (resultado) {
      if (resultado === "ok") toast.success("Cuenta de Mercado Pago vinculada");
      else if (resultado === "cancelado") toast.info("No autorizaste la vinculación: tu cuenta de Mercado Pago sigue sin vincular.");
      else toast.error("No pudimos vincular tu cuenta de Mercado Pago. Intentá de nuevo.");
      params.delete("mp");
      const resto = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (resto ? `?${resto}` : ""));
    }
  }, []);

  async function vincular() {
    setOcupado(true);
    setError(null);
    try {
      const { urlAutorizacion } = await api.post<IniciarVinculacionResponseDTO>("/organizador/mercadopago/vincular");
      redirigirA(urlAutorizacion);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "No pudimos iniciar la vinculación con Mercado Pago.");
      setOcupado(false);
    }
  }

  async function desvincular() {
    setOcupado(true);
    setError(null);
    try {
      await api.delete("/organizador/mercadopago");
      setEstado((e) => ({ vinculada: false, estado: null, mpUserId: null, vinculadaEn: null, obligatoria: e?.obligatoria ?? true }));
      setConfirmando(false);
      toast.success("Cuenta de Mercado Pago desvinculada");
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "No pudimos desvincular la cuenta.");
    } finally {
      setOcupado(false);
    }
  }

  const revocada = estado?.estado === "Revocada";
  let textoVincular = "Vincular Mercado Pago";
  if (revocada) textoVincular = "Volver a vincular";

  return (
    <Card as="section" variant="editorial" aria-labelledby="mp-titulo" className="space-y-5">
      <EncabezadoTarjeta id="mp-titulo" indice="02" eyebrow="Cobros" icon={Wallet}>
        Cuenta de Mercado Pago
      </EncabezadoTarjeta>

      <div className="flex items-start gap-3 rounded-xl border border-border-strong bg-surface-sunken px-4 py-3">
        <span aria-hidden="true" className="flex size-7 flex-none items-center justify-center rounded-md bg-accent text-accent-foreground">
          <BadgePercent size={15} />
        </span>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong className="font-semibold text-foreground">AsistíAPP no cobra comisión por venta de entradas.</strong> La única comisión es la de
          Mercado Pago, según el plazo de liberación del dinero que tengas configurado en tu cuenta.
        </p>
      </div>

      {!estado && !error && (
        <>
          <span className="sr-only">Cargando el estado de tu cuenta…</span>
          <Skeleton className="h-16 rounded-xl" />
        </>
      )}

      {estado?.vinculada && (
        <>
          <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3">
            <CheckCircle2 size={18} aria-hidden="true" className="mt-0.5 flex-none text-success" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Cuenta vinculada</p>
              <p className="mt-0.5 font-mono text-2xs text-muted-foreground">
                Usuario de Mercado Pago: {estado.mpUserId ?? "—"}
                {estado.vinculadaEn && ` · desde el ${new Date(estado.vinculadaEn).toLocaleDateString("es-AR")}`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">El dinero de tus entradas va directo a esta cuenta.</p>
            </div>
          </div>
          {confirmando ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Sin una cuenta vinculada no vas a poder cobrar entradas online. ¿Desvincularla?</p>
              <div className="flex gap-2">
                <Button variant="secondary" block onClick={() => setConfirmando(false)}>
                  No, mantener
                </Button>
                <Button variant="danger" block loading={ocupado} onClick={desvincular}>
                  Sí, desvincular
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" size="sm" block className="text-muted-foreground" onClick={() => setConfirmando(true)}>
              Desvincular
            </Button>
          )}
        </>
      )}

      {estado && !estado.vinculada && (
        <>
          {revocada ? (
            <Alert tone="danger">
              Mercado Pago ya no acepta el acceso de AsistíAPP a tu cuenta (la desvinculaste desde Mercado Pago o venció). Volvé a vincularla
              para seguir cobrando entradas.
            </Alert>
          ) : (
            <p className="text-sm text-muted-foreground">
              Todavía no vinculaste tu cuenta. Al vincularla, el dinero de tus entradas va directo a tu cuenta de Mercado Pago: AsistíAPP no lo
              toca ni cobra comisión.
            </p>
          )}
          <Button block tactil onClick={vincular} loading={ocupado} loadingText="Redirigiendo a Mercado Pago…">
            {textoVincular}
          </Button>
        </>
      )}

      {error && <Alert tone="danger">{error}</Alert>}

      {children && <div className="border-t border-border pt-5">{children}</div>}

      <InfoComisionesMp />
    </Card>
  );
}
