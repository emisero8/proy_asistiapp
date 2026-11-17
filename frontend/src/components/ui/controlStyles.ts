/**
 * Estilo base compartido de los controles de formulario (input, textarea, select nativo y el
 * combobox editorial `SelectMenu`). Vive en su propio módulo —no en `Field.tsx`— para no romper
 * el fast-refresh de ese archivo (que solo debe exportar componentes).
 */
export type Superficie = "card" | "sunken";
export type TamanoControl = "sm" | "md";

export const CONTROL =
  "w-full rounded-xl border border-border-strong text-sm text-foreground placeholder:text-muted-foreground " +
  "transition-[border-color,box-shadow] duration-(--duration-fast) ease-standard " +
  "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 " +
  "disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:focus:ring-destructive/25";

export const SUPERFICIES: Record<Superficie, string> = { card: "bg-card", sunken: "bg-surface-sunken" };
export const ALTOS: Record<TamanoControl, string> = { sm: "h-9", md: "h-11" };
