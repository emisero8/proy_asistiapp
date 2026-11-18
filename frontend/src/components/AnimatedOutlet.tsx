import { Suspense } from "react";
import { Outlet, useLocation } from "react-router";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

/** Spinner de carga de una sección entera (cuando todavía no hay ningún layout en pantalla). */
export function RouteFallback() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background" role="status" aria-label="Cargando">
      <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
    </div>
  );
}

/** Spinner de carga de una pantalla dentro de un layout que ya está montado. */
function PageFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center" role="status" aria-label="Cargando">
      <div className="w-7 h-7 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
    </div>
  );
}

/**
 * Reemplazo de `<Outlet>` con transición de página. Se usa adentro de cada layout (y en el
 * layout sin chrome de las rutas públicas): solo se remonta el contenido de la ruta —
 * `key={pathname}` dispara la animación `.page-transition` en cada navegación — y el
 * layout que lo contiene (sidebar, campanita, barra inferior) queda montado.
 *
 * - `Suspense` propio: mientras baja el chunk de la próxima pantalla, el layout sigue visible
 *   con un spinner en el área de contenido en lugar de reemplazarse entero.
 * - `RouteErrorBoundary` propio: si esa pantalla falla (o su chunk no carga), el aviso aparece
 *   en el área de contenido y el resto del layout sigue funcionando.
 *
 * `variant="content"` dentro de un shell; `"page"` (default) en las rutas sin chrome.
 */
export function AnimatedOutlet({ variant = "page" }: { variant?: "page" | "content" }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="page-transition">
      <RouteErrorBoundary variant={variant}>
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </RouteErrorBoundary>
    </div>
  );
}
