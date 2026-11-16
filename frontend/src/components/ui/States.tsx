import type { ReactNode } from "react";
import { AlertCircle, RotateCcw, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";
import { Button } from "./Button";

/* ------------------------------------------------------------------ */
/* Skeleton                                                            */
/* ------------------------------------------------------------------ */

/**
 * Bloque de carga con la forma del contenido real (tamaño y radio por `className`).
 * Decorativo: el contenedor que lo agrupa debería llevar `aria-busy` o un texto
 * "Cargando…" `sr-only`.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-lg bg-muted", className)} />;
}

/* ------------------------------------------------------------------ */
/* EmptyState                                                          */
/* ------------------------------------------------------------------ */

interface EmptyStateProps {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  /** La acción que resuelve el vacío (ej. "Crear evento"). */
  action?: ReactNode;
  /** `card` con borde punteado (default) o `plain` dentro de una tarjeta que ya existe. */
  variant?: "card" | "plain";
  className?: string;
}

export function EmptyState({ icon: Icono, title, description, action, variant = "card", className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-6 text-center",
        variant === "card" ? "rounded-2xl border border-dashed border-border-strong bg-card/60 py-12" : "py-10",
        className,
      )}
    >
      {Icono && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-secondary/12 text-secondary">
          <Icono size={20} aria-hidden="true" />
        </div>
      )}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ErrorState                                                          */
/* ------------------------------------------------------------------ */

interface ErrorStateProps {
  title?: ReactNode;
  /** El motivo concreto (normalmente el mensaje del backend). */
  description?: ReactNode;
  onRetry?: () => void;
  retrying?: boolean;
  /** Acción secundaria (ej. "Volver al inicio"). */
  secondaryAction?: ReactNode;
  variant?: "card" | "plain";
  className?: string;
}

/** Error de carga de una pantalla o sección: dice qué pasó y ofrece reintentar. */
export function ErrorState({
  title = "No pudimos cargar la información",
  description,
  onRetry,
  retrying = false,
  secondaryAction,
  variant = "card",
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center px-6 text-center",
        variant === "card" ? "rounded-2xl border border-border bg-card py-12" : "py-10",
        className,
      )}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-destructive/12 text-destructive">
        <AlertCircle size={20} aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{description}</p>}
      {(onRetry || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {onRetry && (
            <Button variant="secondary" size="sm" onClick={onRetry} loading={retrying} leftIcon={<RotateCcw size={14} />}>
              Reintentar
            </Button>
          )}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
