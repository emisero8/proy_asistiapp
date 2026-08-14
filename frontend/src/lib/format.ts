/** Formatea un monto en pesos argentinos, ej. `$12.000`. */
export function fmt(n: number): string {
  return `$${Math.abs(n).toLocaleString("es-AR")}`;
}

/** `"2025-07-19"` (LocalDate del backend) → `"Sáb 19 Jul, 2025"`. */
export function formatFecha(fechaEvento: string): string {
  const date = new Date(`${fechaEvento}T00:00:00`);
  const texto = new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
  return texto.charAt(0).toUpperCase() + texto.slice(1).replace(".", "");
}

/** `"23:00:00"` (LocalTime del backend) → `"23:00 hs"`. */
export function formatHora(horaEvento: string): string {
  return `${horaEvento.slice(0, 5)} hs`;
}

/** Timestamp ISO (LocalDateTime del backend, sin zona) → `"hace 3 min"` / `"hace 2 h"` / `"hace 5 d"`. */
export function formatRelativo(fechaIso: string): string {
  const diffMs = Date.now() - new Date(fechaIso).getTime();
  const minutos = Math.floor(diffMs / 60000);
  if (minutos < 1) return "recién";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `hace ${dias} d`;
}
