import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";
import { useDismiss } from "../../lib/useDismiss";
import { useFloatingPosition, type Ubicacion } from "../../lib/useFloatingPosition";
import { IconButton } from "./Button";

export interface MenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  /** `danger` para acciones destructivas (van al final, separadas). */
  tone?: "default" | "danger";
  disabled?: boolean;
  /** Línea divisoria antes de este ítem. */
  separatorBefore?: boolean;
}

interface MenuProps {
  /** Nombre accesible del disparador, con contexto: "Acciones de Juan Pérez". */
  label: string;
  items: MenuItem[];
  /** Ícono del disparador (default: tres puntos). */
  icon?: ReactNode;
  disabled?: boolean;
  placement?: Extract<Ubicacion, "bottom-start" | "bottom-end">;
}

const SELECTOR_ITEMS = '[role="menuitem"]:not([disabled])';

/**
 * Menú de acciones (tres puntos) con el patrón de menú de WAI-ARIA:
 * - Abre con click, Enter, Espacio o Flecha abajo; el foco va al primer ítem.
 * - Flechas, Inicio y Fin recorren los ítems; Escape cierra y devuelve el foco al disparador;
 *   Tab cierra y sigue el recorrido normal; click afuera cierra.
 * - Se renderiza en un portal con `position: fixed`: **no lo recorta** el `overflow` de una
 *   tabla (antes el menú de las últimas filas quedaba cortado) y se da vuelta hacia arriba si
 *   abajo no entra.
 */
export function Menu({ label, items, icon, disabled, placement = "bottom-end" }: MenuProps) {
  const [abierto, setAbierto] = useState(false);
  const disparadorRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const estilo = useFloatingPosition(disparadorRef, menuRef, abierto, placement);

  useDismiss(abierto, () => setAbierto(false), [disparadorRef, menuRef], { escape: false });

  useEffect(() => {
    if (abierto) menuRef.current?.querySelector<HTMLElement>(SELECTOR_ITEMS)?.focus();
  }, [abierto]);

  function cerrarYVolver() {
    setAbierto(false);
    disparadorRef.current?.focus();
  }

  function onKeyDownMenu(e: KeyboardEvent<HTMLDivElement>) {
    const lista = Array.from(menuRef.current?.querySelectorAll<HTMLElement>(SELECTOR_ITEMS) ?? []);
    const actual = lista.indexOf(document.activeElement as HTMLElement);
    const ir = (i: number) => lista[(i + lista.length) % lista.length]?.focus();
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        ir(actual + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        ir(actual - 1);
        break;
      case "Home":
        e.preventDefault();
        ir(0);
        break;
      case "End":
        e.preventDefault();
        ir(lista.length - 1);
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        cerrarYVolver();
        break;
      case "Tab":
        setAbierto(false);
        break;
    }
  }

  return (
    <>
      <IconButton
        ref={disparadorRef}
        label={label}
        icon={icon ?? <MoreHorizontal size={16} />}
        size="sm"
        tooltip={false}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? id : undefined}
        onClick={() => setAbierto((a) => !a)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !abierto) {
            e.preventDefault();
            setAbierto(true);
          }
        }}
        className={cn(abierto && "bg-muted text-foreground")}
      />
      {abierto &&
        createPortal(
          <div
            ref={menuRef}
            id={id}
            role="menu"
            aria-label={label}
            style={estilo}
            onKeyDown={onKeyDownMenu}
            className="z-[90] min-w-[190px] rounded-xl border border-border bg-popover p-1 shadow-overlay animate-scale-in"
          >
            {items.map((item) => (
              <div key={item.label}>
                {item.separatorBefore && <div role="separator" className="my-1 h-px bg-border" />}
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  disabled={item.disabled}
                  onClick={() => {
                    cerrarYVolver();
                    item.onSelect();
                  }}
                  className={cn(
                    "flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm font-medium transition-colors duration-(--duration-fast) focus:outline-none disabled:opacity-50",
                    item.tone === "danger"
                      ? "text-destructive enabled:hover:bg-destructive/10 focus-visible:bg-destructive/10"
                      : "text-foreground enabled:hover:bg-muted focus-visible:bg-muted",
                  )}
                >
                  {item.icon && <item.icon size={15} aria-hidden="true" className="flex-none" />}
                  {item.label}
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
