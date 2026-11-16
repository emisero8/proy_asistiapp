import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  /** Contexto de la cifra ("de 2.000 disponibles", "Próximo: Fiesta X"). */
  hint?: ReactNode;
  /**
   * `primary`: la métrica protagonista del panel (una por grupo).
   * `highlight`: un dato a mirar primero, con el acento secundario (usar con mesura).
   */
  emphasis?: "none" | "primary" | "highlight";
  className?: string;
}

const ENFASIS = {
  none: { caja: "border-border bg-card", valor: "text-foreground" },
  primary: { caja: "border-primary/30 bg-primary/[0.08]", valor: "text-primary" },
  highlight: { caja: "border-highlight/30 bg-highlight/[0.08]", valor: "text-highlight" },
} as const;

/** Tarjeta de métrica: una sola versión para los dashboards de Organizador y Admin. */
export function StatCard({ label, value, icon: Icono, hint, emphasis = "none", className }: StatCardProps) {
  const e = ENFASIS[emphasis];
  return (
    <div className={cn("min-w-0 rounded-2xl border p-4", e.caja, className)}>
      <p className="flex items-start gap-1.5 text-2xs font-semibold uppercase leading-tight tracking-[0.12em] text-muted-foreground">
        {Icono && <Icono size={13} aria-hidden="true" className="mt-px flex-none" />}
        <span className="line-clamp-2">{label}</span>
      </p>
      <p className={cn("mt-2 truncate text-xl font-extrabold tabular-nums leading-none lg:text-2xl", e.valor)}>{value}</p>
      {hint && <p className="mt-1.5 truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
