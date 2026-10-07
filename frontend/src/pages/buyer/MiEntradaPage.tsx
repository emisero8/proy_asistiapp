import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { QrCode, AlertCircle, Calendar, Ticket } from "lucide-react";
import { api, ApiError, API_BASE_URL } from "../../lib/api";
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

  useEffect(() => {
    if (!codigoQr) {
      setError("No se encontró el código QR en la URL.");
      setLoading(false);
      return;
    }

    api
      .get<EntradaResponseDTO>(`/tickets/by-codigo?codigoQr=${encodeURIComponent(codigoQr)}`, {
        skipAuth: true,
      })
      .then((data) => setEntrada(data))
      .catch((e) => {
        setError(
          e instanceof ApiError
            ? e.message
            : "No pudimos encontrar tu entrada. El código QR puede ser inválido.",
        );
      })
      .finally(() => setLoading(false));
  }, [codigoQr]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (error || !entrada) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center">
          <AlertCircle size={24} className="text-destructive" />
        </div>
        <div>
          <p className="font-semibold text-foreground mb-1">No encontramos tu entrada</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            {error ?? "El código QR no es válido o la entrada no existe."}
          </p>
        </div>
        <button onClick={() => navigate("/")} className="text-primary text-sm font-semibold">
          Volver al inicio
        </button>
      </div>
    );
  }

  const qrImageUrl = `${API_BASE_URL}/tickets/${entrada.id}/qr-image?codigoQr=${encodeURIComponent(entrada.codigoQr)}`;
  const usada = entrada.estado === "Usada";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/")} className="text-left">
          <span className="text-lg font-extrabold text-foreground tracking-tight">
            Asistí<span className="text-primary">APP</span>
          </span>
        </button>
        <span className="text-muted-foreground text-sm">/ Mi entrada</span>
      </div>

      <div className="max-w-md mx-auto px-4 py-8 space-y-4">

        {/* Estado de la entrada */}
        {usada && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 flex gap-3 items-center">
            <AlertCircle size={16} className="text-amber-500 flex-none" />
            <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                          Esta entrada ya fue utilizada {formatRelativo(entrada.fechaUso!)}
            </p>
          </div>
        )}

        {/* Card de la entrada */}
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">

          {/* Info del evento */}
          <div className="px-6 py-5 border-b border-dashed border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Evento</p>
            <h1 className="text-xl font-extrabold text-foreground leading-tight mb-3">
              {entrada.nombreEvento}
            </h1>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Ticket size={13} className="flex-none" />
                <span>Tanda: <strong className="text-foreground">{entrada.nombreTanda}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar size={13} className="flex-none" />
                <span>Compra: {formatRelativo(entrada.fechaCompra)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <QrCode size={13} className="flex-none" />
                <span className="font-mono text-xs break-all">{entrada.codigoQr}</span>
              </div>
            </div>
          </div>

          {/* QR central */}
          <div className="px-6 py-8 flex flex-col items-center bg-background/40">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-5">
              Código de acceso · Uso único
            </p>
            <div
              className={`bg-white p-4 rounded-2xl shadow-xl shadow-black/20 transition-all ${
                usada ? "opacity-40 grayscale" : ""
              }`}
            >
              <img
                src={qrImageUrl}
                alt={`Código QR de tu entrada`}
                width={220}
                height={220}
                className="block"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-4 font-mono tracking-wider text-center">
              {entrada.nombreComprador}
            </p>
          </div>
        </div>

        {/* Aviso */}
        <p className="text-center text-xs text-muted-foreground px-4">
          Mostrá este código QR en la puerta del evento para ingresar. Guardá este link como comprobante.
        </p>

        <button
          onClick={() => navigate("/")}
          className="w-full py-3.5 rounded-2xl bg-card border border-border text-foreground font-semibold text-sm hover:bg-muted transition-colors"
        >
          Ver más eventos
        </button>
      </div>
    </div>
  );
}
