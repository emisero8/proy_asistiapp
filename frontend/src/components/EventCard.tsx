import type { CSSProperties } from "react";
import { Link } from "react-router";
import { ArrowRight, Calendar, MapPin } from "lucide-react";
import { cn } from "../lib/cn";
import { fmt, formatFecha } from "../lib/format";
import type { EventoPublicoListItemDTO } from "../lib/types";
import { EventoImagen } from "./EventoImagen";

interface EventCardProps {
  evento: EventoPublicoListItemDTO;
  /** Etiqueta de ritmo editorial: "Hoy" (fecha) o "Próximo" (primer evento). El cupo tiene prioridad. */
  etiqueta?: string;
  /** Las primeras tarjetas visibles cargan la portada sin `lazy`. */
  prioridad?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** Umbral de "Últimas entradas": queda menos del 15 % del cupo total. */
const UMBRAL_POCAS = 0.15;

/**
 * Tarjeta de evento del catálogo (Home y `/eventos`), con tratamiento de **entrada troquelada**:
 * talón con la portada arriba y cuerpo con los datos abajo, separados por la perforación punteada
 * y las muescas; al pasar el mouse el ticket se "corta" por la perforación (ver `globals.css`).
 * Es un **link** (se abre en otra pestaña, se copia la dirección) con foco visible.
 */
export function EventCard({ evento, etiqueta, prioridad = false, className, style }: EventCardProps) {
  const agotado = evento.cupoDisponibleTotal === 0;
  const ratio = evento.cupoTotal > 0 ? evento.cupoDisponibleTotal / evento.cupoTotal : 1;
  const pocas = !agotado && evento.cupoTotal > 0 && ratio < UMBRAL_POCAS;
  const badge = agotado ? "Agotado" : pocas ? "Últimas entradas" : etiqueta;

  const fecha = formatFecha(evento.fechaEvento);
  const hora = evento.horaEvento.slice(0, 5);
  const tandasTexto = agotado ? "Sin cupo" : `${evento.cantidadTandas} ${evento.cantidadTandas === 1 ? "tanda" : "tandas"}`;

  return (
    <Link
      to={`/eventos/${evento.urlPublica}`}
      className={cn("tkt-link group block h-full", agotado && "tkt-sold", className)}
      style={style}
      aria-label={`${evento.nombre}, ${fecha} ${hora}${evento.precioDesde !== null ? `, desde ${fmt(evento.precioDesde)}` : ""}${agotado ? ", agotado" : ""}`}
    >
      <div className="tkt">
        {/* Talón: portada real del evento + badge dinámico. Vertical en mobile, a la derecha en desktop. */}
        <div className="tkt-stub aspect-[16/10] lg:aspect-auto lg:w-[42%] lg:flex-none">
          <EventoImagen
            src={evento.imagenPortadaUrl}
            alt=""
            loading={prioridad ? "eager" : "lazy"}
            className="size-full object-cover transition-transform duration-300 ease-standard group-hover:scale-[1.04]"
            iconSize={22}
          />
          {badge && <span className={cn("tkt-badge", agotado && "is-sold")}>{badge}</span>}
        </div>

        {/* Cuerpo: datos de la entrada */}
        <div className="tkt-body flex min-w-0 flex-col gap-2 p-3.5 lg:p-5">
          <h3 className="line-clamp-2 font-display text-sm font-bold leading-snug tracking-tight sm:text-base lg:text-lg">
            {evento.nombre}
          </h3>

          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex h-6 items-center gap-1 rounded-full border border-[var(--ticket-line)] px-2 font-mono text-2xs tabular-nums">
              <Calendar size={11} aria-hidden="true" className="flex-none" />
              {fecha} · {hora}
            </span>
            <span className="inline-flex h-6 items-center rounded-full border border-[var(--ticket-line)] px-2 font-mono text-2xs">
              {tandasTexto}
            </span>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-[color:var(--ticket-muted)]">
            <MapPin size={12} aria-hidden="true" className="flex-none" />
            <span className="truncate">{evento.lugar}</span>
          </p>

          <div className="mt-auto flex items-end justify-between gap-2 border-t border-[var(--ticket-line)] pt-2.5">
            <div className="min-w-0">
              <span className="block font-mono text-2xs uppercase tracking-[0.1em] text-[color:var(--ticket-muted)]">Desde</span>
              <span className="block font-mono text-lg font-semibold leading-tight tabular-nums lg:text-xl">
                {evento.precioDesde !== null ? fmt(evento.precioDesde) : "—"}
              </span>
            </div>
            <span className="inline-flex flex-none items-center gap-1 text-sm font-semibold transition-colors duration-(--duration-fast) group-hover:text-[var(--accent)]">
              {agotado ? "Ver evento" : "Ver entradas"}
              <ArrowRight size={15} aria-hidden="true" className="transition-transform duration-(--duration-base) group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/** Esqueleto con la forma de `EventCard` (talón + cuerpo troquelado). */
export function EventCardSkeleton() {
  return (
    <div aria-hidden="true" className="tkt">
      <div className="tkt-stub aspect-[16/10] lg:aspect-auto lg:w-[42%] lg:flex-none">
        <div className="size-full animate-pulse bg-[var(--ticket-bg2)]" />
      </div>
      <div className="tkt-body flex min-w-0 flex-col gap-2 p-3.5 lg:p-5">
        <div className="h-4 w-4/5 animate-pulse rounded bg-[var(--ticket-line)]" />
        <div className="h-5 w-3/5 animate-pulse rounded-full bg-[var(--ticket-line)]" />
        <div className="mt-2 h-6 w-1/2 animate-pulse rounded bg-[var(--ticket-line)]" />
      </div>
    </div>
  );
}
