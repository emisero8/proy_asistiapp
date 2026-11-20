import type { ReactNode } from "react";
import { Link } from "react-router";
import { PublicHeader } from "../../components/PublicHeader";
import { TERMINOS_VERSION } from "../../lib/terminos";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

interface Props {
  titulo: string;
  /** El otro documento, para enlazarlo al pie. */
  otro: { texto: string; ruta: string };
  children: ReactNode;
}

/** Estructura común de los documentos legales: título, versión, contenido y enlace al otro. */
export function LegalLayout({ titulo, otro, children }: Props) {
  useDocumentTitle(titulo);
  return (
    <div className="min-h-dvh bg-background">
      <PublicHeader back={{ to: "/", label: "Volver al inicio" }} />
      <main className="mx-auto max-w-2xl px-4 py-10 lg:py-14">
        <p className="font-mono text-2xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Versión {TERMINOS_VERSION}</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold leading-[1.02] tracking-[-0.02em] text-foreground lg:text-4xl">{titulo}</h1>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">{children}</div>
        <p className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
          Ver también la{" "}
          <Link to={otro.ruta} className="font-semibold text-primary underline underline-offset-4">
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
      <h2 className="font-display text-base font-bold tracking-tight text-foreground">{titulo}</h2>
      {children}
    </section>
  );
}
