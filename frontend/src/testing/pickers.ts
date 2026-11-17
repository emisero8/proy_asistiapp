import { screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { MESES, fechaLarga } from "../lib/calendar";

/** El encabezado del calendario abierto: "Junio 2030". */
const ENCABEZADO_MES = new RegExp(`^(${MESES.join("|")}) \\d{4}$`);
const MAX_MESES_A_RECORRER = 36;

/**
 * Elige una fecha (`YYYY-MM-DD`) en un `DatePicker` como lo haría una persona: abre el
 * calendario con su botón, navega mes a mes hasta el que corresponde y toca el día.
 * Falla con un mensaje claro si la fecha queda fuera de alcance o está deshabilitada
 * (por ejemplo, por `min`/`max`): eso también es lo que vería quien usa la pantalla.
 *
 * Para fechas lejanas conviene congelar el reloj cerca (`vi.useFakeTimers({ toFake: ["Date"] })`):
 * el calendario abre en el mes de hoy y cada mes de distancia es un clic.
 */
export async function elegirFecha(user: UserEvent, disparador: HTMLElement, iso: string) {
  const [anio, mes, dia] = iso.split("-").map(Number);
  await user.click(disparador);

  const objetivo = anio * 12 + (mes - 1);
  for (let i = 0; ; i++) {
    const [nombreMes, anioMostrado] = (screen.getByText(ENCABEZADO_MES).textContent ?? "").split(" ");
    const mostrado = Number(anioMostrado) * 12 + MESES.indexOf(nombreMes);
    if (mostrado === objetivo) break;
    if (i >= MAX_MESES_A_RECORRER) {
      throw new Error(`elegirFecha: ${iso} queda a más de ${MAX_MESES_A_RECORRER} meses del calendario abierto; congelar el reloj más cerca.`);
    }
    await user.click(screen.getByRole("button", { name: mostrado < objetivo ? "Mes siguiente" : "Mes anterior" }));
  }

  await user.click(screen.getByRole("button", { name: fechaLarga(new Date(anio, mes - 1, dia)) }));
}

/** Elige una hora (`HH:MM`, minutos de a 15) en un `TimePicker`: abre, toca la hora y toca los minutos. */
export async function elegirHora(user: UserEvent, disparador: HTMLElement, hhmm: string) {
  const [hh, mm] = hhmm.split(":");
  await user.click(disparador);
  await user.click(screen.getByRole("button", { name: `Hora ${hh}` }));
  await user.click(screen.getByRole("button", { name: `Minutos ${mm}` }));
}
