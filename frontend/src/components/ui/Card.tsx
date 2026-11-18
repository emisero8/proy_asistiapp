import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

type Padding = "none" | "sm" | "md";

const PADDINGS: Record<Padding, string> = { none: "", sm: "p-4", md: "p-5" };

type CardVariant = "default" | "editorial";

const VARIANTES: Record<CardVariant, string> = {
  default: "border-border",
  /** Papel del sistema editorial: borde nítido en `foreground` + sombra dura desplazada (`.shadow-hard`). */
  editorial: "border-foreground shadow-hard",
};

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "article" | "form";
  padding?: Padding;
  /** `editorial`: tarjeta protagonista (borde carbón + sombra dura). Por defecto, sin sombra. */
  variant?: CardVariant;
  /** Solo con `as="form"`: deja la validación a la pantalla (mensajes propios) en vez de la nativa del navegador. */
  noValidate?: boolean;
}

/** Superficie de tarjeta. Por defecto sin sombra: el borde y el contraste con el fondo alcanzan. */
export function Card({ as: Tag = "div", padding = "md", variant = "default", className, ...rest }: CardProps) {
  return <Tag className={cn("rounded-2xl border bg-card", VARIANTES[variant], PADDINGS[padding], className)} {...rest} />;
}

interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Acciones a la derecha del título (un botón chico, un link "Ver todo"). */
  actions?: ReactNode;
  /** Nivel del título según la jerarquía de la página (default `h2`). */
  as?: "h2" | "h3";
  className?: string;
}

export function CardHeader({ title, description, actions, as: Titulo = "h2", className }: CardHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <Titulo className="text-sm font-bold leading-snug text-foreground">{title}</Titulo>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-none items-center gap-2">{actions}</div>}
    </div>
  );
}
