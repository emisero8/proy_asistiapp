import { Suspense } from "react";
import { Outlet, useLocation } from "react-router";

/** Spinner de carga de una sección entera (cuando todavía no hay ningún layout en pantalla). */
export function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-label="Cargando">
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
 * El `Suspense` propio hace que, mientras baja el chunk de la próxima pantalla, el layout
 * siga visible con un spinner en el área de contenido en lugar de reemplazarse entero.
 */
export function AnimatedOutlet() {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="page-transition">
      <Suspense fallback={<PageFallback />}>
        <Outlet />
      </Suspense>
    </div>
  );
}
