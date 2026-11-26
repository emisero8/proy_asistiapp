import { useEffect } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router";
import { ChevronDown } from "lucide-react";
import { PublicHeader } from "../../components/PublicHeader";
import { Alert, Card } from "../../components/ui";
import { cn } from "../../lib/cn";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { GUIAS, type Guia, type SeccionAyuda } from "./contenido";
import { useSeccionActiva } from "./useSeccionActiva";

/** Una guía de ayuda: /ayuda/:guia. Una dirección que no existe vuelve al índice. */
export function GuiaPage() {
  const { guia: slug } = useParams();
  const guia = GUIAS.find((g) => g.slug === slug);
  if (!guia) return <Navigate to="/ayuda" replace />;
  return <Contenido key={guia.slug} guia={guia} />;
}

function Contenido({ guia }: { guia: Guia }) {
  useDocumentTitle(guia.titulo);
  const { hash } = useLocation();

  // Al entrar con un link a una sección (/ayuda/staff#escanear) el navegador intenta saltar antes de
  // que React la dibuje: se baja a ella una vez montada.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  const activa = useSeccionActiva(
    guia.secciones.map((s) => s.id),
    hash,
  );
  const indiceActiva = guia.secciones.findIndex((s) => s.id === activa);

  return (
    <div className="min-h-dvh bg-background">
      <PublicHeader back={{ to: "/ayuda", label: "Ayuda" }} />
      <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8 lg:py-12">
        <nav aria-label="Guías" className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          {GUIAS.map((g) => (
            <Link
              key={g.slug}
              to={`/ayuda/${g.slug}`}
              aria-current={g.slug === guia.slug ? "page" : undefined}
              className={cn(
                "flex h-9 flex-none items-center rounded-full border px-4 text-xs font-semibold transition-colors duration-(--duration-fast)",
                g.slug === guia.slug
                  ? "border-foreground bg-foreground text-background"
                  : "border-border-strong text-muted-foreground hover:text-foreground",
              )}
            >
              {g.nombre}
            </Link>
          ))}
        </nav>

        <h1 className="mt-6 font-display text-3xl font-extrabold leading-[1.02] tracking-[-0.02em] text-foreground lg:text-4xl">{guia.titulo}</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">{guia.resumen}</p>

        <div className="mt-8 gap-8 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
          {/* Índice: en mobile, un desplegable fijo bajo el encabezado que dice en qué sección estás;
              en desktop, una columna fija. La lista flota para no correr el texto al abrirse. */}
          <details className="group sticky top-14 z-20 -mx-4 mb-4 border-y border-border bg-card lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5">
              <span className="min-w-0">
                <span className="block font-mono text-2xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">En esta guía</span>
                <span className="block truncate text-sm font-semibold text-foreground">
                  {indiceActiva + 1}. {guia.secciones[indiceActiva]?.titulo}
                </span>
              </span>
              <ChevronDown size={16} aria-hidden="true" className="flex-none transition-transform group-open:rotate-180" />
            </summary>
            <Indice
              secciones={guia.secciones}
              activa={activa}
              className="absolute inset-x-4 top-full mt-1 max-h-[60dvh] overflow-y-auto rounded-2xl border border-border-strong bg-card p-2 shadow-lg"
              alElegir={(el) => el.closest("details")?.removeAttribute("open")}
            />
          </details>
          <aside className="sticky top-20 hidden lg:block">
            <p className="mb-2 px-3 font-mono text-2xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">En esta guía</p>
            <Indice secciones={guia.secciones} activa={activa} />
          </aside>

          <div className="space-y-4">
            {guia.secciones.map((seccion, i) => (
              <Seccion key={seccion.id} numero={i + 1} seccion={seccion} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

interface IndiceProps {
  secciones: SeccionAyuda[];
  /** La sección que se está leyendo: queda marcada. */
  activa: string;
  className?: string;
  alElegir?: (el: HTMLElement) => void;
}

function Indice({ secciones, activa, className, alElegir }: IndiceProps) {
  return (
    <nav aria-label="Secciones de la guía" className={className}>
      <ul className="space-y-0.5">
        {secciones.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              onClick={(e) => alElegir?.(e.currentTarget)}
              aria-current={s.id === activa ? "location" : undefined}
              className={cn(
                "block rounded-xl px-3 py-2 text-sm transition-colors duration-(--duration-fast)",
                // Mismo marcador que la sidebar de los paneles: fondo suave y barrita lima.
                s.id === activa
                  ? "relative bg-primary/10 font-semibold text-primary before:absolute before:left-0 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-accent"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {s.titulo}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const SUBTITULO = "text-sm font-bold text-foreground";

function Seccion({ numero, seccion }: { numero: number; seccion: SeccionAyuda }) {
  const idTitulo = `${seccion.id}-titulo`;
  return (
    <section id={seccion.id} aria-labelledby={idTitulo} className="scroll-mt-32 lg:scroll-mt-20">
      <Card className="space-y-4">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="flex size-8 flex-none items-center justify-center rounded-lg bg-muted font-mono text-xs font-bold text-foreground">
            {numero}
          </span>
          <div className="space-y-1.5">
            <h2 id={idTitulo} className="font-display text-lg font-bold leading-8 tracking-tight text-foreground">
              {seccion.titulo}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{seccion.intro}</p>
          </div>
        </div>

        {seccion.pasos && (
          <div className="space-y-2">
            <h3 className={SUBTITULO}>Pasos</h3>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-foreground/90 marker:text-muted-foreground">
              {seccion.pasos.map((paso) => (
                <li key={paso}>{paso}</li>
              ))}
            </ol>
          </div>
        )}

        {seccion.detalles && (
          <div className="space-y-2">
            <h3 className={SUBTITULO}>Para tener en cuenta</h3>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground/90 marker:text-muted-foreground">
              {seccion.detalles.map((detalle) => (
                <li key={detalle}>{detalle}</li>
              ))}
            </ul>
          </div>
        )}

        {seccion.atencion && (
          <Alert tone="warning" title="Atención">
            {seccion.atencion}
          </Alert>
        )}

        {seccion.problemas && (
          <div className="space-y-2">
            <h3 className={SUBTITULO}>Problemas comunes</h3>
            {seccion.problemas.map((p) => (
              <details key={p.pregunta} className="group rounded-xl border border-border">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-2.5 text-sm font-medium text-foreground">
                  {p.pregunta}
                  <ChevronDown size={15} aria-hidden="true" className="flex-none text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <p className="border-t border-border px-3.5 py-3 text-sm leading-relaxed text-muted-foreground">{p.respuesta}</p>
              </details>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
