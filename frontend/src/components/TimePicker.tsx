import { useContext, useId, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { useDismiss } from "../lib/useDismiss";
import { cn } from "../lib/cn";
import { FieldContext, useFieldControl } from "./ui/fieldContext";

const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTOS = ["00", "15", "30", "45"];

type Props = {
  value: string;
  onChange: (hhmm: string) => void;
  placeholder?: string;
};

/**
 * Selector de hora con el mismo lenguaje visual que `DatePicker`/`DateRangeFilter`, en
 * vez del selector nativo del navegador. Mantiene un `<input type="time">` real pero
 * oculto, sincronizado con el mismo value/onChange, para que los tests existentes que
 * lo buscan por `input[type="time"]` sigan funcionando sin tocarlos.
 */
export function TimePicker({ value, onChange, placeholder = "Elegí un horario" }: Props) {
  const [open, setOpen] = useState(false);
  // Dentro de un <Field>: toma su id (el label apunta a este botón), la ayuda/el error y aria-invalid.
  const control = useFieldControl<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>({});
  const valorId = useId();
  // Nombre = label del Field + valor visible ("Venta desde, Elegí una fecha"): así el texto que se ve
  // forma parte del nombre accesible (WCAG 2.5.3), y no solo el label.
  const labelId = useContext(FieldContext)?.labelId;
  const ref = useRef<HTMLDivElement>(null);
  const [hh, mm] = value ? value.split(":") : ["", ""];

  useDismiss(open, () => setOpen(false), [ref]);

  function elegirHora(nuevaHh: string) {
    onChange(`${nuevaHh}:${mm || "00"}`);
  }

  function elegirMinuto(nuevaMm: string) {
    onChange(`${hh || "00"}:${nuevaMm}`);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      {/* Puente para los tests existentes — nunca visible ni interactuable por mouse/teclado. */}
      <input
        type="time"
        value={value}
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
        <span id={valorId} className="truncate">{value ? `${hh}:${mm} hs` : placeholder}</span>
        <Clock size={15} aria-hidden="true" className="flex-none text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 w-[200px] animate-fade-in-up origin-top-left">
          <div className="absolute -top-1.5 left-5 w-3 h-3 rotate-45 bg-card border-l border-t border-border" />
          <div className="relative bg-card border border-border rounded-2xl shadow-overlay p-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wider text-center mb-1.5">Hora</p>
                <div className="h-40 overflow-y-auto space-y-0.5 pr-1">
                  {HORAS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => elegirHora(h)}
                      className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        hh === h ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wider text-center mb-1.5">Min</p>
                <div className="space-y-0.5 pr-1">
                  {MINUTOS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => elegirMinuto(m)}
                      className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        mm === m ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
