import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DIAS = ["L", "M", "M", "J", "V", "S", "D"];

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function formatCorto(fechaIso: string): string {
  const [, mes, dia] = fechaIso.split("-");
  return `${Number(dia)} ${MESES_CORTOS[Number(mes) - 1]}`;
}

/** Grilla de 6x7 celdas para el mes dado, con lunes como primer día. */
function buildGrid(year: number, month: number): Date[] {
  const primerDia = new Date(year, month, 1);
  const offset = (primerDia.getDay() + 6) % 7; // 0=lunes
  const inicio = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i));
}

type Props = {
  desde: string;
  hasta: string;
  onChange: (desde: string, hasta: string) => void;
};

export function DateRangeFilter({ desde, hasta, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => {
    const base = desde ? new Date(`${desde}T00:00:00`) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [draftDesde, setDraftDesde] = useState(desde);
  const [draftHasta, setDraftHasta] = useState(hasta);
  const ref = useRef<HTMLDivElement>(null);

  const activo = desde !== "" || hasta !== "";

  useEffect(() => {
    if (!open) return;
    setDraftDesde(desde);
    setDraftHasta(hasta);
    const base = desde ? new Date(`${desde}T00:00:00`) : new Date();
    setCursor(new Date(base.getFullYear(), base.getMonth(), 1));
  }, [open, desde, hasta]);

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

  function pickDay(iso: string) {
    if (!draftDesde || (draftDesde && draftHasta)) {
      setDraftDesde(iso);
      setDraftHasta("");
    } else if (iso < draftDesde) {
      setDraftDesde(iso);
      setDraftHasta("");
    } else {
      setDraftHasta(iso);
    }
  }

  function aplicar() {
    onChange(draftDesde, draftHasta || draftDesde);
    setOpen(false);
  }

  function limpiar() {
    setDraftDesde("");
    setDraftHasta("");
    onChange("", "");
    setOpen(false);
  }

  const grid = buildGrid(cursor.getFullYear(), cursor.getMonth());
  const hoyIso = toISO(new Date());

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Filtrar por rango de fechas"
        className={`flex-none w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-[1.08] active:scale-[0.94] ${
          activo ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-muted text-muted-foreground hover:text-foreground"
        }`}
      >
        <CalendarDays size={15} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-3 z-50 w-[300px] max-w-[calc(100vw-2rem)] animate-fade-in-up origin-top-right">
          {/* Cola de la burbuja */}
          <div className="absolute -top-1.5 right-4 w-3 h-3 rotate-45 bg-card border-l border-t border-border" />

          <div className="relative bg-card border border-border rounded-2xl shadow-xl shadow-black/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <button
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
                onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150 hover:scale-110 active:scale-90"
                aria-label="Mes siguiente"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className={`rounded-xl px-3 py-1.5 border transition-colors duration-300 ${draftDesde ? "border-primary/40 bg-primary/10" : "border-border bg-muted"}`}>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Desde</p>
                <p className={`text-xs font-bold whitespace-nowrap overflow-hidden text-ellipsis transition-colors duration-300 ${draftDesde ? "text-primary" : "text-muted-foreground"}`}>
                  {draftDesde ? formatCorto(draftDesde) : "Elegí un día"}
                </p>
              </div>
              <div className={`rounded-xl px-3 py-1.5 border transition-colors duration-300 ${draftHasta ? "border-primary/40 bg-primary/10" : "border-border bg-muted"}`}>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Hasta</p>
                <p className={`text-xs font-bold whitespace-nowrap overflow-hidden text-ellipsis transition-colors duration-300 ${draftHasta ? "text-primary" : "text-muted-foreground"}`}>
                  {draftHasta ? formatCorto(draftHasta) : "Opcional"}
                </p>
              </div>
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
                const esDesde = draftDesde === iso;
                const esHasta = draftHasta === iso;
                const enRango = draftDesde && draftHasta && iso > draftDesde && iso < draftHasta;
                const esHoy = iso === hoyIso;
                const esPunta = esDesde || esHasta;

                return (
                  <div key={i} className={`relative flex justify-center ${enRango ? "bg-primary/15" : ""} ${esDesde && draftHasta ? "rounded-l-full" : ""} ${esHasta ? "rounded-r-full" : ""}`}>
                    <button
                      onClick={() => pickDay(iso)}
                      className={`w-8 h-8 rounded-full text-xs font-semibold transition-all duration-150 flex items-center justify-center hover:scale-110 active:scale-90 ${
                        !enMes
                          ? "text-muted-foreground/30 hover:text-muted-foreground/60"
                          : esPunta
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                            : esHoy
                              ? "border border-primary/50 text-primary"
                              : "text-foreground hover:bg-muted"
                      }`}
                    >
                      {d.getDate()}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
              <button
                onClick={limpiar}
                className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-destructive transition-all duration-150 hover:scale-[1.05] active:scale-[0.95]"
              >
                <X size={13} />
                Limpiar
              </button>
              <button
                disabled={!draftDesde}
                onClick={aplicar}
                className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all duration-150 hover:scale-[1.05] active:scale-[0.95] disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
