/**
 * Une clases condicionales: `cn("a", activo && "b", undefined)` → `"a b"`.
 *
 * No resuelve conflictos entre utilidades de Tailwind (no hay tailwind-merge a propósito,
 * para no sumar una dependencia): por eso los componentes de `components/ui` aceptan
 * `className` para **layout** (margen, ancho, posición), no para pisar sus propios colores
 * o tamaños — para eso están las props `variant` / `size` / `tone`.
 */
export function cn(...clases: Array<string | false | null | undefined | 0>): string {
  return clases.filter(Boolean).join(" ");
}
