import type { ReactNode } from "react";
import { Link } from "react-router";
import { ChevronLeft } from "lucide-react";
import { cn } from "../../lib/cn";

type Volver = { label: string } & ({ to: string; onClick?: never } | { onClick: () => void; to?: never });

interface PageHeaderProps {
  /** Título de la pantalla — el único `<h1>`. */
  title: ReactNode;
  /** Una línea que agrega información que el título no da (no lo repite). */
  description?: ReactNode;
  /** Contexto corto arriba del título (ej. "Panel del organizador"). */
  eyebrow?: ReactNode;
  back?: Volver;
  /** Acciones de la pantalla (a la derecha en desktop, debajo del título en mobile). */
  actions?: ReactNode;
  className?: string;
}

const CLASE_VOLVER =
  "inline-flex items-center gap-1 self-start rounded-md text-sm font-medium text-muted-foreground transition-colors duration-(--duration-fast) hover:text-foreground";

/** Encabezado de pantalla: un mismo patrón para todas las páginas internas. */
export function PageHeader({ title, description, eyebrow, back, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-3", className)}>
      {back &&
        (back.to !== undefined ? (
          <Link to={back.to} className={CLASE_VOLVER}>
            <ChevronLeft size={16} aria-hidden="true" />
            {back.label}
          </Link>
        ) : (
          <button type="button" onClick={back.onClick} className={CLASE_VOLVER}>
            <ChevronLeft size={16} aria-hidden="true" />
            {back.label}
          </button>
        ))}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{eyebrow}</p>}
          <h1 className="text-xl font-extrabold leading-tight tracking-tight text-foreground lg:text-2xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
