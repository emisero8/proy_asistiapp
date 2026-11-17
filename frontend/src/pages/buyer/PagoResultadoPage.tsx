import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { AlertCircle, CheckCircle2, ChevronRight, CircleX, Clock3, QrCode, RotateCcw, type LucideIcon } from "lucide-react";
import { PublicHeader } from "../../components/PublicHeader";
import { Button, ErrorState, Spinner } from "../../components/ui";
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
 * pantalla consulta el estado de la orden y reintenta unas veces mientras esté
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
  // La consulta automática se detiene tras REINTENTOS_MAXIMOS; desde ahí la pantalla lo dice
  // (antes seguía diciendo "se actualiza sola" aunque ya no consultaba) y ofrece volver a
  // consultar, que incrementa `consulta` y reinicia el ciclo.
  const [sinConfirmar, setSinConfirmar] = useState(false);
  const [consulta, setConsulta] = useState(0);

  useEffect(() => {
    if (!ref || (tipo !== "entradas" && tipo !== "creditos")) {
      setError("El enlace no tiene la información necesaria para consultar tu pago.");
      setCargando(false);
      return;
    }

    let cancelado = false;
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    intentos.current = 0;
    setSinConfirmar(false);

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
      if (estado !== "Pendiente") return;
      if (intentos.current < REINTENTOS_MAXIMOS) {
        intentos.current += 1;
        temporizador = setTimeout(consultar, ESPERA_ENTRE_REINTENTOS_MS);
      } else {
        setSinConfirmar(true);
      }
    }

    consultar();
    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, tipo, consulta]);

  const orden = tipo === "creditos" ? ordenCreditos : ordenEntradas;
  const estado = orden?.estado ?? null;
  const volver =
    tipo === "creditos"
      ? { texto: "Volver a mis créditos", ir: () => navigate("/organizador/creditos") }
      : { texto: "Ver más eventos", ir: () => navigate("/eventos") };

  return (
    <div className="min-h-dvh bg-background">
      <PublicHeader />

      <main className="mx-auto max-w-md px-4 py-10">
        {cargando && !orden && !error && (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground" role="status">
            <Spinner size={28} className="text-primary" />
            <p className="text-sm">Consultando el estado de tu pago…</p>
          </div>
        )}

        {!cargando && error && (
          <ErrorState
            title="No pudimos consultar tu pago"
            description={error}
            secondaryAction={
              <Button variant="secondary" size="sm" onClick={() => navigate("/")}>
                Volver al inicio
              </Button>
            }
          />
        )}

        {estado && (
          <div className="space-y-4" aria-live="polite">
            {estado === "Pendiente" && !sinConfirmar && (
              <EstadoCard
                tono="warning"
                icono={Clock3}
                titulo="Estamos confirmando tu pago"
                texto="Puede tardar unos minutos. Esta pantalla se actualiza sola — no hace falta que la recargues."
                consultando
              />
            )}

            {estado === "Pendiente" && sinConfirmar && (
              <EstadoCard
                tono="warning"
                icono={Clock3}
                titulo="Todavía no recibimos la confirmación"
                texto={`Si ya pagaste, MercadoPago puede demorar unos minutos más en avisarnos. No vuelvas a pagar: consultá de nuevo en un rato.${
                  tipo === "entradas" ? " Cuando se confirme, también te llega un mail con tus entradas." : ""
                }`}
              >
                <Button block onClick={() => setConsulta((c) => c + 1)} leftIcon={<RotateCcw size={15} />}>
                  Volver a consultar
                </Button>
              </EstadoCard>
            )}

            {estado === "Rechazada" && (
              <EstadoCard
                tono="danger"
                icono={CircleX}
                titulo="El pago no se pudo completar"
                texto="MercadoPago rechazó el pago. No se te cobró nada — podés intentarlo de nuevo."
              />
            )}

            {estado === "Expirada" && (
              <EstadoCard
                tono="neutral"
                icono={Clock3}
                titulo="La orden venció"
                texto="Pasó el tiempo para completar este pago. Volvé a intentar la compra desde el principio."
              />
            )}

            {estado === "Reembolsada" && (
              <EstadoCard
                tono="warning"
                icono={AlertCircle}
                titulo="Te devolvimos el pago"
                texto="Se cobró el pago pero ya no se podía entregar lo que comprabas (por ejemplo, se agotó el cupo). MercadoPago te reembolsa automáticamente."
              />
            )}

            {estado === "Aprobada" && tipo === "entradas" && ordenEntradas && (
              <EstadoCard
                tono="success"
                icono={CheckCircle2}
                titulo="¡Pago aprobado!"
                texto={`Ya tenés ${ordenEntradas.cantidad > 1 ? `tus ${ordenEntradas.cantidad} entradas` : "tu entrada"} para ${ordenEntradas.nombreEvento}. También te mandamos un mail con el código QR de cada una.`}
              >
                <ul className="divide-y divide-dashed divide-border-strong overflow-hidden rounded-xl border border-border-strong text-left">
                  {ordenEntradas.entradas.map((entrada, i) => (
                    <li key={entrada.id}>
                      <Link
                        to={`/mi-entrada?codigoQr=${encodeURIComponent(entrada.codigoQr)}`}
                        className="group flex items-center gap-3 px-4 py-3 transition-colors duration-(--duration-fast) hover:bg-muted"
                      >
                        <span className="flex size-9 flex-none items-center justify-center rounded-lg bg-accent text-accent-foreground">
                          <QrCode size={16} aria-hidden="true" />
                        </span>
                        <span className="flex-1 font-mono text-sm font-medium tabular-nums text-foreground">
                          Entrada {i + 1} de {ordenEntradas.cantidad}
                        </span>
                        <span className="flex items-center gap-0.5 text-xs font-semibold text-foreground">
                          Ver QR
                          <ChevronRight size={14} aria-hidden="true" className="transition-transform duration-(--duration-base) group-hover:translate-x-0.5" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </EstadoCard>
            )}

            {estado === "Aprobada" && tipo === "creditos" && ordenCreditos && (
              <EstadoCard
                tono="success"
                icono={CheckCircle2}
                titulo="¡Pago aprobado!"
                texto={
                  ordenCreditos.cantidadCreditos != null
                    ? `Se acreditaron ${ordenCreditos.cantidadCreditos} créditos a tu cuenta.`
                    : "Los créditos ya se acreditaron a tu cuenta."
                }
              />
            )}

            <Button variant="secondary" block onClick={volver.ir}>
              {volver.texto}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

const TONOS = {
  success: "bg-success/12 text-success",
  warning: "bg-warning/14 text-warning",
  danger: "bg-destructive/12 text-destructive",
  neutral: "bg-muted text-muted-foreground",
} as const;

interface EstadoCardProps {
  tono: keyof typeof TONOS;
  icono: LucideIcon;
  titulo: string;
  texto: string;
  /** Indica que la pantalla sigue consultando sola. */
  consultando?: boolean;
  children?: ReactNode;
}

function EstadoCard({ tono, icono: Icono, titulo, texto, consultando = false, children }: EstadoCardProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border-strong bg-card px-6 py-9 text-center shadow-hard">
      <span className={`flex size-14 items-center justify-center rounded-2xl ${TONOS[tono]}`}>
        <Icono size={26} aria-hidden="true" />
      </span>
      <h1 className="font-display text-xl font-extrabold tracking-tight text-foreground">{titulo}</h1>
      <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{texto}</p>
      {consultando && (
        <span className="flex items-center gap-2 font-mono text-2xs uppercase tracking-[0.1em] text-muted-foreground">
          <Spinner size={12} /> Consultando…
        </span>
      )}
      {children && <div className="mt-2 w-full">{children}</div>}
    </div>
  );
}
