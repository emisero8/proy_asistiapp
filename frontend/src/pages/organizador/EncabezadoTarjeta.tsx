import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  /** Id del `<h2>`, para el `aria-labelledby` de la tarjeta. */
  id: string;
  /** Número de sección en mono ("01"): ordena la lectura de las tarjetas de Mi perfil. */
  indice: string;
  /** Eyebrow corto en mono, arriba del título ("Identidad", "Cobros"). */
  eyebrow: string;
  icon: LucideIcon;
  children: ReactNode;
  descripcion?: ReactNode;
}

/**
 * Encabezado editorial de las tarjetas de Mi perfil: tile de ícono con borde carbón, eyebrow numerado en
 * IBM Plex Mono y título en Archivo. Debajo, una línea fina separa el encabezado del contenido.
 */
export function EncabezadoTarjeta({ id, indice, eyebrow, icon: Icono, children, descripcion }: Props) {
  return (
    <div className="border-b border-border pb-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 flex-none items-center justify-center rounded-xl border border-foreground bg-surface-sunken text-secondary"
        >
          <Icono size={18} />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-2xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <span className="text-secondary">{indice}</span> · {eyebrow}
          </p>
          <h2 id={id} className="mt-0.5 font-display text-lg font-extrabold leading-tight tracking-[-0.02em] text-foreground">
            {children}
          </h2>
        </div>
      </div>
      {descripcion && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{descripcion}</p>}
    </div>
  );
}
