import { useLocation, useNavigate } from "react-router";
import { Check } from "lucide-react";
import { API_BASE_URL } from "../../lib/api";
import { formatFecha, formatHora } from "../../lib/format";
import type { EntradaResponseDTO, EventoPublicoDetalleDTO } from "../../lib/types";

interface TicketState {
  entradas: EntradaResponseDTO[];
  evento: EventoPublicoDetalleDTO;
  buyerName: string;
}

export function TicketPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as TicketState | null;

  if (!state || state.entradas.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No encontramos esta entrada acá. Buscala en el email de confirmación que te enviamos.
        </p>
        <button onClick={() => navigate("/")} className="text-primary text-sm font-semibold">
          Volver al inicio
        </button>
      </div>
    );
  }

  const { entradas, evento, buyerName } = state;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="px-4 lg:px-8 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
              <Check size={16} className="text-green-400" />
            </div>
            <div>
              <h2 className="text-base lg:text-lg font-extrabold text-foreground">¡Compra exitosa!</h2>
              <p className="text-xs text-muted-foreground">
                {entradas.length > 1 ? `${entradas.length} entradas enviadas` : "Entrada enviada"} a tu email
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 lg:px-8 py-4 lg:py-6">
          <div className="relative rounded-2xl overflow-hidden mb-4">
            {evento.imagenPortadaUrl ? (
              <img src={evento.imagenPortadaUrl} alt={evento.nombre} className="w-full h-44 lg:h-60 object-cover bg-muted" />
            ) : (
              <div className="w-full h-44 lg:h-60 bg-gradient-to-br from-primary/25 via-card to-background" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="text-white font-extrabold text-lg lg:text-2xl leading-tight">{evento.nombre}</h3>
              <p className="text-white/70 text-xs mt-1">{formatFecha(evento.fechaEvento)} · {evento.lugar}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {entradas.map((entrada, i) => (
              <div key={entrada.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-4 py-4 border-b border-dashed border-border">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {[
                      ["Fecha", formatFecha(evento.fechaEvento)],
                      ["Hora", formatHora(evento.horaEvento)],
                      ["Tanda", entrada.nombreTanda],
                      ["Lugar", evento.lugar],
                      ["Titular", buyerName],
                      ["Entrada", `${i + 1} de ${entradas.length}`],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                        <p className="text-xs font-semibold text-foreground mt-0.5 truncate">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-4 py-5 flex flex-col items-center bg-background/50">
                  <p className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase mb-4">Código de acceso · Uso único</p>
                  <div className="bg-white p-3 rounded-2xl shadow-xl shadow-black/40">
                    <img
                      src={`${API_BASE_URL}/tickets/${entrada.id}/qr-image?codigoQr=${encodeURIComponent(entrada.codigoQr)}`}
                      alt={`QR de la entrada ${entrada.codigoQr}`}
                      width={175}
                      height={175}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 font-mono tracking-wider">{entrada.codigoQr}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate("/")}
            className="mt-4 w-full lg:w-auto lg:px-8 py-3.5 rounded-2xl bg-card border border-border text-foreground font-semibold text-sm hover:bg-muted transition-colors"
          >
            Ver más eventos
          </button>
          <div className="h-8" />
        </div>
      </div>
    </div>
  );
}
