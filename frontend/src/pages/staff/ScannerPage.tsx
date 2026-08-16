import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { AlertCircle, ChevronDown, CircleX, Flashlight, FlashlightOff, Hash, LogOut, UserCheck } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import type { ValidacionQRResponseDTO } from "../../lib/types";

const SCANNER_ELEMENT_ID = "staff-qr-scanner";

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
  const { session, logout } = useAuth();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  // Evita que un mismo QR (o varios frames del mismo QR) dispare validaciones repetidas
  // mientras se está resolviendo la petición o mostrando el resultado en pantalla.
  const busyRef = useRef(false);

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

  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => {
      setResult(null);
      busyRef.current = false;
    }, result.valido ? 3500 : 4000);
    return () => clearTimeout(t);
  }, [result]);

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

  async function handleManualValidate() {
    const codigo = manualCode.trim().toUpperCase();
    if (!codigo || busyRef.current) return;
    busyRef.current = true;
    setManualLoading(true);
    try {
      const resultado = await api.post<ValidacionQRResponseDTO>("/tickets/validate", { codigoQr: codigo });
      registerResult(resultado);
    } catch (e: unknown) {
      registerResult(errorResult(e));
    } finally {
      setManualLoading(false);
      setManualCode("");
      setShowManual(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center lg:py-8">
      <div className="relative flex flex-col w-full h-screen lg:h-[800px] lg:max-w-sm lg:rounded-[2.5rem] lg:overflow-hidden lg:border lg:border-white/10 lg:shadow-2xl lg:shadow-black/50 bg-black select-none">
        <div className="relative flex-none flex items-center justify-between px-6 pt-6 lg:pt-8 pb-3 z-10 bg-gradient-to-b from-black/80 to-transparent">
          <div>
            <p className="text-white/50 text-[10px] tracking-widest uppercase">Staff QR · {session?.nombre}</p>
            <p className="text-white text-sm font-bold leading-tight">Escaneo de entradas</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTorch}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${torch ? "bg-amber-400 text-black" : "bg-white/10 text-white/70"}`}
            >
              {torch ? <Flashlight size={16} /> : <FlashlightOff size={16} />}
            </button>
            <button
              onClick={logout}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-colors"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>

        <div className="relative flex-1 min-h-0 bg-neutral-900">
          {cameraError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
              <AlertCircle size={28} className="text-white/40" />
              <p className="text-white/60 text-sm">{cameraError}</p>
              <p className="text-white/30 text-xs">Podés usar el código manual más abajo mientras tanto.</p>
            </div>
          ) : (
            <div id={SCANNER_ELEMENT_ID} className="absolute inset-0 [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />
          )}
        </div>

        <div className="relative flex-none z-10 px-4 pb-8 pt-4 bg-gradient-to-t from-black via-black/90 to-transparent">
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: "Válidos", value: counts.valid, color: "text-emerald-400" },
              { label: "Inválidos", value: counts.invalid, color: "text-red-400" },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 rounded-2xl py-2.5 text-center border border-white/[0.08]">
                <p className={`text-lg font-extrabold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-white/40 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowManual((m) => !m)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white/5 border border-white/[0.08] text-white/60 text-xs font-semibold hover:bg-white/8 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Hash size={14} />
              Ingresar código manualmente
            </span>
            <ChevronDown size={14} className={`transition-transform ${showManual ? "rotate-180" : ""}`} />
          </button>
          {showManual && (
            <div className="flex gap-2 mt-2">
              <input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="AST-XXXXXX"
                className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                disabled={manualLoading || !manualCode.trim()}
                onClick={handleManualValidate}
                className="px-4 py-2.5 bg-primary rounded-xl text-white text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {manualLoading ? "..." : "Validar"}
              </button>
            </div>
          )}
        </div>

        {result && (
          <div
            className={`absolute inset-0 z-50 flex flex-col overflow-hidden ${result.valido ? "bg-emerald-950" : "bg-red-950"}`}
            onClick={() => {
              setResult(null);
              busyRef.current = false;
            }}
          >
            <div className={`h-1.5 w-full ${result.valido ? "bg-emerald-400" : "bg-red-500"}`} />
            <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
              <div
                className={`w-24 h-24 rounded-full border-2 flex items-center justify-center mb-6 ${
                  result.valido ? "bg-emerald-400/15 border-emerald-400/40" : "bg-red-500/15 border-red-500/40"
                }`}
              >
                {result.valido ? (
                  <UserCheck size={44} className="text-emerald-400" strokeWidth={1.8} />
                ) : (
                  <CircleX size={44} className="text-red-400" strokeWidth={1.8} />
                )}
              </div>
              <p className={`text-xs font-bold tracking-[0.3em] uppercase mb-2 ${result.valido ? "text-emerald-400" : "text-red-400"}`}>
                {result.valido ? "Ingreso válido" : "Entrada inválida"}
              </p>
              <h2 className="text-white text-2xl lg:text-3xl font-extrabold leading-tight mb-1">
                {result.nombreComprador ?? result.mensaje}
              </h2>
              {result.nombreTanda && (
                <div className={`mt-6 px-5 py-3 rounded-2xl border text-center ${result.valido ? "bg-emerald-400/10 border-emerald-400/20" : "bg-red-500/10 border-red-500/20"}`}>
                  <p className={`text-xs font-bold tracking-wider uppercase ${result.valido ? "text-emerald-300" : "text-red-400"}`}>{result.nombreTanda}</p>
                  {!result.valido && <p className="text-white/50 text-[11px] mt-0.5">{result.mensaje}</p>}
                </div>
              )}
              <p className="text-white/25 text-xs mt-6">Toca para continuar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
