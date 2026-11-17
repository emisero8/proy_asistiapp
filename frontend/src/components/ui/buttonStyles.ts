import { cn } from "../../lib/cn";

/**
 * Clases del botón, separadas de `Button.tsx` para que ese archivo exporte solo componentes
 * (fast refresh) y para que `claseBoton` las reutilice en links.
 */

export type ButtonVariant = "primary" | "accent" | "secondary" | "ghost" | "danger" | "danger-subtle" | "link";
export type ButtonSize = "sm" | "md" | "lg";

export const BASE_BOTON =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap select-none " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-(--duration-fast) ease-standard " +
  "disabled:opacity-50";

export const VARIANTES_BOTON: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground enabled:hover:bg-primary/90 enabled:active:scale-[0.98]",
  /** CTA de "energía en vivo" (ej. pagar): bloque lima con texto carbón y pulsación táctil. */
  accent: "bg-accent text-accent-foreground enabled:hover:brightness-95 enabled:active:scale-[0.98]",
  secondary: "bg-card text-foreground border border-border-strong enabled:hover:bg-muted",
  ghost: "text-foreground enabled:hover:bg-muted",
  danger: "bg-destructive text-destructive-foreground enabled:hover:bg-destructive/90",
  /** Acción destructiva secundaria en una lista (ej. "Dar de baja"): texto rojo, sin relleno. */
  "danger-subtle": "text-destructive enabled:hover:bg-destructive/10",
  link: "text-primary underline-offset-4 enabled:hover:underline rounded-md",
};

export const TAMANOS_BOTON: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

/** El link no tiene alto ni padding de botón: se alinea con el texto que lo rodea. */
export const TAMANOS_LINK: Record<ButtonSize, string> = { sm: "text-xs", md: "text-sm", lg: "text-base" };

/**
 * Clases de botón para un **link** (`<Link className={claseBoton("secondary", "sm")}>`): lo que
 * navega es un link aunque se vea como botón (se abre en otra pestaña, se copia la dirección).
 * Las variantes usan `enabled:hover`, que en un `<a>` no aplica: se suma el hover equivalente.
 */
export function claseBoton(variant: Exclude<ButtonVariant, "link"> = "primary", size: ButtonSize = "md", block = false): string {
  const hover: Record<Exclude<ButtonVariant, "link">, string> = {
    primary: "hover:bg-primary/90 active:scale-[0.98]",
    accent: "hover:brightness-95 active:scale-[0.98]",
    secondary: "hover:bg-muted",
    ghost: "hover:bg-muted",
    danger: "hover:bg-destructive/90",
    "danger-subtle": "hover:bg-destructive/10",
  };
  return cn(BASE_BOTON, VARIANTES_BOTON[variant], hover[variant], TAMANOS_BOTON[size], block && "w-full");
}
