import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { CheckCircle2, AlertCircle, CircleX, Clock3, QrCode, Copy, Check } from "lucide-react";
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
              <>
                <EstadoCard
                  icon={<Clock3 size={24} className="text-amber-500" />}
                  iconBg="bg-amber-500/10 border-amber-500/20"
                  titulo={
                    esperaAgotada ? "Todavía no vemos tu pago" : urlPago ? "Esperando tu pago" : "Estamos confirmando tu pago"
                  }
                  texto={
                    esperaAgotada
                      ? "Dejamos de consultar para no dejar la pantalla trabajando de más. Si ya pagaste, tocá el botón para volver a revisar."
                      : urlPago
                        ? "Completá el pago en la pestaña de MercadoPago que se abrió. Cuando termines, volvé acá: esta pantalla se actualiza sola."
                        : "Puede tardar unos minutos. Esta pantalla se actualiza sola — no hace falta que la recargues."
                  }
                />
                {esperaAgotada && (
                  <button
                    onClick={() => setRonda((r) => r + 1)}
                    className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors"
                  >
                    Volver a consultar
                  </button>
                )}
                {urlPago && (
                  <a
                    href={urlPago}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center text-sm font-semibold text-primary hover:underline"
                  >
                    ¿Cerraste la pestaña? Abrir MercadoPago de nuevo
                  </a>
                )}
              </>
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
                <button
                  onClick={copiarLink}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 text-primary text-sm font-semibold hover:bg-primary/10 transition-colors"
                >
                  {linkCopiado ? (
                    <>
                      <Check size={15} /> Enlace copiado
                    </>
                  ) : (
                    <>
                      <Copy size={15} /> Copiar enlace para compartir
                    </>
                  )}
                </button>
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
