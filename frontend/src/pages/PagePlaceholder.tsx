/**
 * Placeholder temporal de una pantalla todavía no portada desde el mockup
 * de Figma Make (ver frontend_implementation_plan.md, Fases 2-5). Cada uno
 * de estos se reemplaza por la implementación real a medida que se conecta
 * ese flujo contra la API.
 */
export function PagePlaceholder({ title }: { title: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-8">
      <div className="text-center space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Pendiente de implementar</p>
        <h1 className="text-lg font-extrabold">{title}</h1>
      </div>
    </div>
  );
}
