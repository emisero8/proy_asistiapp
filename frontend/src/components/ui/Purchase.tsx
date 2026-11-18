import type { ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "../../lib/cn";
import { IconButton } from "./Button";

/* ------------------------------------------------------------------ */
/* QuantityStepper                                                     */
/* ------------------------------------------------------------------ */

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
  disabled?: boolean;
  /** Nombre del grupo para lectores de pantalla. */
  label?: string;
  decrementLabel?: string;
  incrementLabel?: string;
  className?: string;
}

/**
 * Selector de cantidad (−/+). Se usa en el Detalle del evento y en el POS. Los botones se
 * deshabilitan en los topes y la cifra se anuncia al cambiar (`aria-live`).
 * Botones de 40 px: cómodos con el pulgar en mobile.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  disabled = false,
  label = "Cantidad",
  decrementLabel = "Quitar una entrada",
  incrementLabel = "Agregar una entrada",
  className,
}: QuantityStepperProps) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex items-center gap-3", className)}>
      <IconButton
        label={decrementLabel}
        icon={<Minus size={14} />}
        variant="secondary"
        size="lg"
        round
        tooltip={false}
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      />
      <output aria-live="polite" className="min-w-8 text-center text-lg font-bold tabular-nums text-foreground">
        {value}
      </output>
      <IconButton
        label={incrementLabel}
        icon={<Plus size={14} />}
        variant="primary"
        size="lg"
        round
        tooltip={false}
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* StickyActionBar                                                     */
/* ------------------------------------------------------------------ */

interface StickyActionBarProps {
  /** Resumen a la izquierda (ej. "2 × General" o la miniatura + nombre del evento). */
  summary?: ReactNode;
  /** Total o dato a la derecha del resumen. */
  amount?: ReactNode;
  /** La acción principal (normalmente un `<Button block size="lg">`). */
  children: ReactNode;
}

/**
 * Barra fija inferior con la acción principal de la pantalla, **solo en mobile/tablet**
 * (`lg:hidden`): en desktop esa acción vive en un panel lateral sticky. Respeta el área segura
 * del iPhone. La página tiene que dejar espacio al final (`pb-40 lg:pb-0`) para que la barra
 * no tape contenido.
 */
export function StickyActionBar({ summary, amount, children }: StickyActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
      <div className="mx-auto max-w-xl space-y-3">
        {(summary || amount) && (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 text-xs text-muted-foreground">{summary}</div>
            {amount && <div className="flex-none text-base font-extrabold tabular-nums text-foreground">{amount}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
