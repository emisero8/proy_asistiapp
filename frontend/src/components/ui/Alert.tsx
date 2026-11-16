import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

export type AlertTone = "info" | "success" | "warning" | "danger";

const ESTILOS: Record<AlertTone, { caja: string; icono: string; Icono: LucideIcon }> = {
  info: { caja: "border-info/25 bg-info/8", icono: "text-info", Icono: Info },
  success: { caja: "border-success/25 bg-success/10", icono: "text-success", Icono: CheckCircle2 },
  warning: { caja: "border-warning/30 bg-warning/10", icono: "text-warning", Icono: TriangleAlert },
  danger: { caja: "border-destructive/30 bg-destructive/10", icono: "text-destructive", Icono: AlertCircle },
};

interface AlertProps {
  tone?: AlertTone;
  title?: ReactNode;
  /** Acción opcional (ej. un `<Button size="sm">Reintentar</Button>`), a la derecha en desktop. */
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/**
 * Aviso inline. `danger` se anuncia de inmediato (`role="alert"`); el resto, con cortesía
 * (`role="status"`). Para el resultado de una acción puntual, preferir un toast.
 */
export function Alert({ tone = "info", title, action, className, children }: AlertProps) {
  const { caja, icono, Icono } = ESTILOS[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center", caja, className)}
    >
      <div className="flex min-w-0 flex-1 gap-2.5">
        <Icono size={16} aria-hidden="true" className={cn("mt-0.5 flex-none", icono)} />
        <div className="min-w-0 text-sm text-foreground">
          {title && <p className="font-semibold">{title}</p>}
          {children && <div className={title ? "mt-0.5 text-muted-foreground" : undefined}>{children}</div>}
        </div>
      </div>
      {action && <div className="flex-none pl-6.5 sm:pl-0">{action}</div>}
    </div>
  );
}
