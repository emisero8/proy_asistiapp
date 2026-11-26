import { Link } from "react-router";
import { ArrowRight, CalendarPlus, ScanLine, Ticket, type LucideIcon } from "lucide-react";
import { PublicHeader } from "../../components/PublicHeader";
import { Card } from "../../components/ui";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { GUIAS, type SlugGuia } from "./contenido";

const ICONOS: Record<SlugGuia, LucideIcon> = { compradores: Ticket, organizadores: CalendarPlus, staff: ScanLine };

/** Índice del centro de ayuda: una tarjeta por guía. */
export function AyudaPage() {
  useDocumentTitle("Ayuda");
  return (
    <div className="min-h-dvh bg-background">
      <PublicHeader back={{ to: "/", label: "Volver al inicio" }} />
      <main className="mx-auto max-w-6xl px-4 py-10 lg:px-8 lg:py-14">
        <p className="font-mono text-2xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Centro de ayuda</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold leading-[1.02] tracking-[-0.02em] text-foreground lg:text-4xl">¿Cómo te ayudamos?</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Guías para comprar entradas, organizar un evento y trabajar en la puerta.
        </p>

        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {GUIAS.map((guia) => {
            const Icono = ICONOS[guia.slug];
            return (
              <li key={guia.slug}>
                <Link to={`/ayuda/${guia.slug}`} className="group block h-full rounded-2xl">
                  <Card className="flex h-full flex-col gap-3 transition-colors duration-(--duration-fast) group-hover:border-border-strong">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-foreground">
                      <Icono size={18} aria-hidden="true" />
                    </span>
                    <h2 className="font-display text-lg font-bold tracking-tight text-foreground">{guia.nombre}</h2>
                    <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{guia.resumen}</p>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                      Ver guía <ArrowRight size={15} aria-hidden="true" />
                    </span>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
