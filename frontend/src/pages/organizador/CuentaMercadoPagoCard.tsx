import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Wallet } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { redirigirA } from "../../lib/navegacion";
import type { EstadoCuentaMpResponseDTO, IniciarVinculacionResponseDTO } from "../../lib/types";

const BOTON =
  "w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";

/**
 * Cuenta de Mercado Pago del Organizador (8.4): el dinero de sus entradas cae directo en ella. Mercado Pago vuelve a
 * esta pantalla con `?mp=ok|cancelado|error`, que se avisa una vez y se saca de la dirección.
 */
export function CuentaMercadoPagoCard() {
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
      setEstado({ vinculada: false, estado: null, mpUserId: null, vinculadaEn: null });
      setConfirmando(false);
      toast.success("Cuenta de Mercado Pago desvinculada");
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "No pudimos desvincular la cuenta.");
    } finally {
      setOcupado(false);
    }
  }

  const revocada = estado?.estado === "Revocada";

  return (
    <section className="rounded-3xl bg-card border border-border p-5 space-y-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <Wallet size={15} className="text-primary" /> Cuenta de Mercado Pago
      </h3>

      {!estado && !error && <div className="h-16 rounded-2xl bg-muted animate-pulse" />}

      {estado?.vinculada && (
        <>
          <div className="flex items-start gap-2 text-sm text-foreground">
            <CheckCircle2 size={16} className="text-emerald-400 flex-none mt-0.5" />
            <div>
              <p className="font-semibold">Cuenta vinculada</p>
              <p className="text-[11px] text-muted-foreground">
                Usuario de Mercado Pago: {estado.mpUserId ?? "—"}
                {estado.vinculadaEn && ` · desde el ${new Date(estado.vinculadaEn).toLocaleDateString("es-AR")}`}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">El dinero de tus entradas va directo a esta cuenta.</p>
            </div>
          </div>
          {confirmando ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Sin una cuenta vinculada no vas a poder cobrar entradas online. ¿Desvincularla?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmando(false)}
                  className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground text-xs font-semibold hover:bg-muted/70"
                >
                  No, mantener
                </button>
                <button
                  disabled={ocupado}
                  onClick={desvincular}
                  className="flex-1 py-2.5 rounded-xl bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 disabled:opacity-50"
                >
                  Sí, desvincular
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmando(true)}
              className="w-full py-2.5 rounded-xl border border-border text-muted-foreground text-xs font-semibold hover:text-destructive hover:border-destructive/40 transition-colors"
            >
              Desvincular
            </button>
          )}
        </>
      )}

      {estado && !estado.vinculada && (
        <>
          {revocada ? (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle size={16} className="flex-none mt-0.5" />
              <p className="text-xs">
                Mercado Pago ya no acepta el acceso de AsistíAPP a tu cuenta (la desvinculaste desde Mercado Pago o venció). Volvé a
                vincularla para seguir cobrando entradas.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Todavía no vinculaste tu cuenta. Al vincularla, el dinero de tus entradas va directo a tu cuenta de Mercado Pago: AsistíAPP no
              lo toca ni cobra comisión.
            </p>
          )}
          <button onClick={vincular} disabled={ocupado} className={BOTON}>
            {ocupado ? "Redirigiendo…" : revocada ? "Volver a vincular" : "Vincular Mercado Pago"}
          </button>
        </>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </section>
  );
}
