import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { CheckCircle2, AlertCircle, CircleX, Clock3, QrCode } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import type { EstadoOrdenCreditoResponseDTO, EstadoOrdenEntradasResponseDTO } from "../../lib/types";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

/**
 * A esta pantalla vuelve el comprador (o el Organizador, para créditos) después de
 * pagar en MercadoPago — el back_url de la preferencia apunta acá con `ref` (el
 * external_reference de la orden) y `tipo` ("entradas" | "creditos").
 *
 * El pago se confirma por el webhook de MercadoPago, no por esta redirección: puede
 * llegar antes o (más seguido) después de que el comprador vuelva, así que esta
 * pantalla consulta el estado de la orden y reintenta unas vocês mientras esté
 * Pendiente, en vez de asumir nada de la URL de vuelta.
 */
const REINTENTOS_MAXIMOS = 8;
const ESPERA_ENTRE_REINTENTOS_MS = 2500;

export function PagoResultadoPage() {
  useDocumentTitle("Resultado del pago");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ref = searchParams.get("ref");
  const tipo = searchParams.get("tipo"); // "entradas" | "creditos"

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ordenEntradas, setOrdenEntradas] = useState<EstadoOrdenEntradasResponseDTO | null>(null);
  const [ordenCreditos, setOrdenCreditos] = useState<EstadoOrdenCreditoResponseDTO | null>(null);
  const intentos = useRef(0);

  useEffect(() => {
    if (!ref || (tipo !== "entradas" && tipo !== "creditos")) {
      setError("El enlace no tiene la información necesaria para consultar tu pago.");
      setCargando(false);
      return;
    }

    let cancelado = false;

    async function consultar() {
      try {
        if (tipo === "creditos") {
          const orden = await api.get<EstadoOrdenCreditoResponseDTO>(`/creditos/orden/${ref}`);
          if (cancelado) return;
          setOrdenCreditos(orden);
          reintentarSiHaceFalta(orden.estado);
        } else {
          const orden = await api.get<EstadoOrdenEntradasResponseDTO>(`/tickets/orden/${ref}`, { skipAuth: true });
          if (cancelado) return;
          setOrdenEntradas(orden);
          reintentarSiHaceFalta(orden.estado);
        }
      } catch (e: unknown) {
        if (!cancelado) {
          setError(e instanceof ApiError ? e.message : "No pudimos consultar el estado de tu pago.");
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    function reintentarSiHaceFalta(estado: string) {
      if (estado === "Pendiente" && intentos.current < REINTENTOS_MAXIMOS) {
        intentos.current += 1;
        setTimeout(consultar, ESPERA_ENTRE_REINTENTOS_MS);
      }
    }

    consultar();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, tipo]);

  const orden = tipo === "creditos" ? ordenCreditos : ordenEntradas;
  const estado = orden?.estado ?? null;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/")} className="text-left">
          <span className="text-lg font-extrabold text-foreground tracking-tight">
            Asistí<span className="text-primary">APP</span>
          </span>
        </button>
        <span className="text-muted-foreground text-sm">/ Resultado del pago</span>
      </div>

      <div className="max-w-md mx-auto px-4 py-10">
        {cargando && !orden && (
          <div className="flex flex-col items-center gap-4 text-center py-10">
            <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Consultando el estado de tu pago…</p>
          </div>
        )}

        {!cargando && error && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center">
              <AlertCircle size={24} className="text-destructive" />
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">{error}</p>
            <button onClick={() => navigate("/")} className="text-primary text-sm font-semibold">
              Volver al inicio
            </button>
          </div>
        )}

        {estado && (
          <div className="space-y-5">
            {estado === "Pendiente" && (
              <EstadoCard
                icon={<Clock3 size={24} className="text-amber-500" />}
                iconBg="bg-amber-500/10 border-amber-500/20"
                titulo="Estamos confirmando tu pago"
                texto="Puede tardar unos minutos. Esta pantalla se actualiza sola — no hace falta que la recargues."
              />
            )}

            {estado === "Rechazada" && (
              <EstadoCard
                icon={<CircleX size={24} className="text-destructive" />}
                iconBg="bg-destructive/10 border-destructive/20"
                titulo="El pago no se pudo completar"
                texto="MercadoPago rechazó el pago. No se te cobró nada — podés intentarlo de nuevo."
              />
            )}

            {estado === "Expirada" && (
              <EstadoCard
                icon={<Clock3 size={24} className="text-muted-foreground" />}
                iconBg="bg-muted border-border"
                titulo="La orden venció"
                texto="Pasó el tiempo para completar este pago. Volvé a intentar la compra desde el principio."
              />
            )}

            {estado === "Reembolsada" && (
              <EstadoCard
                icon={<AlertCircle size={24} className="text-amber-500" />}
                iconBg="bg-amber-500/10 border-amber-500/20"
                titulo="Te devolvimos el pago"
                texto="Se cobró el pago pero ya no se podía entregar lo que comprabas (por ejemplo, se agotó el cupo). MercadoPago te reembolsa automáticamente."
              />
            )}

            {estado === "Aprobada" && tipo === "entradas" && ordenEntradas && (
              <div className="space-y-4">
                <EstadoCard
                  icon={<CheckCircle2 size={24} className="text-emerald-500" />}
                  iconBg="bg-emerald-500/10 border-emerald-500/20"
                  titulo="¡Pago aprobado!"
                  texto={`Ya tenés ${ordenEntradas.cantidad > 1 ? `tus ${ordenEntradas.cantidad} entradas` : "tu entrada"} para ${ordenEntradas.nombreEvento}. También te mandamos un mail con el código QR de cada una.`}
                />
                <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
                  {ordenEntradas.entradas.map((entrada, i) => (
                    <button
                      key={entrada.id}
                      onClick={() => navigate(`/mi-entrada?codigoQr=${encodeURIComponent(entrada.codigoQr)}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors"
                    >
                      <QrCode size={16} className="text-primary flex-none" />
                      <span className="text-sm text-foreground flex-1">
                        Entrada {i + 1} de {ordenEntradas.cantidad}
                      </span>
                      <span className="text-xs text-primary font-semibold">Ver</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {estado === "Aprobada" && tipo === "creditos" && ordenCreditos && (
              <EstadoCard
                icon={<CheckCircle2 size={24} className="text-emerald-500" />}
                iconBg="bg-emerald-500/10 border-emerald-500/20"
                titulo="¡Pago aprobado!"
                texto={
                  ordenCreditos.cantidadCreditos != null
                    ? `Se acreditaron ${ordenCreditos.cantidadCreditos} créditos a tu cuenta.`
                    : "Los créditos ya se acreditaron a tu cuenta."
                }
              />
            )}

            <button
              onClick={() => navigate(tipo === "creditos" ? "/organizador/creditos" : "/")}
              className="w-full py-3.5 rounded-2xl bg-card border border-border text-foreground font-semibold text-sm hover:bg-muted transition-colors"
            >
              {tipo === "creditos" ? "Volver a mis créditos" : "Ver más eventos"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EstadoCard({
  icon,
  iconBg,
  titulo,
  texto,
}: {
  icon: React.ReactNode;
  iconBg: string;
  titulo: string;
  texto: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 text-center bg-card border border-border rounded-3xl px-6 py-8">
      <div className={`w-14 h-14 rounded-full border flex items-center justify-center ${iconBg}`}>{icon}</div>
      <h1 className="text-lg font-extrabold text-foreground">{titulo}</h1>
      <p className="text-sm text-muted-foreground max-w-xs">{texto}</p>
    </div>
  );
}
