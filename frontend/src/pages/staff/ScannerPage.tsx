import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { CameraOff, ChevronDown, CircleX, Flashlight, FlashlightOff, Hash, LogOut, UserCheck } from "lucide-react";
import { BrandLogo } from "../../components/BrandLogo";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { cn } from "../../lib/cn";
import type { ValidacionQRResponseDTO } from "../../lib/types";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

/*
 * Pantalla SIEMPRE oscura, independiente del tema (se usa en la puerta, de noche, con la
 * cámara de fondo). Por eso es la única excepción documentada en DESIGN.md que usa tonos
 * fijos (blanco con opacidad, verde y rojo) en vez de los tokens del tema.
 */

const SCANNER_ELEMENT_ID = "staff-qr-scanner";
/** Cuánto queda el resultado en pantalla antes de volver a escanear solo. */
const DURACION_VALIDO_MS = 3500;
const DURACION_INVALIDO_MS = 4000;

function errorResult(e: unknown): ValidacionQRResponseDTO {
  return {
    valido: false,
    mensaje: e instanceof ApiError ? e.message : "No pudimos validar este código.",
    idEntrada: null,
    nombreComprador: null,
    emailComprador: null,
    nombreEvento: null,
    nombreTanda: null,
    estadoAnterior: null,
    fechaUso: null,
  };
}

export function StaffScannerPage() {
  useDocumentTitle("Escáner de entradas");
  const { session, logout } = useAuth();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  // Evita que un mismo QR (o varios frames del mismo QR) dispare validaciones repetidas
  // mientras se está resolviendo la petición o mostrando el resultado en pantalla.
  const busyRef = useRef(false);
  const manualId = useId();
  const manualInputRef = useRef<HTMLInputElement>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const [result, setResult] = useState<ValidacionQRResponseDTO | null>(null);
  const [counts, setCounts] = useState({ valid: 0, invalid: 0 });
  const [manualCode, setManualCode] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);

  const registerResult = useCallback((resultado: ValidacionQRResponseDTO) => {
    setCounts((c) => (resultado.valido ? { ...c, valid: c.valid + 1 } : { ...c, invalid: c.invalid + 1 }));
    setResult(resultado);
  }, []);

  const cerrarResultado = useCallback(() => {
    setResult(null);
    busyRef.current = false;
  }, []);

  const handleDecoded = useCallback(
    async (codigoQr: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const resultado = await api.post<ValidacionQRResponseDTO>("/tickets/validate", { codigoQr });
        registerResult(resultado);
      } catch (e: unknown) {
        registerResult(errorResult(e));
      }
    },
    [registerResult],
  );

  useEffect(() => {
    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
    scannerRef.current = scanner;
    // start() es asíncrono (negocia permisos/cámara) — si el componente se desmonta
    // antes de que resuelva, stop() explota de forma SÍNCRONA ("Cannot stop, scanner
    // is not running or paused"). Se rastrea con `cancelled` para frenar recién cuando
    // termine de arrancar, y en el cleanup solo se llama stop() si ya está corriendo.
    let cancelled = false;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          void handleDecoded(decodedText);
        },
        () => {
          // Frame sin QR detectado — es el estado normal mientras se apunta la cámara, no un error.
        },
      )
      .then(() => {
        if (cancelled) {
          scanner.stop().then(() => scanner.clear()).catch(() => {});
        }
      })
      .catch(() => {
        if (!cancelled) setCameraError("No pudimos acceder a la cámara. Revisá los permisos del navegador.");
      });

    return () => {
      cancelled = true;
      const state = scanner.getState();
      if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
        scanner.stop().then(() => scanner.clear()).catch(() => {});
      }
    };
  }, [handleDecoded]);

  // El resultado vuelve solo a escanear; también se cierra con un toque o con teclado.
  useEffect(() => {
    if (!result) return;
    const t = setTimeout(cerrarResultado, result.valido ? DURACION_VALIDO_MS : DURACION_INVALIDO_MS);
    function teclas(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        cerrarResultado();
      }
    }
    window.addEventListener("keydown", teclas);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", teclas);
    };
  }, [result, cerrarResultado]);

  useEffect(() => {
    if (showManual) manualInputRef.current?.focus();
  }, [showManual]);

  async function toggleTorch() {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      await scanner.applyVideoConstraints({ advanced: [{ torch: !torch }] } as unknown as MediaTrackConstraints);
      setTorch((t) => !t);
    } catch {
      // Torch no soportado en este dispositivo/navegador — no bloquea el escaneo.
    }
  }

  async function handleManualValidate(e: FormEvent) {
    e.preventDefault();
    const codigo = manualCode.trim().toUpperCase();
    if (!codigo || busyRef.current) return;
    busyRef.current = true;
    setManualLoading(true);
    try {
      const resultado = await api.post<ValidacionQRResponseDTO>("/tickets/validate", { codigoQr: codigo });
      registerResult(resultado);
    } catch (err: unknown) {
      registerResult(errorResult(err));
    } finally {
      setManualLoading(false);
      setManualCode("");
      setShowManual(false);
    }
  }

  const anuncio = result
    ? result.valido
      ? `Ingreso válido. ${result.nombreComprador ?? ""}${result.nombreTanda ? `, ${result.nombreTanda}` : ""}.`
      : `Entrada inválida. ${result.mensaje}`
    : "";

  return (
    <div className="flex min-h-dvh items-center justify-center bg-black lg:py-8">
      {/* En desktop conserva el marco de teléfono (decisión de la Fase 13): es una herramienta de mano. */}
      <div className="relative flex h-dvh w-full select-none flex-col bg-black lg:h-[800px] lg:max-w-sm lg:overflow-hidden lg:rounded-[2.5rem] lg:border lg:border-white/10 lg:shadow-modal">
        {/* Resultado anunciado para lectores de pantalla (el overlay visual es aria-hidden). */}
        <p role="status" aria-live="assertive" className="sr-only">
          {anuncio}
        </p>

        <header className="relative z-10 flex flex-none items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-5 pb-3 pt-[calc(1rem+env(safe-area-inset-top))] lg:pt-7">
          <div className="flex min-w-0 items-center gap-2.5">
            {/* Siempre negro (excepción documentada) → logo en variante onDark. */}
            <BrandLogo tone="onDark" />
            <div className="min-w-0 border-l border-white/20 pl-2.5">
              <p className="hidden truncate text-2xs uppercase tracking-[0.14em] text-white/60 sm:block">Staff QR · {session?.nombre}</p>
              <h1 className="truncate text-base font-bold leading-tight text-white">Escaneo de entradas</h1>
            </div>
          </div>
          <div className="flex flex-none items-center gap-2">
            <button
              type="button"
              onClick={toggleTorch}
              aria-label={torch ? "Apagar linterna" : "Encender linterna"}
              aria-pressed={torch}
              className={cn(
                "flex size-11 items-center justify-center rounded-full transition-colors duration-(--duration-fast)",
                torch ? "bg-white text-black" : "bg-white/10 text-white/80 hover:bg-white/20",
              )}
            >
              {torch ? <Flashlight size={18} aria-hidden="true" /> : <FlashlightOff size={18} aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={logout}
              aria-label="Cerrar sesión"
              className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors duration-(--duration-fast) hover:bg-white/20"
            >
              <LogOut size={17} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="relative min-h-0 flex-1 bg-neutral-900">
          {cameraError ? (
            <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
              <CameraOff size={30} aria-hidden="true" className="text-white/50" />
              <p className="text-sm text-white/80">{cameraError}</p>
              <p className="text-xs text-white/55">Mientras tanto podés validar con el código de la entrada, más abajo.</p>
            </div>
          ) : (
            <>
              <div id={SCANNER_ELEMENT_ID} className="absolute inset-0 [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
              <p className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-xs font-medium text-white/80 [text-shadow:0_1px_3px_rgb(0_0_0/0.8)]">
                Apuntá al QR de la entrada
              </p>
            </>
          )}
        </div>

        <div className="relative z-10 flex-none bg-gradient-to-t from-black via-black/95 to-transparent px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4">
          <dl className="mb-3 grid grid-cols-2 gap-2">
            {[
              { label: "Válidos", value: counts.valid, color: "text-emerald-300" },
              { label: "Inválidos", value: counts.invalid, color: "text-red-300" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col-reverse rounded-2xl border border-white/10 bg-white/5 py-2.5 text-center">
                <dt className="mt-0.5 text-2xs text-white/60">{s.label}</dt>
                <dd className={cn("text-xl font-extrabold tabular-nums", s.color)}>{s.value}</dd>
              </div>
            ))}
          </dl>

          <button
            type="button"
            aria-expanded={showManual}
            aria-controls={`${manualId}-form`}
            onClick={() => setShowManual((m) => !m)}
            className="flex h-12 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white/80 transition-colors duration-(--duration-fast) hover:bg-white/10"
          >
            <span className="flex items-center gap-2">
              <Hash size={16} aria-hidden="true" />
              Ingresar código manualmente
            </span>
            <ChevronDown size={16} aria-hidden="true" className={cn("transition-transform duration-(--duration-base)", showManual && "rotate-180")} />
          </button>
          {showManual && (
            <form id={`${manualId}-form`} onSubmit={handleManualValidate} className="mt-2 flex gap-2">
              <label htmlFor={`${manualId}-input`} className="sr-only">
                Código de la entrada
              </label>
              <input
                ref={manualInputRef}
                id={`${manualId}-input`}
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="AST-XXXXXX"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="h-12 min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-4 font-mono text-base text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/25"
              />
              <button
                type="submit"
                disabled={manualLoading || !manualCode.trim()}
                aria-busy={manualLoading || undefined}
                className="h-12 rounded-xl bg-white px-5 text-sm font-bold text-black transition-colors duration-(--duration-fast) hover:bg-white/90 disabled:opacity-40"
              >
                {manualLoading ? "Validando…" : "Validar"}
              </button>
            </form>
          )}
        </div>

        {result && (
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={cerrarResultado}
            className={cn("absolute inset-0 z-50 flex flex-col overflow-hidden text-left animate-fade-in", result.valido ? "bg-emerald-950" : "bg-red-950")}
          >
            {/* Cuenta regresiva hasta volver a escanear. */}
            <span className="block h-1.5 w-full bg-white/10">
              <span
                className={cn("block h-full origin-left", result.valido ? "bg-emerald-400" : "bg-red-400")}
                style={{ animation: `vaciar ${result.valido ? DURACION_VALIDO_MS : DURACION_INVALIDO_MS}ms linear forwards` }}
              />
            </span>
            <span className="flex flex-1 flex-col items-center justify-center px-8 text-center">
              <span
                className={cn(
                  "mb-6 flex size-28 items-center justify-center rounded-full border-2 animate-scale-in",
                  result.valido ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-300" : "border-red-400/50 bg-red-400/15 text-red-300",
                )}
              >
                {result.valido ? <UserCheck size={52} strokeWidth={1.8} /> : <CircleX size={52} strokeWidth={1.8} />}
              </span>
              <span className={cn("mb-2 text-sm font-bold uppercase tracking-[0.25em]", result.valido ? "text-emerald-300" : "text-red-300")}>
                {result.valido ? "Ingreso válido" : "Entrada inválida"}
              </span>
              <span className="text-3xl font-extrabold leading-tight text-white">{result.nombreComprador ?? result.mensaje}</span>
              {result.nombreEvento && result.valido && <span className="mt-2 text-sm text-white/70">{result.nombreEvento}</span>}
              {result.nombreTanda && (
                <span
                  className={cn(
                    "mt-6 rounded-2xl border px-5 py-3",
                    result.valido ? "border-emerald-400/25 bg-emerald-400/10" : "border-red-400/25 bg-red-400/10",
                  )}
                >
                  <span className={cn("block text-sm font-bold uppercase tracking-wider", result.valido ? "text-emerald-200" : "text-red-200")}>
                    {result.nombreTanda}
                  </span>
                  {!result.valido && <span className="mt-1 block text-sm text-white/75">{result.mensaje}</span>}
                </span>
              )}
              <span className="mt-8 text-xs text-white/55">Tocá para seguir escaneando</span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
