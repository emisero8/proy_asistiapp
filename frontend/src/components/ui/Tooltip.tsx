import { cloneElement, useEffect, useId, useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { useFloatingPosition, type Ubicacion } from "../../lib/useFloatingPosition";

const DEMORA_HOVER_MS = 400;

interface TooltipProps {
  content: string;
  /** Un único elemento enfocable (botón, link). Recibe `aria-describedby` mientras el tooltip está visible. */
  children: ReactElement<{ "aria-describedby"?: string }>;
  placement?: Ubicacion;
}

/**
 * Tooltip liviano: aparece al pasar el mouse (con una demora, para no parpadear al cruzar
 * la pantalla) o al enfocar con teclado; se va al salir, al perder el foco o con Escape.
 * No aparece con touch (en mobile no hay hover y un tap ya ejecuta la acción).
 *
 * Reemplaza al atributo `title`, que no se ve con teclado ni en touch y tarda en mostrarse.
 * Se renderiza en un portal, así no lo recorta ningún `overflow`.
 */
export function Tooltip({ content, children, placement = "top" }: TooltipProps) {
  const [abierto, setAbierto] = useState(false);
  const anclaRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const id = useId();
  const estilo = useFloatingPosition(anclaRef, tipRef, abierto, placement);

  function mostrar(demora: number) {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAbierto(true), demora);
  }
  function ocultar() {
    window.clearTimeout(timer.current);
    setAbierto(false);
  }

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (!abierto) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") ocultar();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [abierto]);

  return (
    <span
      ref={anclaRef}
      className="inline-flex"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") mostrar(DEMORA_HOVER_MS);
      }}
      onPointerLeave={ocultar}
      onPointerDown={ocultar}
      onFocus={(e) => {
        // Solo con foco de teclado: al clickear un botón también se enfoca, y ahí no hace falta.
        let deTeclado = true;
        try {
          deTeclado = (e.target as HTMLElement).matches(":focus-visible");
        } catch {
          // Navegador/entorno sin soporte del selector: se muestra igual.
        }
        if (deTeclado) mostrar(0);
      }}
      onBlur={ocultar}
    >
      {cloneElement(children, { "aria-describedby": abierto ? id : children.props["aria-describedby"] })}
      {abierto &&
        createPortal(
          <div
            ref={tipRef}
            id={id}
            role="tooltip"
            style={estilo}
            className="pointer-events-none z-[110] max-w-xs rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-overlay animate-fade-in"
          >
            {content}
          </div>,
          document.body,
        )}
    </span>
  );
}
