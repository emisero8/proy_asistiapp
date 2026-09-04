export type FiltroFecha = "todos" | "hoy" | "este-finde" | "proximo-finde";

export const FILTROS_FECHA: { id: FiltroFecha; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "hoy", label: "Hoy" },
  { id: "este-finde", label: "Este finde" },
  { id: "proximo-finde", label: "Próximo finde" },
];

/** [inicio, fin] del próximo viernes-a-domingo, en offset de semanas (0 = el que viene o el actual). */
export function rangoFinDeSemana(offsetSemanas: number): [Date, Date] {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dia = hoy.getDay(); // 0=domingo … 6=sábado
  const diasHastaViernes = dia <= 5 ? 5 - dia : 5 - dia + 7;
  const viernes = new Date(hoy);
  viernes.setDate(hoy.getDate() + diasHastaViernes + offsetSemanas * 7);
  const domingo = new Date(viernes);
  domingo.setDate(viernes.getDate() + 2);
  return [viernes, domingo];
}

export function fechaEnRango(fechaEvento: string, [inicio, fin]: [Date, Date]): boolean {
  const fecha = new Date(`${fechaEvento}T00:00:00`);
  return fecha >= inicio && fecha <= fin;
}
