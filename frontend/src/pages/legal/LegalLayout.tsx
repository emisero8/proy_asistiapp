import type { ReactNode } from "react";
import { Link } from "react-router";
import { ChevronLeft } from "lucide-react";
import { ThemeToggle } from "../../components/ThemeToggle";
import { TERMINOS_VERSION } from "../../lib/terminos";

interface Props {
  titulo: string;
  /** El otro documento, para enlazarlo al pie. */
  otro: { texto: string; ruta: string };
  children: ReactNode;
}

/** Estructura común de los documentos legales: título, aviso de borrador, contenido y enlace al otro. */
export function LegalLayout({ titulo, otro, children }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <ThemeToggle variante="esquina" />
      <main className="max-w-2xl mx-auto px-6 py-10">
        <Link to="/" className="flex items-center gap-1 text-muted-foreground text-sm mb-6 hover:text-foreground">
          <ChevronLeft size={15} />
          Volver al inicio
        </Link>
        <h1 className="text-2xl font-extrabold text-foreground mb-2">{titulo}</h1>
        <p className="text-xs text-muted-foreground mb-4">Versión {TERMINOS_VERSION}</p>
        <p role="note" className="rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs p-3 mb-8">
          Este texto es un <strong>borrador</strong> pendiente de revisión por un abogado: puede cambiar antes de
          salir a producción.
        </p>
        <div className="space-y-6 text-sm text-foreground/90 leading-relaxed">{children}</div>
        <p className="mt-10 pt-6 border-t border-border text-xs text-muted-foreground">
          Ver también la{" "}
          <Link to={otro.ruta} className="text-primary underline">
            {otro.texto}
          </Link>
          .
        </p>
      </main>
    </div>
  );
}

export function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-bold text-foreground">{titulo}</h2>
      {children}
    </section>
  );
}
