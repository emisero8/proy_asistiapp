import { useEffect, useMemo, useState } from "react";
import { Copy, Gift, X } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "../../lib/api";
import type { EmisionOrganizadorRequestDTO, EntradaResponseDTO, EventoResponseDTO, TipoEmision } from "../../lib/types";

/** Mismo tope que EmisionOrganizadorRequestDTO.cantidad en el backend (@Max(100)). */
const MAX_ENTRADAS_POR_EMISION = 100;
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const campo =
  "w-full px-3 py-2.5 bg-muted rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

/** Link público (sin login) donde quien recibe la entrada ve el QR. */
function linkEntrada(codigoQr: string) {
  return `${window.location.origin}/mi-entrada?codigoQr=${encodeURIComponent(codigoQr)}`;
}

async function copiarEnlace(codigoQr: string) {
  try {
    await navigator.clipboard.writeText(linkEntrada(codigoQr));
    toast.success("Enlace copiado");
  } catch {
    toast.error("No pudimos copiar el enlace. Copialo a mano.");
  }
}

interface Props {
  evento: EventoResponseDTO;
  /** Se llama con la emisión ya hecha, para que la pantalla recargue métricas y compradores. */
  onEmitidas: () => void;
}

/**
 * El Organizador emite él mismo entradas de una de sus tandas: cortesías (prensa, invitados) o entradas que
 * cobró por fuera de la plataforma. Salen del cupo de la tanda, que ya está paga en créditos, así que no
 * cuesta nada más. Sin tope por comprador: el límite es el cupo.
 */
export function EmitirEntradasPanel({ evento, onEmitidas }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [idTanda, setIdTanda] = useState<number | null>(null);
  const [tipo, setTipo] = useState<TipoEmision>("Cortesia");
  const [cantidad, setCantidad] = useState("1");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviarMail, setEnviarMail] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emitidas, setEmitidas] = useState<EntradaResponseDTO[]>([]);

  const tandas = evento.tandas;
  // La tanda elegida, o la primera con cupo mientras no se elija ninguna.
  const tanda = useMemo(
    () => tandas.find((t) => t.id === idTanda) ?? tandas.find((t) => t.cupoDisponible > 0) ?? null,
    [tandas, idTanda],
  );

  // Si la tanda elegida se agota mientras el panel está abierto, se vuelve a la primera con cupo.
  useEffect(() => {
    if (idTanda !== null && !tandas.some((t) => t.id === idTanda && t.cupoDisponible > 0)) setIdTanda(null);
  }, [tandas, idTanda]);

  if (evento.estado !== "Publicado" || evento.finalizado) return null;

  const cupo = tanda?.cupoDisponible ?? 0;
  const n = Number(cantidad);
  const cantidadValida = Number.isInteger(n) && n >= 1 && n <= MAX_ENTRADAS_POR_EMISION;
  const excedeElCupo = cantidadValida && n > cupo;
  const listo =
    tanda !== null && cantidadValida && !excedeElCupo && nombre.trim() !== "" && EMAIL_VALIDO.test(email.trim());

  async function emitir(e: React.FormEvent) {
    e.preventDefault();
    if (!listo || !tanda) return;
    setEnviando(true);
    setError(null);
    const pedido: EmisionOrganizadorRequestDTO = {
      idTanda: tanda.id,
      cantidad: n,
      tipo,
      nombreDestinatario: nombre.trim(),
      emailDestinatario: email.trim(),
      motivo: motivo.trim() === "" ? undefined : motivo.trim(),
      enviarMail,
    };
    try {
      const generadas = await api.post<EntradaResponseDTO[]>("/tickets/emision-organizador", pedido);
      setEmitidas(generadas);
      toast.success(generadas.length === 1 ? "Entrada emitida" : `${generadas.length} entradas emitidas`);
      setNombre("");
      setEmail("");
      setMotivo("");
      setCantidad("1");
      onEmitidas();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "No pudimos emitir las entradas. Intentá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (!abierto) {
    return (
      <section className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-foreground">Entradas de cortesía o cobradas por fuera</p>
          <p className="text-[11px] text-muted-foreground">
            Emitilas vos desde una de tus tandas, sin costo extra: ya están pagas en créditos.
          </p>
        </div>
        <button
          onClick={() => setAbierto(true)}
          className="flex-none inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
        >
          <Gift size={13} />
          Emitir entradas
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 lg:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-foreground">Emitir entradas</p>
          <p className="text-[11px] text-muted-foreground">
            Salen del cupo de la tanda que elijas. No hay tope por persona.
          </p>
        </div>
        <button
          onClick={() => setAbierto(false)}
          aria-label="Cerrar"
          className="w-8 h-8 flex-none rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <X size={14} />
        </button>
      </div>

      <form onSubmit={emitir} className="grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="emision-tanda" className="block text-[11px] font-semibold text-muted-foreground mb-1">Tanda</label>
          <select
            id="emision-tanda"
            value={tanda?.id ?? ""}
            onChange={(ev) => setIdTanda(Number(ev.target.value))}
            className={campo}
          >
            {tandas.map((t) => (
              <option key={t.id} value={t.id} disabled={t.cupoDisponible <= 0}>
                {`${t.nombre}${t.soloEmision ? " (cortesía)" : ""}`}
                {t.cupoDisponible > 0 ? ` — quedan ${t.cupoDisponible}` : " — agotada"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="emision-cantidad" className="block text-[11px] font-semibold text-muted-foreground mb-1">Cantidad</label>
          <input
            id="emision-cantidad"
            type="number"
            inputMode="numeric"
            min={1}
            max={Math.min(MAX_ENTRADAS_POR_EMISION, Math.max(cupo, 1))}
            value={cantidad}
            onChange={(ev) => setCantidad(ev.target.value)}
            className={campo}
          />
          {excedeElCupo && (
            <p className="text-[11px] text-destructive mt-1">Solo quedan {cupo} en esta tanda.</p>
          )}
        </div>

        <fieldset className="sm:col-span-2">
          <legend className="block text-[11px] font-semibold text-muted-foreground mb-1">Tipo</legend>
          <div className="flex flex-col sm:flex-row gap-2">
            {(
              [
                ["Cortesia", "Cortesía (se regala)"],
                ["Pago_Externo", "Pago por fuera de la plataforma"],
              ] as const
            ).map(([valor, etiqueta]) => (
              <label
                key={valor}
                className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                  tipo === valor ? "border-primary bg-primary/10 text-foreground" : "border-border bg-muted text-muted-foreground"
                }`}
              >
                <input
                  type="radio"
                  name="emision-tipo"
                  checked={tipo === valor}
                  onChange={() => setTipo(valor)}
                  className="accent-primary"
                />
                {etiqueta}
              </label>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {tipo === "Cortesia"
              ? "Una cortesía no suma a tus ingresos."
              : "Si ya cobraste esta entrada por otro medio, suma a tus ingresos."}
          </p>
        </fieldset>

        <div>
          <label htmlFor="emision-nombre" className="block text-[11px] font-semibold text-muted-foreground mb-1">Nombre de quien las recibe</label>
          <input id="emision-nombre" value={nombre} onChange={(ev) => setNombre(ev.target.value)} maxLength={200} className={campo} />
        </div>
        <div>
          <label htmlFor="emision-email" className="block text-[11px] font-semibold text-muted-foreground mb-1">Email de quien las recibe</label>
          <input
            id="emision-email"
            type="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            maxLength={200}
            className={campo}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="emision-motivo" className="block text-[11px] font-semibold text-muted-foreground mb-1">
            Motivo (opcional, solo lo ves vos)
          </label>
          <input
            id="emision-motivo"
            value={motivo}
            onChange={(ev) => setMotivo(ev.target.value)}
            maxLength={200}
            placeholder="Ej.: prensa, sponsor, canje"
            className={campo}
          />
        </div>

        <label className="sm:col-span-2 flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input type="checkbox" checked={enviarMail} onChange={(ev) => setEnviarMail(ev.target.checked)} className="accent-primary" />
          Enviarles las entradas por mail
        </label>

        {error && <p className="sm:col-span-2 text-sm text-destructive">{error}</p>}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={!listo || enviando}
            className="w-full sm:w-auto sm:px-8 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            {enviando ? "Emitiendo…" : `Emitir ${cantidadValida ? n : ""} ${n === 1 ? "entrada" : "entradas"}`.replace(/\s+/g, " ").trim()}
          </button>
        </div>
      </form>

      {emitidas.length > 0 && (
        <div className="border-t border-border pt-4 space-y-2">
          <p className="text-xs font-bold text-foreground">Últimas entradas emitidas</p>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {emitidas.map((en) => (
              <li key={en.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-mono text-foreground truncate">{en.codigoQr}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{en.nombreComprador} · {en.nombreTanda}</p>
                </div>
                <button
                  onClick={() => copiarEnlace(en.codigoQr)}
                  aria-label={`Copiar el enlace de la entrada ${en.codigoQr}`}
                  className="flex-none inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted text-[11px] font-semibold text-foreground hover:text-primary"
                >
                  <Copy size={11} />
                  Copiar enlace
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground">
            El enlace de cada entrada es la entrada: quien lo tenga puede ingresar al evento. Compartilo solo con quien la recibe.
          </p>
        </div>
      )}
    </section>
  );
}
