import { useEffect, useState } from "react";

/** Margen para que una sección recién alcanzada por un salto (queda justo en su scroll-margin) ya cuente. */
const HOLGURA = 8;

/**
 * Id de la sección que se está leyendo: la última cuyo comienzo ya pasó la línea de lectura, que está
 * debajo del encabezado (el `scroll-margin-top` de la sección). Las últimas secciones pueden no llegar
 * ahí porque la página se termina antes: en el tramo final la línea baja de a poco hasta el pie de la
 * pantalla, así se marcan todas en orden. El enlace recién elegido tiene prioridad sobre la línea.
 */
export function useSeccionActiva(ids: string[], hash: string): string {
  const [activa, setActiva] = useState(ids[0]);
  const clave = ids.join(",");

  useEffect(() => {
    const lista = clave.split(",");
    const elegida = hash.slice(1);
    let pendiente = 0;

    function medir() {
      pendiente = 0;
      const alto = window.innerHeight;
      const maximo = document.documentElement.scrollHeight - alto;
      const resta = maximo - window.scrollY;
      const alFinal = window.scrollY > 0 && resta <= 2;

      let actual = lista[0];
      let elegidaALaVista = false;
      for (const id of lista) {
        const el = document.getElementById(id);
        if (!el) continue;
        const base = (parseFloat(getComputedStyle(el).scrollMarginTop) || 0) + HOLGURA;
        const tramo = Math.min(alto - base, maximo);
        const avance = window.scrollY > 0 && tramo > 0 ? Math.min(1, Math.max(0, 1 - resta / tramo)) : 0;
        const { top } = el.getBoundingClientRect();
        if (top <= base + avance * (alto - base)) actual = id;
        // Recién saltada (quedó en su lugar), o a la vista porque la página no baja más.
        if (id === elegida && top >= 0 && (top <= base || alFinal)) elegidaALaVista = true;
      }
      setActiva(elegidaALaVista ? elegida : actual);
    }

    function alMoverse() {
      if (!pendiente) pendiente = requestAnimationFrame(medir);
    }

    medir();
    window.addEventListener("scroll", alMoverse, { passive: true });
    window.addEventListener("resize", alMoverse);
    return () => {
      window.removeEventListener("scroll", alMoverse);
      window.removeEventListener("resize", alMoverse);
      cancelAnimationFrame(pendiente);
    };
  }, [clave, hash]);

  return activa;
}
