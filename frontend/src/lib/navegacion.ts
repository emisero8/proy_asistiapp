/**
 * Redirección a otra página (fuera de la app, p. ej. Mercado Pago). Está aparte para poder reemplazarla en los
 * tests: jsdom no implementa `window.location.assign`.
 */
export function redirigirA(url: string): void {
  window.location.assign(url);
}
