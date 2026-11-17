import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "../../lib/api";
import { fmt } from "../../lib/format";
import type { EntradaResponseDTO, FallaReembolsoDTO, ResultadoReembolsoMasivoResponseDTO } from "../../lib/types";

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

interface Props {
  idEvento: number;
  /** Se llama cuando hubo reembolsos, para que la pantalla recargue entradas y métricas. */
  onCambio: () => void;
}

/**
 * Evento cancelado: devuelve el dinero de todas las compras online desde la cuenta de Mercado Pago del
 * Organizador. Lo que falla (p. ej. saldo insuficiente) queda pendiente y se puede reintentar.
 */
export function ReembolsosPanel({ idEvento, onCambio }: Props) {
  const [pendientes, setPendientes] = useState<EntradaResponseDTO[] | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoReembolsoMasivoResponseDTO | null>(null);
  const [nombres, setNombres] = useState<Record<number, string>>({});

  const cargar = useCallback(async () => {
    try {
      setPendientes(await api.get<EntradaResponseDTO[]>(`/tickets/evento/${idEvento}/reembolsos`));
    } catch {
      setPendientes([]);
    }
  }, [idEvento]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (pendientes === null) return null;

  const total = pendientes.reduce((s, e) => s + (e.precioTanda ?? 0), 0);
  const fallidas: FallaReembolsoDTO[] = resultado?.fallidas ?? [];

  async function reembolsarTodas() {
    setEnviando(true);
    setError(null);
    setNombres(Object.fromEntries((pendientes ?? []).map((e) => [e.id, `${e.nombreComprador} (${e.emailComprador})`])));
    try {
      const r = await api.post<ResultadoReembolsoMasivoResponseDTO>(`/tickets/evento/${idEvento}/reembolsos`);
      setResultado(r);
      setConfirmando(false);
      if (r.reembolsadas > 0) toast.success(`${plural(r.reembolsadas, "compra reembolsada", "compras reembolsadas")}`);
      await cargar();
      onCambio();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos reembolsar. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  const sinPendientes = pendientes.length === 0;
  if (sinPendientes && !resultado) {
    return (
      <section className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-bold text-foreground">Reembolsos</p>
        <p className="text-[11px] text-muted-foreground mt-1">No hay compras pendientes de reembolso.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <p className="text-xs font-bold text-foreground">Reembolsos</p>

      {resultado && (
        <p className="text-[11px] text-foreground">
          {plural(resultado.reembolsadas, "compra reembolsada", "compras reembolsadas")} ({fmt(resultado.montoReembolsado)}).
        </p>
      )}

      {fallidas.length > 0 ? (
        <ul className="space-y-1">
          {fallidas.map((f) => (
            <li key={f.idEntrada} className="text-[11px] text-destructive">
              {f.nombreComprador ?? nombres[f.idEntrada] ?? `Entrada #${f.idEntrada}`}: {f.motivo}
            </li>
          ))}
        </ul>
      ) : sinPendientes ? (
        <p className="text-[11px] text-muted-foreground">No hay compras pendientes de reembolso.</p>
      ) : (
        <>
          <p className="text-[11px] text-muted-foreground">
            {plural(pendientes.length, "compra", "compras")} online por devolver, {fmt(total)} en total.
          </p>
          <ul className="space-y-0.5 max-h-40 overflow-y-auto">
            {pendientes.map((e) => (
              <li key={e.id} className="flex justify-between text-[11px] text-foreground">
                <span>{e.nombreComprador}</span>
                <span>{fmt(e.precioTanda ?? 0)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {error && <p role="alert" className="text-[11px] text-destructive">{error}</p>}

      {!sinPendientes &&
        (confirmando ? (
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground">
              El dinero se devuelve desde tu cuenta de Mercado Pago: tiene que tener saldo suficiente. No se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button onClick={reembolsarTodas} disabled={enviando} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50">
                {enviando ? "Reembolsando…" : "Confirmar"}
              </button>
              <button onClick={() => setConfirmando(false)} disabled={enviando} className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-bold">
                No, volver
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmando(true)} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold">
            {fallidas.length > 0 ? "Reintentar las que fallaron" : "Reembolsar todas"}
          </button>
        ))}
    </section>
  );
}
