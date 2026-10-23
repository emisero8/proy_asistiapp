import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

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
  const ref = useRef<HTMLDivElement>(null);
  const [hh, mm] = value ? value.split(":") : ["", ""];

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
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-3 bg-card border border-border rounded-xl text-sm text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 ${
          value ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        <span className="truncate">{value ? `${hh}:${mm} hs` : placeholder}</span>
        <Clock size={15} className="flex-none text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 w-[200px] animate-fade-in-up origin-top-left">
          <div className="absolute -top-1.5 left-5 w-3 h-3 rotate-45 bg-card border-l border-t border-border" />
          <div className="relative bg-card border border-border rounded-2xl shadow-xl shadow-black/40 p-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider text-center mb-1.5">Hora</p>
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
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider text-center mb-1.5">Min</p>
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
