import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { AlertCircle, Check, CheckCircle2, ChevronRight, CircleX, Clock3, Copy, QrCode, RotateCcw, type LucideIcon } from "lucide-react";
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
 * pantalla consulta el estado de la orden y reintenta mientras esté Pendiente, en
 * vez de asumir nada de la URL de vuelta.
 *
 * En local (http) MercadoPago no puede volver solo, así que el checkout se abre en
 * otra pestaña (ver lib/pago.ts) y esta pantalla queda abierta desde ANTES de pagar:
 * por eso la espera cubre varios minutos y no solo la demora del webhook. 4 s entre
 * consultas = 15/min por pestaña. El rate limit de estas rutas es por IP (120/min), así que
 * varios compradores en un mismo wifi lo pueden compartir: un 429 ("demasiadas solicitudes")
 * se trata como transitorio y se reintenta, no como un error del pago.
 */
export const REINTENTOS_MAXIMOS = 150; // 150 × 4 s = 10 minutos
export const ESPERA_ENTRE_REINTENTOS_MS = 4000;

export function PagoResultadoPage() {
  useDocumentTitle("Resultado del pago");
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const ref = searchParams.get("ref");
  const tipo = searchParams.get("tipo"); // "entradas" | "creditos"
  // Solo viene cuando el pago se abrió en otra pestaña y esta quedó esperando.
  const urlPago = (location.state as { urlPago?: string } | null)?.urlPago ?? null;

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ordenEntradas, setOrdenEntradas] = useState<EstadoOrdenEntradasResponseDTO | null>(null);
  const [ordenCreditos, setOrdenCreditos] = useState<EstadoOrdenCreditoResponseDTO | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);
  // La consulta automática se detiene tras REINTENTOS_MAXIMOS; desde ahí la pantalla lo dice
  // y ofrece volver a consultar, que incrementa `ronda` y reinicia el ciclo.
  const [esperaAgotada, setEsperaAgotada] = useState(false);
  const [ronda, setRonda] = useState(0);

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2500);
    } catch {
      // Clipboard API puede fallar en http sin foco de página — no es crítico, se ignora.
    }
  }

  useEffect(() => {
    if (!ref || (tipo !== "entradas" && tipo !== "creditos")) {
      setError("El enlace no tiene la información necesaria para consultar tu pago.");
      setCargando(false);
      return;
    }

    let cancelado = false;
    let terminado = false;
    let enCurso = false;
    let tieneOrden = false;
    let esperandoPrimeraRespuesta = false; // 429 antes de conocer la orden: se sigue mostrando "Consultando…"
    let intentos = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    setEsperaAgotada(false);

    async function consultar() {
      if (enCurso || terminado || cancelado) return;
      enCurso = true;
      clearTimeout(timer);
      try {
        let estado: string;
        if (tipo === "creditos") {
          const orden = await api.get<EstadoOrdenCreditoResponseDTO>(`/creditos/orden/${ref}`);
          if (cancelado) return;
          setOrdenCreditos(orden);
          estado = orden.estado;
        } else {
          const orden = await api.get<EstadoOrdenEntradasResponseDTO>(`/tickets/orden/${ref}`, { skipAuth: true });
          if (cancelado) return;
          setOrdenEntradas(orden);
          estado = orden.estado;
        }
        tieneOrden = true;
        esperandoPrimeraRespuesta = false;
        if (estado === "Pendiente") {
          programarSiguiente();
        } else {
          terminado = true;
        }
      } catch (e: unknown) {
        if (cancelado) return;
        if (tieneOrden) {
          // Un fallo suelto en medio de una espera de minutos no la corta: se reintenta.
          programarSiguiente();
        } else if (e instanceof ApiError && e.status === 429) {
          // El límite de consultas es por IP: si hay mucha gente en la misma red puede saltar
          // sin que nada ande mal con el pago. Se espera y se reintenta, sin asustar al comprador.
          esperandoPrimeraRespuesta = true;
          programarSiguiente();
        } else {
          terminado = true;
          setError(e instanceof ApiError ? e.message : "No pudimos consultar el estado de tu pago.");
        }
      } finally {
        enCurso = false;
        if (!cancelado && !esperandoPrimeraRespuesta) setCargando(false);
      }
    }

    function programarSiguiente() {
      intentos += 1;
      if (intentos >= REINTENTOS_MAXIMOS) {
        terminado = true;
        if (tieneOrden) {
          setEsperaAgotada(true);
        } else {
          // Nunca se pudo consultar (siempre 429): no queda una pantalla de "Consultando…" eterna.
          esperandoPrimeraRespuesta = false;
          setError("Hay mucha demanda en este momento y no pudimos consultar tu pago. Si ya pagaste, no te preocupes: te llegará la entrada por email. Intentá de nuevo en unos minutos.");
          setCargando(false);
        }
      } else {
        timer = setTimeout(consultar, ESPERA_ENTRE_REINTENTOS_MS);
      }
    }

    // El navegador frena los timers de una pestaña en segundo plano: al volver de la
    // pestaña de MercadoPago se consulta al instante en vez de esperar al próximo tick.
    function alCambiarVisibilidad() {
      if (document.visibilityState === "visible") void consultar();
    }
    document.addEventListener("visibilitychange", alCambiarVisibilidad);

    void consultar();
    return () => {
      cancelado = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    };
  }, [ref, tipo, ronda]);

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
            {estado === "Pendiente" && !esperaAgotada && (
              <EstadoCard
                tono="warning"
                icono={Clock3}
                titulo={urlPago ? "Esperando tu pago" : "Estamos confirmando tu pago"}
                texto={
                  urlPago
                    ? "Completá el pago en la pestaña de MercadoPago que se abrió. Cuando termines, volvé acá: esta pantalla se actualiza sola."
                    : "Puede tardar unos minutos. Esta pantalla se actualiza sola — no hace falta que la recargues."
                }
                consultando
              >
                {urlPago && (
                  <a
                    href={urlPago}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-foreground underline underline-offset-4 hover:text-primary"
                  >
                    ¿Cerraste la pestaña? Abrir MercadoPago de nuevo
                  </a>
                )}
              </EstadoCard>
            )}

            {estado === "Pendiente" && esperaAgotada && (
              <EstadoCard
                tono="warning"
                icono={Clock3}
                titulo="Todavía no recibimos la confirmación"
                texto={`Si ya pagaste, MercadoPago puede demorar unos minutos más en avisarnos. No vuelvas a pagar: consultá de nuevo en un rato.${
                  tipo === "entradas" ? " Cuando se confirme, también te llega un mail con tus entradas." : ""
                }`}
              >
                <Button block onClick={() => setRonda((r) => r + 1)} leftIcon={<RotateCcw size={15} />}>
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
                <div className="space-y-3">
                  <Button
                    variant="secondary"
                    block
                    onClick={copiarLink}
                    leftIcon={linkCopiado ? <Check size={15} /> : <Copy size={15} />}
                  >
                    {linkCopiado ? "Enlace copiado" : "Copiar enlace para compartir"}
                  </Button>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Ojo: este enlace es tu entrada. Quien lo tenga puede ver y usar el QR, así que compartilo solo con quien vaya a ir al evento.
                  </p>
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
                </div>
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
