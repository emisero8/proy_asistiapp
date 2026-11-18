import { useId, useRef, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../../lib/cn";

/* ------------------------------------------------------------------ */
/* Checkbox                                                            */
/* ------------------------------------------------------------------ */

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  description?: ReactNode;
}

/**
 * Checkbox **nativo** (no un `<button>` que lo imita): se tilda con Espacio, lo anuncian los
 * lectores de pantalla y funciona en formularios. El color sale de `accent-color` (marca).
 * Click en el texto también lo tilda.
 */
export function Checkbox({ label, description, className, id: idProp, ...rest }: CheckboxProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const descId = description ? `${id}-desc` : undefined;
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <input
        id={id}
        type="checkbox"
        aria-describedby={descId}
        className="mt-0.5 size-[18px] flex-none rounded-md accent-primary disabled:opacity-50"
        {...rest}
      />
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-normal leading-snug text-foreground">
          {label}
        </label>
        {description && (
          <p id={descId} className="mt-0.5 text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Switch                                                              */
/* ------------------------------------------------------------------ */

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Nombre accesible — obligatorio aunque no se muestre. */
  label: string;
  /** Muestra `label` como texto a la izquierda del switch. */
  showLabel?: boolean;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** Interruptor de encendido/apagado (`role="switch"`, anuncia "activado/desactivado"). */
export function Switch({ checked, onCheckedChange, label, showLabel = false, description, disabled, className }: SwitchProps) {
  const labelId = useId();
  const descId = useId();
  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={showLabel ? undefined : label}
      aria-labelledby={showLabel ? labelId : undefined}
      aria-describedby={description ? descId : undefined}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-10 flex-none items-center rounded-full transition-colors duration-(--duration-base) ease-standard disabled:opacity-50",
        checked ? "bg-primary" : "bg-switch-background",
        !showLabel && className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-5 rounded-full shadow-raised transition-transform duration-(--duration-base) ease-standard",
          checked ? "translate-x-[18px] bg-primary-foreground" : "translate-x-0.5 bg-white",
        )}
      />
    </button>
  );
  if (!showLabel) return control;
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="min-w-0">
        <span id={labelId} className="block text-sm font-medium text-foreground">
          {label}
        </span>
        {description && (
          <span id={descId} className="block text-xs text-muted-foreground">
            {description}
          </span>
        )}
      </div>
      {control}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* RadioCardGroup                                                      */
/* ------------------------------------------------------------------ */

export interface RadioCardOption<T extends string | number> {
  value: T;
  label: ReactNode;
  description?: ReactNode;
  /** Contenido alineado a la derecha (ej. el precio). */
  aside?: ReactNode;
  disabled?: boolean;
}

interface RadioCardGroupProps<T extends string | number> {
  /** Título del grupo (visible, salvo `labelHidden`). */
  label: string;
  labelHidden?: boolean;
  value: T | null;
  onChange: (value: T) => void;
  options: RadioCardOption<T>[];
  /** Columnas desde `sm:` (en mobile siempre una). */
  columns?: 1 | 2;
  className?: string;
}

/**
 * Grupo de opciones en tarjeta (tandas, packs de créditos) con la semántica de un radio
 * group real: un solo Tab entra al grupo, las flechas mueven y seleccionan, las opciones
 * deshabilitadas se saltean. Reemplaza las listas de `<button>` que solo *parecían* radios.
 */
export function RadioCardGroup<T extends string | number>({
  label,
  labelHidden,
  value,
  onChange,
  options,
  columns = 1,
  className,
}: RadioCardGroupProps<T>) {
  const labelId = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const habilitados = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
  const indiceSeleccionado = options.findIndex((o) => o.value === value && !o.disabled);
  // Roving tabindex: entra por la opción elegida o, si no hay, por la primera habilitada.
  const indiceTabulable = indiceSeleccionado >= 0 ? indiceSeleccionado : (habilitados[0] ?? -1);

  function mover(desde: number, delta: 1 | -1) {
    if (habilitados.length === 0) return;
    const pos = habilitados.indexOf(desde);
    const siguiente = habilitados[(pos + delta + habilitados.length) % habilitados.length];
    onChange(options[siguiente].value);
    refs.current[siguiente]?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      mover(i, 1);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      mover(i, -1);
    }
  }

  return (
    <div className={className}>
      <p id={labelId} className={cn("mb-2.5 text-sm font-semibold text-foreground", labelHidden && "sr-only")}>
        {label}
      </p>
      <div role="radiogroup" aria-labelledby={labelId} className={cn("grid gap-2", columns === 2 && "sm:grid-cols-2")}>
        {options.map((o, i) => {
          const seleccionada = o.value === value;
          return (
            <button
              key={String(o.value)}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={seleccionada}
              disabled={o.disabled}
              tabIndex={i === indiceTabulable ? 0 : -1}
              onClick={() => onChange(o.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-[border-color,background-color] duration-(--duration-fast) ease-standard disabled:opacity-50",
                seleccionada ? "border-primary bg-primary/10" : "border-border bg-card enabled:hover:border-primary/40",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-[18px] flex-none items-center justify-center rounded-full border-2 transition-colors duration-(--duration-fast)",
                  seleccionada ? "border-primary" : "border-border-strong",
                )}
              >
                {seleccionada && <span className="size-2 rounded-full bg-primary" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">{o.label}</span>
                {o.description && <span className="mt-0.5 block text-xs text-muted-foreground">{o.description}</span>}
              </span>
              {o.aside && <span className="flex-none text-sm font-bold text-foreground">{o.aside}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
