/**
 * Fondo ambiente para las pantallas de login (Organizador/Staff/Admin) — el
 * banner de entradas, apenas difuminado (es un gráfico prolijo en la paleta
 * de marca, no una foto ruidosa que necesite mucho blur) y atenuado por un
 * velo con el color de fondo del tema actual, así sirve solo de textura
 * detrás de la tarjeta de login, sin competir con el contenido ni con el
 * contraste del texto. `fixed` + `z-0` para quedar siempre detrás sin que
 * cada pantalla tenga que ocuparse de la pila de z-index.
 */
export function AuthBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      <img src="/ticket.png" alt="" aria-hidden="true" className="w-full h-full object-cover scale-105 blur-sm opacity-70 dark:opacity-35" />
      <div className="absolute inset-0 bg-background/55" />
    </div>
  );
}
