import { cn } from "../../lib/cn";

interface SpinnerProps {
  /** Diámetro en px. */
  size?: number;
  /**
   * Texto para lectores de pantalla. Sin `label` el spinner es decorativo (`aria-hidden`):
   * es lo correcto cuando ya hay un texto visible al lado ("Guardando…") o el contenedor
   * tiene su propio `aria-busy`.
   */
  label?: string;
  className?: string;
}

/** Indicador de carga. Gira aun con `prefers-reduced-motion` (es feedback, no decoración). */
export function Spinner({ size = 16, label, className }: SpinnerProps) {
  return (
    <span
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("inline-block flex-none rounded-full border-2 border-current border-t-transparent animate-spin opacity-80", className)}
      style={{ width: size, height: size }}
    />
  );
}
