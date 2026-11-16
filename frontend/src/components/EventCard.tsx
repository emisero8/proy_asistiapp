import type { CSSProperties } from "react";
import { Link } from "react-router";
import { Calendar, MapPin } from "lucide-react";
import { cn } from "../lib/cn";
import { fmt, formatFecha } from "../lib/format";
import type { EventoPublicoListItemDTO } from "../lib/types";
import { EventoImagen } from "./EventoImagen";
import { Badge } from "./ui";

interface EventCardProps {
  evento: EventoPublicoListItemDTO;
  /** Etiqueta sobre la portada: "Hoy" va con --accent (atención) y el resto ("Próximo") con --secondary. */
  etiqueta?: string;
  /** Las primeras tarjetas visibles cargan la portada sin `lazy`. */
  prioridad?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Tarjeta de evento del catálogo (Home y `/eventos`): portada 3:4, precio "Desde", nombre,
 * fecha y lugar. Es un **link** (no un botón): se puede abrir en otra pestaña, copiar la
 * dirección, y tiene foco visible con teclado (antes `focus:outline-none` lo ocultaba).
 */
export function EventCard({ evento, etiqueta, prioridad = false, className, style }: EventCardProps) {
  return (
    <Link to={`/eventos/${evento.urlPublica}`} className={cn("group block rounded-2xl", className)} style={style}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-border bg-muted transition-[border-color,box-shadow] duration-(--duration-base) ease-standard group-hover:border-primary/40 group-hover:shadow-raised">
        <EventoImagen
          src={evento.imagenPortadaUrl}
          alt=""
          loading={prioridad ? "eager" : "lazy"}
          className="size-full object-cover transition-transform duration-300 ease-standard group-hover:scale-[1.03]"
          iconSize={22}
        />
        {etiqueta && (
          <Badge tone={etiqueta === "Hoy" ? "accent" : "highlight"} className="absolute left-2.5 top-2.5 shadow-raised">
            {etiqueta}
          </Badge>
        )}
        {evento.precioDesde !== null && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-background/90 px-2.5 py-1 text-2xs font-bold text-foreground shadow-raised backdrop-blur-sm">
            Desde {fmt(evento.precioDesde)}
          </span>
        )}
      </div>
      <h3 className="mt-3 line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors duration-(--duration-fast) group-hover:text-primary">
        {evento.nombre}
      </h3>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Calendar size={12} aria-hidden="true" className="flex-none" />
        {formatFecha(evento.fechaEvento)}
      </p>
      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin size={12} aria-hidden="true" className="flex-none" />
        <span className="truncate">{evento.lugar}</span>
      </p>
    </Link>
  );
}

/** Esqueleto con la forma de `EventCard`. */
export function EventCardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="aspect-[3/4] animate-pulse rounded-2xl bg-muted" />
      <div className="mt-3 h-4 w-4/5 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted" />
    </div>
  );
}
