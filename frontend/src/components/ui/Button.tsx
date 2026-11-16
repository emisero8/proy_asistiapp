import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "../../lib/cn";
import { Spinner } from "./Spinner";
import { Tooltip } from "./Tooltip";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap select-none " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-(--duration-fast) ease-standard " +
  "disabled:opacity-50";

const VARIANTES: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground enabled:hover:bg-primary/90 enabled:active:scale-[0.98]",
  secondary: "bg-card text-foreground border border-border-strong enabled:hover:bg-muted",
  ghost: "text-foreground enabled:hover:bg-muted",
  danger: "bg-destructive text-destructive-foreground enabled:hover:bg-destructive/90",
  link: "text-primary underline-offset-4 enabled:hover:underline rounded-md",
};

const TAMANOS: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

/** El link no tiene alto ni padding de botón: se alinea con el texto que lo rodea. */
const TAMANOS_LINK: Record<ButtonSize, string> = { sm: "text-xs", md: "text-sm", lg: "text-base" };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Muestra un spinner, deshabilita el botón y marca `aria-busy` — evita doble envío. */
  loading?: boolean;
  /** Texto mientras `loading` (ej. "Guardando…"). Si no se pasa, se mantiene el texto normal. */
  loadingText?: ReactNode;
  /** Ancho completo. */
  block?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Botón del sistema de diseño. `type="button"` por defecto (un botón dentro de un `<form>`
 * no envía el formulario salvo que se pida `type="submit"`).
 */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingText,
  block = false,
  leftIcon,
  rightIcon,
  disabled,
  className,
  children,
  type = "button",
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        BASE,
        VARIANTES[variant],
        variant === "link" ? TAMANOS_LINK[size] : TAMANOS[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size={size === "sm" ? 12 : 14} /> : leftIcon}
      {loading && loadingText ? loadingText : children}
      {!loading && rightIcon}
    </button>
  );
}

export type IconButtonVariant = "ghost" | "secondary" | "primary" | "danger";

const VARIANTES_ICONO: Record<IconButtonVariant, string> = {
  ghost: "text-muted-foreground enabled:hover:bg-muted enabled:hover:text-foreground",
  secondary: "bg-card border border-border-strong text-foreground enabled:hover:bg-muted",
  primary: "bg-primary text-primary-foreground enabled:hover:bg-primary/90",
  danger: "text-muted-foreground enabled:hover:bg-destructive/10 enabled:hover:text-destructive",
};

const TAMANOS_ICONO: Record<ButtonSize, string> = { sm: "size-8", md: "size-9", lg: "size-11" };

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Nombre accesible — obligatorio: un botón de solo ícono no tiene otro texto. */
  label: string;
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: ButtonSize;
  /** Circular en vez de redondeado. */
  round?: boolean;
  /** Muestra `label` como tooltip al pasar el mouse o enfocar con teclado (default `true`). */
  tooltip?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function IconButton({
  label,
  icon,
  variant = "ghost",
  size = "md",
  round = false,
  tooltip = true,
  className,
  type = "button",
  ref,
  ...rest
}: IconButtonProps) {
  const boton = (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={cn(
        "inline-flex flex-none items-center justify-center transition-colors duration-(--duration-fast) ease-standard disabled:opacity-50",
        round ? "rounded-full" : "rounded-xl",
        TAMANOS_ICONO[size],
        VARIANTES_ICONO[variant],
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  );
  return tooltip ? <Tooltip content={label}>{boton}</Tooltip> : boton;
}
