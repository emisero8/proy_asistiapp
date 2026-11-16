/**
 * `true` si el usuario pidió reducir el movimiento (ajuste del sistema operativo).
 * La regla global de theme.css cubre las animaciones CSS; esto es para lo que se anima por
 * código (`scrollIntoView`, `scrollBy`, `scrollTo`), que CSS no puede frenar.
 */
export function prefiereMenosMovimiento(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

/** `"smooth"` salvo que el usuario haya pedido reducir el movimiento. */
export function comportamientoScroll(): ScrollBehavior {
  return prefiereMenosMovimiento() ? "auto" : "smooth";
}
