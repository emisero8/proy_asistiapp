import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

interface Opciones {
  /** Cerrar con Escape (default `true`). Desactivarlo si el componente maneja Escape por su cuenta. */
  escape?: boolean;
}

/**
 * Cierra un elemento flotante (popover, menú, calendario, desplegable) al tocar/clickear
 * afuera o al apretar Escape. Reemplaza las copias de "clic afuera + Escape" que tenía
 * cada componente.
 *
 * - `refs`: lo que cuenta como "adentro" (el disparador y el panel; si el panel vive en un
 *   portal, hay que pasar los dos).
 * - Usa `pointerdown` (no `mousedown`): responde igual con mouse, touch y lápiz, y en touch
 *   se dispara antes.
 * - Solo escucha mientras `abierto` es `true`.
 */
export function useDismiss(
  abierto: boolean,
  onDismiss: () => void,
  refs: ReadonlyArray<RefObject<HTMLElement | null>>,
  { escape = true }: Opciones = {},
) {
  // Siempre la última versión, sin volver a suscribir los listeners en cada render.
  const onDismissRef = useRef(onDismiss);
  const refsRef = useRef(refs);
  useLayoutEffect(() => {
    onDismissRef.current = onDismiss;
    refsRef.current = refs;
  });

  useEffect(() => {
    if (!abierto) return;
    function onPointerDown(e: PointerEvent) {
      const objetivo = e.target as Node | null;
      if (objetivo && refsRef.current.some((r) => r.current?.contains(objetivo))) return;
      onDismissRef.current();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (escape && e.key === "Escape") onDismissRef.current();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [abierto, escape]);
}
