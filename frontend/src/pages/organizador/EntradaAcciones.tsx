import { useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "../../lib/api";
import { AVISO_COMISION_REEMBOLSO } from "../../lib/comisionesMp";
import { fmt } from "../../lib/format";
import type { AnularEntradaRequestDTO, EntradaResponseDTO, ResultadoAnulacionResponseDTO } from "../../lib/types";

const boton = "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50";

/** Una compra online (la pagó el comprador por Mercado Pago): las emitidas por el Organizador o vendidas en puerta no tienen pago que devolver. */
function esCompraOnline(e: EntradaResponseDTO): boolean {
  return e.canalVenta === "Online" && !e.tipoEmision;
}

interface Props {
  entrada: EntradaResponseDTO;
  /** Se llama cuando la entrada cambió en el servidor, para que la pantalla recargue. */
  onCambio: () => void;
}

/**
 * Acciones del Organizador sobre una entrada: anularla (con o sin devolver el dinero) o, si ya está anulada
 * y se pagó online, reembolsarla. Una entrada ya usada en la puerta no admite ninguna.
 */
export function EntradaAcciones({ entrada, onCambio }: Props) {
  const [modo, setModo] = useState<"anular" | "reembolsar" | null>(null);
  const [motivo, setMotivo] = useState("");
  const [reembolsar, setReembolsar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const online = esCompraOnline(entrada);
  const puedeAnular = entrada.estado === "Pagada";
  const puedeReembolsar = entrada.estado === "Anulada" && online && !entrada.reembolsadaEn;
  if (!puedeAnular && !puedeReembolsar) return null;

  function cerrar() {
    setModo(null);
    setMotivo("");
    setReembolsar(false);
    setError(null);
  }

  async function ejecutar(accion: () => Promise<void>) {
    setEnviando(true);
    setError(null);
    try {
      await accion();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos completar la acción. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  const anular = () =>
    ejecutar(async () => {
      const pedido: AnularEntradaRequestDTO = { motivo: motivo.trim() || null, reembolsar };
      const r = await api.post<ResultadoAnulacionResponseDTO>(`/tickets/${entrada.id}/anular`, pedido);
      if (r.avisoReembolso) {
        toast.warning(`Entrada anulada, pero no se devolvió el dinero: ${r.avisoReembolso}. Podés reintentarlo con "Reembolsar".`);
      } else {
        toast.success(r.reembolsada ? "Entrada anulada y dinero devuelto" : "Entrada anulada");
      }
      cerrar();
      onCambio();
    });

  const reembolsarDinero = () =>
    ejecutar(async () => {
      await api.post<EntradaResponseDTO>(`/tickets/${entrada.id}/reembolsar`);
      toast.success("Dinero devuelto al comprador");
      cerrar();
      onCambio();
    });

  if (modo === "anular") {
    return (
      <div className="mt-2 rounded-lg border border-border bg-muted/40 p-3 space-y-2 text-left">
        <p className="text-[11px] text-muted-foreground">
          La entrada deja de valer en la puerta. El crédito de esta entrada vuelve a tu saldo, pero el cupo de la tanda no se libera.
        </p>
        <label className="block text-[11px] font-bold text-foreground">
          Motivo (opcional)
          <input
            value={motivo}
            maxLength={200}
            onChange={(e) => setMotivo(e.target.value)}
            className="mt-1 w-full px-2.5 py-1.5 bg-muted rounded-lg text-xs font-normal"
          />
        </label>
        {online && (
          <label className="flex items-start gap-2 text-[11px] text-foreground">
            <input type="checkbox" checked={reembolsar} onChange={(e) => setReembolsar(e.target.checked)} className="mt-0.5" />
            <span>
              Devolverle el dinero que pagó ({fmt(entrada.precioTanda)} de la entrada, más el cargo por procesamiento si lo pagó) desde tu cuenta de
              Mercado Pago
            </span>
          </label>
        )}
        {online && reembolsar && <p className="text-[11px] text-muted-foreground">{AVISO_COMISION_REEMBOLSO}</p>}
        {error && <p role="alert" className="text-[11px] text-destructive">{error}</p>}
        <div className="flex gap-2">
          <button onClick={anular} disabled={enviando} className={`${boton} bg-destructive text-white`}>
            {enviando ? "Anulando…" : "Confirmar anulación"}
          </button>
          <button onClick={cerrar} disabled={enviando} className={`${boton} bg-muted text-muted-foreground`}>
            No, volver
          </button>
        </div>
      </div>
    );
  }

  if (modo === "reembolsar") {
    return (
      <div className="mt-2 rounded-lg border border-border bg-muted/40 p-3 space-y-2 text-left">
        <p className="text-[11px] text-muted-foreground">
          Se le devuelve a {entrada.emailComprador} todo lo que pagó ({fmt(entrada.precioTanda)} de la entrada, más el cargo por procesamiento si lo
          pagó) desde tu cuenta de Mercado Pago. {AVISO_COMISION_REEMBOLSO}
        </p>
        {error && <p role="alert" className="text-[11px] text-destructive">{error}</p>}
        <div className="flex gap-2">
          <button onClick={reembolsarDinero} disabled={enviando} className={`${boton} bg-primary text-primary-foreground`}>
            {enviando ? "Reembolsando…" : "Confirmar reembolso"}
          </button>
          <button onClick={cerrar} disabled={enviando} className={`${boton} bg-muted text-muted-foreground`}>
            No, volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setModo(puedeAnular ? "anular" : "reembolsar")}
      className={`${boton} mt-1 ${puedeAnular ? "bg-muted text-muted-foreground hover:text-destructive" : "bg-primary/15 text-primary"}`}
    >
      {puedeAnular ? "Anular" : "Reembolsar"}
    </button>
  );
}
