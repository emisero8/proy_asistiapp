import { useEffect, useContext, useId, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useDismiss } from "../lib/useDismiss";
import { MESES, DIAS, toISO, buildGrid } from "../lib/calendar";
import { formatFecha } from "../lib/format";
import { cn } from "../lib/cn";
import { FieldContext, useFieldControl } from "./ui/fieldContext";

type Props = {
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  error?: boolean;
  placeholder?: string;
  /** Muestra un botón "Limpiar" además de "Hoy" — solo tiene sentido en campos opcionales. */
  allowClear?: boolean;
};

/**
 * Selector de fecha con el mismo lenguaje visual que `DateRangeFilter` (popover propio,
 * nada del calendario nativo del navegador, que no se puede restylear más allá del
 * color-scheme). Mantiene un `<input type="date">` real pero visualmente oculto,
 * sincronizado con el mismo value/onChange, para que los tests existentes que lo buscan
 * por `input[type="date"]` y disparan `fireEvent.change` sigan funcionando sin tocarlos.
 */
export function DatePicker({ value, onChange, min, max, error, placeholder = "Elegí una fecha", allowClear }: Props) {
  const [open, setOpen] = useState(false);
  // Dentro de un <Field>: toma su id (el label apunta a este botón), la ayuda/el error y aria-invalid.
  const control = useFieldControl<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>({ "aria-invalid": error || undefined });
  const valorId = useId();
  // Nombre = label del Field + valor visible ("Venta desde, Elegí una fecha"): así el texto que se ve
  // forma parte del nombre accesible (WCAG 2.5.3), y no solo el label.
  const labelId = useContext(FieldContext)?.labelId;
  const [cursor, setCursor] = useState(() => {
    const base = value ? new Date(`${value}T00:00:00`) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const base = value ? new Date(`${value}T00:00:00`) : new Date();
    setCursor(new Date(base.getFullYear(), base.getMonth(), 1));
  }, [open, value]);

  useDismiss(open, () => setOpen(false), [ref]);

  function elegir(iso: string) {
    onChange(iso);
    setOpen(false);
  }

  const grid = buildGrid(cursor.getFullYear(), cursor.getMonth());
  const hoyIso = toISO(new Date());

  return (
    <div className="relative" ref={ref}>
      {/* Puente para los tests existentes — nunca visible ni interactuable por mouse/teclado. */}
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        readOnly
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
      />

      <button
        type="button"
        id={control.id}
        aria-invalid={control["aria-invalid"]}
        aria-labelledby={labelId ? `${labelId} ${valorId}` : undefined}
        aria-describedby={control["aria-describedby"]}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-border-strong bg-card px-3.5 text-left text-sm",
          "transition-[border-color,box-shadow] duration-(--duration-fast) ease-standard",
          "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25",
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus:ring-destructive/25",
          value ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <span id={valorId} className="truncate">{value ? formatFecha(value) : placeholder}</span>
        <Calendar size={15} aria-hidden="true" className="flex-none text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 w-[280px] max-w-[calc(100vw-2rem)] animate-fade-in-up origin-top-left">
          <div className="absolute -top-1.5 left-5 w-3 h-3 rotate-45 bg-card border-l border-t border-border" />
          <div className="relative bg-card border border-border rounded-2xl shadow-overlay p-4">
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150 hover:scale-110 active:scale-90"
                aria-label="Mes anterior"
              >
                <ChevronLeft size={15} />
              </button>
              <p key={`${cursor.getFullYear()}-${cursor.getMonth()}`} className="text-xs font-bold text-foreground uppercase tracking-wide animate-fade-in">
                {MESES[cursor.getMonth()]} {cursor.getFullYear()}
              </p>
              <button
                type="button"
                onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150 hover:scale-110 active:scale-90"
                aria-label="Mes siguiente"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-y-1 mb-1">
              {DIAS.map((d, i) => (
                <div key={i} className="text-center text-2xs font-bold text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1">
              {grid.map((d, i) => {
                const iso = toISO(d);
                const enMes = d.getMonth() === cursor.getMonth();
                const esElegido = value === iso;
                const esHoy = iso === hoyIso;
                const disabled = (min && iso < min) || (max && iso > max);

                return (
                  <div key={i} className="flex justify-center">
                    <button
                      type="button"
                      disabled={!!disabled}
                      onClick={() => elegir(iso)}
                      className={`w-8 h-8 rounded-full text-xs font-semibold transition-all duration-150 flex items-center justify-center ${
                        disabled
                          ? "text-muted-foreground/20 cursor-not-allowed"
                          : "hover:scale-110 active:scale-90"
                      } ${
                        !disabled && !enMes
                          ? "text-muted-foreground/30 hover:text-muted-foreground/60"
                          : esElegido
                            ? "bg-primary text-primary-foreground"
                            : esHoy
                              ? "border border-primary/50 text-primary"
                              : !disabled
                                ? "text-foreground hover:bg-muted"
                                : ""
                      }`}
                    >
                      {d.getDate()}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
              {allowClear ? (
                <button
                  type="button"
                  onClick={() => elegir("")}
                  className="text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors"
                >
                  Limpiar
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                disabled={(min && hoyIso < min) || (max && hoyIso > max) || false}
                onClick={() => elegir(hoyIso)}
                className="text-xs font-bold text-primary hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
              >
                Hoy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
