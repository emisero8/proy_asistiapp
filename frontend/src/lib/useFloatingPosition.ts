import { useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";

export type Ubicacion = "bottom-start" | "bottom-end" | "bottom" | "top";

const MARGEN_VIEWPORT = 8;

const OCULTO: CSSProperties = { position: "fixed", top: 0, left: 0, opacity: 0 };

/**
 * Posiciona un panel flotante (menú, tooltip) con `position: fixed` relativo a su disparador,
 * pensado para renderizarlo en un portal: así **no lo recorta** ningún contenedor con
 * `overflow` (ej. el `overflow-x-auto` de una tabla, que recortaba el menú de cada fila).
 *
 * - Abre hacia abajo; si no entra y arriba hay más lugar, se da vuelta (y viceversa para `top`).
 * - Nunca se sale del viewport (margen de 8 px).
 * - Se recalcula al hacer scroll (en cualquier contenedor) y al cambiar el tamaño de la ventana.
 * - Antes de medir queda con `opacity: 0` (no `visibility: hidden`), así el panel ya se puede
 *   enfocar en el mismo render en que aparece.
 */
export function useFloatingPosition(
  anclaRef: RefObject<HTMLElement | null>,
  flotanteRef: RefObject<HTMLElement | null>,
  abierto: boolean,
  ubicacion: Ubicacion = "bottom-end",
  separacion = 6,
): CSSProperties {
  const [estilo, setEstilo] = useState<CSSProperties>(OCULTO);

  useLayoutEffect(() => {
    if (!abierto) {
      setEstilo(OCULTO);
      return;
    }
    function actualizar() {
      const ancla = anclaRef.current;
      const flotante = flotanteRef.current;
      if (!ancla || !flotante) return;
      const r = ancla.getBoundingClientRect();
      const ancho = flotante.offsetWidth;
      const alto = flotante.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const lugarAbajo = vh - r.bottom;
      const lugarArriba = r.top;
      const entra = alto + separacion + MARGEN_VIEWPORT;
      const arriba =
        ubicacion === "top"
          ? lugarArriba >= entra || lugarArriba > lugarAbajo
          : lugarAbajo < entra && lugarArriba > lugarAbajo;

      let left =
        ubicacion === "bottom-end"
          ? r.right - ancho
          : ubicacion === "bottom-start"
            ? r.left
            : r.left + r.width / 2 - ancho / 2;
      let top = arriba ? r.top - alto - separacion : r.bottom + separacion;
      left = Math.min(Math.max(left, MARGEN_VIEWPORT), Math.max(MARGEN_VIEWPORT, vw - ancho - MARGEN_VIEWPORT));
      top = Math.min(Math.max(top, MARGEN_VIEWPORT), Math.max(MARGEN_VIEWPORT, vh - alto - MARGEN_VIEWPORT));

      const origenX = ubicacion === "bottom-end" ? "right" : ubicacion === "bottom-start" ? "left" : "center";
      setEstilo({
        position: "fixed",
        top,
        left,
        transformOrigin: `${origenX} ${arriba ? "bottom" : "top"}`,
      });
    }
    actualizar();
    window.addEventListener("resize", actualizar);
    window.addEventListener("scroll", actualizar, true);
    return () => {
      window.removeEventListener("resize", actualizar);
      window.removeEventListener("scroll", actualizar, true);
    };
  }, [abierto, ubicacion, separacion, anclaRef, flotanteRef]);

  return estilo;
}
