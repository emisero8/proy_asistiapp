import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Check, Copy, Info, TriangleAlert } from "lucide-react";
import { DialogContext, type AlertOpciones, type ConfirmOpciones, type DialogosApi, type PromptOpciones } from "../lib/dialogs";

type Solicitud =
  | { tipo: "confirm"; opciones: ConfirmOpciones; resolver: (v: boolean) => void }
  | { tipo: "alert"; opciones: AlertOpciones; resolver: () => void }
  | { tipo: "prompt"; opciones: PromptOpciones; resolver: (v: string | null) => void };

type Pendiente = Solicitud & { id: number };

const FOCUSABLES = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

/**
 * Provee `useDialog()` (confirm / alert / prompt con el diseño de la app, en lugar de los carteles nativos
 * del navegador). Si se piden varios diálogos a la vez se muestran de a uno, en orden.
 */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [cola, setCola] = useState<Pendiente[]>([]);
  const siguienteId = useRef(0);

  const encolar = useCallback((solicitud: Solicitud) => {
    setCola((c) => [...c, { ...solicitud, id: siguienteId.current++ }]);
  }, []);
  const cerrarActual = useCallback(() => setCola((c) => c.slice(1)), []);

  const api = useMemo<DialogosApi>(
    () => ({
      confirm: (opciones) => new Promise<boolean>((resolver) => encolar({ tipo: "confirm", opciones, resolver })),
      alert: (opciones) => new Promise<void>((resolver) => encolar({ tipo: "alert", opciones, resolver })),
      prompt: (opciones) => new Promise<string | null>((resolver) => encolar({ tipo: "prompt", opciones, resolver })),
    }),
    [encolar],
  );

  const actual = cola[0];

  return (
    <DialogContext.Provider value={api}>
      {children}
      {actual && <Dialogo key={actual.id} pendiente={actual} onCerrar={cerrarActual} />}
    </DialogContext.Provider>
  );
}

function Dialogo({ pendiente, onCerrar }: { pendiente: Pendiente; onCerrar: () => void }) {
  const tituloId = useId();
  const mensajeId = useId();
  const inputId = useId();
  const errorId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  const [valor, setValor] = useState("");
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const { opciones } = pendiente;
  const destructiva = pendiente.tipo === "confirm" && pendiente.opciones.variante === "destructiva";

  const cancelar = useCallback(() => {
    if (pendiente.tipo === "confirm") pendiente.resolver(false);
    else if (pendiente.tipo === "alert") pendiente.resolver();
    else pendiente.resolver(null);
    onCerrar();
  }, [pendiente, onCerrar]);

  // Foco inicial, bloqueo del scroll del fondo y devolución del foco a quien abrió el diálogo.
  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("[data-foco-inicial]")?.focus();
    return () => {
      document.body.style.overflow = overflowPrevio;
      if (previo && document.contains(previo)) previo.focus();
    };
  }, []);

  // Escape cancela; Tab/Shift+Tab quedan atrapados dentro del diálogo.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelar();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLES);
      if (focusables.length === 0) return;
      const primero = focusables[0];
      const ultimo = focusables[focusables.length - 1];
      const activo = document.activeElement;
      const afuera = !panelRef.current.contains(activo);
      if (e.shiftKey && (activo === primero || afuera)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (activo === ultimo || afuera)) {
        e.preventDefault();
        primero.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [cancelar]);

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (pendiente.tipo === "prompt") {
      const mensajeError = pendiente.opciones.validar?.(valor) ?? null;
      if (mensajeError) {
        setErrorValidacion(mensajeError);
        return;
      }
      pendiente.resolver(valor);
    } else if (pendiente.tipo === "confirm") {
      pendiente.resolver(true);
    } else {
      pendiente.resolver();
    }
    onCerrar();
  }

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles: el texto está con `select-all`, se puede copiar a mano.
    }
  }

  const textoConfirmar =
    pendiente.tipo === "alert"
      ? (pendiente.opciones.cerrarTexto ?? "Entendido")
      : (pendiente.opciones.confirmarTexto ?? (pendiente.tipo === "prompt" ? "Guardar" : "Confirmar"));

  const botonConfirmarClase = destructiva
    ? "bg-destructive text-destructive-foreground"
    : "bg-primary text-primary-foreground";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) cancelar();
      }}
    >
      <div
        ref={panelRef}
        role={destructiva ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={opciones.mensaje ? mensajeId : undefined}
        className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl shadow-black/40 p-5 animate-fade-in-up"
      >
        <form onSubmit={enviar} noValidate>
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex-none flex items-center justify-center ${
                destructiva ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"
              }`}
            >
              {destructiva ? <TriangleAlert size={18} /> : <Info size={18} />}
            </div>
            <div className="min-w-0 flex-1">
              <h2 id={tituloId} className="text-base font-extrabold text-foreground leading-snug">
                {opciones.titulo}
              </h2>
              {opciones.mensaje && (
                <div id={mensajeId} className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  {opciones.mensaje}
                </div>
              )}
            </div>
          </div>

          {pendiente.tipo === "alert" && pendiente.opciones.copiable && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-background border border-border px-3 py-2.5">
              <code className="flex-1 min-w-0 font-mono text-sm tracking-wider text-foreground break-all select-all">
                {pendiente.opciones.copiable}
              </code>
              <button
                type="button"
                onClick={() => copiar(pendiente.opciones.copiable!)}
                className="flex-none flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                {copiado ? <Check size={13} /> : <Copy size={13} />}
                {copiado ? "Copiado" : "Copiar"}
              </button>
            </div>
          )}

          {pendiente.tipo === "prompt" && (
            <div className="mt-4">
              <label htmlFor={inputId} className="text-xs text-muted-foreground block mb-1.5">
                {pendiente.opciones.etiqueta}
              </label>
              <input
                id={inputId}
                data-foco-inicial
                type={pendiente.opciones.tipo ?? "text"}
                value={valor}
                onChange={(e) => {
                  setValor(e.target.value);
                  setErrorValidacion(null);
                }}
                placeholder={pendiente.opciones.placeholder}
                autoComplete="off"
                aria-invalid={errorValidacion ? true : undefined}
                aria-describedby={errorValidacion ? errorId : undefined}
                className={`w-full px-4 py-3 bg-background border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
                  errorValidacion ? "border-destructive/60" : "border-border"
                }`}
              />
              {errorValidacion && (
                <p id={errorId} role="alert" className="text-xs text-destructive mt-1.5">
                  {errorValidacion}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-5">
            {pendiente.tipo !== "alert" && (
              <button
                type="button"
                onClick={cancelar}
                data-foco-inicial={destructiva ? "" : undefined}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-card border border-border text-foreground font-semibold text-sm hover:bg-muted transition-colors"
              >
                {pendiente.tipo === "confirm" ? (pendiente.opciones.cancelarTexto ?? "Cancelar") : "Cancelar"}
              </button>
            )}
            <button
              type="submit"
              data-foco-inicial={pendiente.tipo === "alert" || (pendiente.tipo === "confirm" && !destructiva) ? "" : undefined}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all ${botonConfirmarClase}`}
            >
              {textoConfirmar}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
