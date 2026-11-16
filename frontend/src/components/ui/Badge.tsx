import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import {
  TONO_ESTADO_ENTRADA,
  TONO_ESTADO_EVENTO,
  TONO_ESTADO_PAQUETE,
  TONO_ESTADO_TRANSACCION,
  TONO_ESTADO_USUARIO,
  type Tono,
} from "../../lib/estados";
import type { EstadoEntrada, EstadoEvento, EstadoPaquete, EstadoTransaccion, EstadoUsuario } from "../../lib/types";

const TONOS: Record<Tono, string> = {
  neutral: "bg-muted text-muted-foreground",
  "neutral-strong": "bg-muted text-foreground",
  primary: "bg-primary/12 text-primary",
  "primary-strong": "bg-primary text-primary-foreground",
  highlight: "bg-highlight text-highlight-foreground",
  success: "bg-success/12 text-success",
  warning: "bg-warning/14 text-warning",
  danger: "bg-destructive/12 text-destructive",
  info: "bg-info/12 text-info",
};

const PUNTOS: Record<Tono, string> = {
  neutral: "bg-muted-foreground",
  "neutral-strong": "bg-foreground",
  primary: "bg-primary",
  "primary-strong": "bg-primary-foreground",
  highlight: "bg-highlight-foreground",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
};

interface BadgeProps {
  tone?: Tono;
  /** Punto de color antes del texto (útil en tablas, donde el badge compite con mucho texto). */
  dot?: boolean;
  size?: "sm" | "md";
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = "neutral", dot = false, size = "md", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full font-semibold",
        size === "sm" ? "h-5 px-2 text-2xs" : "h-6 px-2.5 text-2xs",
        TONOS[tone],
        className,
      )}
    >
      {dot && <span aria-hidden="true" className={cn("size-1.5 rounded-full", PUNTOS[tone])} />}
      {children}
    </span>
  );
}

type StatusBadgeProps = { size?: "sm" | "md"; dot?: boolean; className?: string } & (
  | { tipo: "evento"; estado: EstadoEvento }
  | { tipo: "usuario"; estado: EstadoUsuario }
  | { tipo: "entrada"; estado: EstadoEntrada }
  | { tipo: "transaccion"; estado: EstadoTransaccion }
  | { tipo: "paquete"; estado: EstadoPaquete }
);

function tonoDe(p: StatusBadgeProps): Tono {
  switch (p.tipo) {
    case "evento":
      return TONO_ESTADO_EVENTO[p.estado];
    case "usuario":
      return TONO_ESTADO_USUARIO[p.estado];
    case "entrada":
      return TONO_ESTADO_ENTRADA[p.estado];
    case "transaccion":
      return TONO_ESTADO_TRANSACCION[p.estado];
    case "paquete":
      return TONO_ESTADO_PAQUETE[p.estado];
  }
}

/** Badge de un estado del dominio, con el tono definido en un único lugar (`lib/estados.ts`). */
export function StatusBadge(props: StatusBadgeProps) {
  return (
    <Badge tone={tonoDe(props)} size={props.size} dot={props.dot} className={props.className}>
      {props.estado}
    </Badge>
  );
}
