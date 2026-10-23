/** Utilidades compartidas por los calendarios propios de la app (DateRangeFilter, DatePicker). */

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const DIAS = ["L", "M", "M", "J", "V", "S", "D"];

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Grilla de 6x7 celdas para el mes dado, con lunes como primer día. */
export function buildGrid(year: number, month: number): Date[] {
  const primerDia = new Date(year, month, 1);
  const offset = (primerDia.getDay() + 6) % 7; // 0=lunes
  const inicio = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i));
}
