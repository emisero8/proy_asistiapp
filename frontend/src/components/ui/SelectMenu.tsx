import { useContext, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";
import { useDismiss } from "../../lib/useDismiss";
import { useFloatingPosition, type Ubicacion } from "../../lib/useFloatingPosition";
import { CONTROL, SUPERFICIES, ALTOS, type Superficie, type TamanoControl } from "./controlStyles";
import { FieldContext, useFieldControl } from "./fieldContext";

export interface SelectOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

export interface SelectMenuProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** Texto cuando `value` no coincide con ninguna opción (ej. value ""). Se ve atenuado. */
  placeholder?: string;
  surface?: Superficie;
  size?: TamanoControl;
  disabled?: boolean;
  /** Pinta el control en rojo (igual que `error` en los inputs). Dentro de un `<Field error>` se toma solo. */
  error?: boolean;
  /** Nombre accesible cuando NO está dentro de un `<Field>` (ej. un filtro suelto). */
  "aria-label"?: string;
  /** Solo layout (ancho). El alto/colores vienen de `size`/`surface`. */
  className?: string;
  placement?: Extract<Ubicacion, "bottom-start" | "bottom-end">;
}

/** Texto para el type-ahead: solo si el label es un string plano. */
function textoOpcion(label: ReactNode): string {
  return typeof label === "string" ? label : "";
}

/** Siguiente índice habilitado en `dir` (+1/-1), saltando opciones deshabilitadas. */
function proximoHabilitado(options: SelectOption[], desde: number, dir: 1 | -1): number {
  const n = options.length;
  for (let paso = 1; paso <= n; paso++) {
    const i = (desde + dir * paso + n * paso) % n;
    if (!options[i]?.disabled) return i;
  }
  return desde;
}

/**
 * Combobox editorial (listbox de selección única) que reemplaza al `<select>` nativo donde su
 * desplegable del sistema rompe la estética: disparador con el mismo look que los inputs y un
 * panel propio (borde 1px + `.shadow-hard`) con estados hover/activo/seleccionado claros.
 *
 * - Patrón WAI-ARIA combobox: botón `role="combobox"` + `aria-expanded`/`aria-controls`, panel
 *   `role="listbox"` con opciones `role="option"`; el foco se queda en el disparador y la opción
 *   activa se comunica con `aria-activedescendant` (teclado: ↑/↓, Inicio/Fin, Enter/Espacio,
 *   Escape, Tab, y type-ahead por primera letra).
 * - El panel va en un portal con `position: fixed` (no lo recorta el `overflow` de una tabla o
 *   tarjeta) y se da vuelta hacia arriba si abajo no entra.
 * - Se integra con `<Field>` (toma su `id`, label, ayuda/error y `aria-invalid`); suelto, se le
 *   pasa `aria-label`.
 */
export function SelectMenu({
  value,
  onChange,
  options,
  placeholder,
  surface = "card",
  size = "md",
  disabled,
  error,
  "aria-label": ariaLabel,
  className,
  placement = "bottom-start",
}: SelectMenuProps) {
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const disparadorRef = useRef<HTMLButtonElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ buffer: "", t: 0 });

  const baseId = useId();
  const valueId = `${baseId}-valor`;
  const listboxId = `${baseId}-listbox`;
  const opcionId = (i: number) => `${baseId}-opt-${i}`;

  // Dentro de un <Field>: id (para el htmlFor del label), aria-describedby, aria-invalid.
  const control = useFieldControl<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>({
    "aria-invalid": error || undefined,
  });
  const labelId = useContext(FieldContext)?.labelId;

  const estilo = useFloatingPosition(disparadorRef, listaRef, abierto, placement);
  useDismiss(abierto, () => setAbierto(false), [disparadorRef, listaRef], { escape: false });

  const seleccionada = options.find((o) => o.value === value);

  // Mantener la opción activa a la vista mientras se navega (noop seguro en jsdom).
  useEffect(() => {
    if (abierto) document.getElementById(`${baseId}-opt-${activo}`)?.scrollIntoView?.({ block: "nearest" });
  }, [activo, abierto, baseId]);

  function abrir() {
    if (disabled) return;
    // La opción activa arranca en la seleccionada (o la primera habilitada).
    const idx = options.findIndex((o) => o.value === value);
    setActivo(idx >= 0 ? idx : proximoHabilitado(options, -1, 1));
    setAbierto(true);
  }
  function cerrarYVolver() {
    setAbierto(false);
    disparadorRef.current?.focus();
  }
  function elegir(i: number) {
    const opt = options[i];
    if (!opt || opt.disabled) return;
    onChange(opt.value);
    cerrarYVolver();
  }

  function buscarPorTecla(tecla: string) {
    const ta = typeahead.current;
    window.clearTimeout(ta.t);
    ta.buffer += tecla.toLowerCase();
    ta.t = window.setTimeout(() => (ta.buffer = ""), 500);
    const match = options.findIndex((o) => !o.disabled && textoOpcion(o.label).toLowerCase().startsWith(ta.buffer));
    if (match >= 0) {
      if (abierto) setActivo(match);
      else elegir(match);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (abierto) setActivo((i) => proximoHabilitado(options, i, 1));
        else abrir();
        break;
      case "ArrowUp":
        e.preventDefault();
        if (abierto) setActivo((i) => proximoHabilitado(options, i, -1));
        else abrir();
        break;
      case "Home":
        if (abierto) {
          e.preventDefault();
          setActivo(proximoHabilitado(options, -1, 1));
        }
        break;
      case "End":
        if (abierto) {
          e.preventDefault();
          setActivo(proximoHabilitado(options, 0, -1));
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (abierto) elegir(activo);
        else abrir();
        break;
      case "Escape":
        if (abierto) {
          e.preventDefault();
          e.stopPropagation();
          cerrarYVolver();
        }
        break;
      case "Tab":
        setAbierto(false);
        break;
      default:
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) buscarPorTecla(e.key);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        role="combobox"
        ref={disparadorRef}
        id={control.id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={abierto ? listboxId : undefined}
        aria-activedescendant={abierto ? opcionId(activo) : undefined}
        aria-invalid={control["aria-invalid"]}
        aria-describedby={control["aria-describedby"]}
        aria-label={ariaLabel}
        aria-labelledby={!ariaLabel && labelId ? `${labelId} ${valueId}` : undefined}
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        onKeyDown={onKeyDown}
        className={cn(
          CONTROL,
          SUPERFICIES[surface],
          ALTOS[size],
          "flex items-center justify-between gap-2 pl-4 pr-3 text-left",
          !seleccionada && "text-muted-foreground",
        )}
      >
        <span id={valueId} className="truncate">
          {seleccionada ? seleccionada.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={cn("flex-none text-muted-foreground transition-transform duration-(--duration-fast)", abierto && "rotate-180")}
        />
      </button>

      {abierto &&
        createPortal(
          <ul
            ref={listaRef}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel ?? undefined}
            style={{ ...estilo, minWidth: disparadorRef.current?.offsetWidth }}
            className="z-[90] max-h-72 overflow-auto rounded-xl border border-border-strong bg-popover p-1 shadow-hard animate-scale-in"
          >
            {options.map((opt, i) => {
              const esSeleccionada = opt.value === value;
              const esActiva = i === activo;
              return (
                <li
                  key={opt.value}
                  id={opcionId(i)}
                  role="option"
                  aria-selected={esSeleccionada}
                  aria-disabled={opt.disabled || undefined}
                  onClick={() => elegir(i)}
                  onPointerMove={() => !opt.disabled && setActivo(i)}
                  className={cn(
                    "flex h-9 cursor-pointer items-center justify-between gap-2 rounded-lg px-3 text-sm transition-colors duration-(--duration-fast)",
                    opt.disabled && "cursor-not-allowed opacity-40",
                    esSeleccionada
                      ? "bg-primary font-semibold text-primary-foreground"
                      : esActiva && !opt.disabled
                        ? "bg-muted text-foreground"
                        : "text-foreground",
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {esSeleccionada && <Check size={15} aria-hidden="true" className="flex-none" />}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
}
