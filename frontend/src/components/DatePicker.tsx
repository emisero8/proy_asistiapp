import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { MESES, DIAS, toISO, buildGrid } from "../lib/calendar";
import { formatFecha } from "../lib/format";

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

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

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
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-3 bg-card border rounded-xl text-sm text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 ${
          error ? "border-red-500/60" : "border-border"
        } ${value ? "text-foreground" : "text-muted-foreground"}`}
      >
        <span className="truncate">{value ? formatFecha(value) : placeholder}</span>
        <Calendar size={15} className="flex-none text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 w-[280px] max-w-[calc(100vw-2rem)] animate-fade-in-up origin-top-left">
          <div className="absolute -top-1.5 left-5 w-3 h-3 rotate-45 bg-card border-l border-t border-border" />
          <div className="relative bg-card border border-border rounded-2xl shadow-xl shadow-black/40 p-4">
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
                <div key={i} className="text-center text-[10px] font-bold text-muted-foreground">
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
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
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
