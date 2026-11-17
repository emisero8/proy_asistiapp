import { test as base } from "@playwright/test";
import { PASSWORD, crearStaff, login, publicarEvento, registrarOrganizador, type EventoPublicado } from "./api";

export interface Mundo {
  organizador: { token: string; email: string };
  publicado: EventoPublicado;
  vendedor: { email: string; password: string };
  /** Sesión del vendedor iniciada por la API: el login tiene límite de 5 por minuto y la suite ya usa 3 por la interfaz. */
  tokenVendedor: string;
  staffQr: { email: string; password: string };
}

/**
 * Datos compartidos por toda la corrida, sembrados una vez por la API real: un Organizador nuevo
 * (con sus créditos de bienvenida), un evento publicado con una tanda de 3 entradas y un Staff
 * Vendedor y un Staff QR asignados a ese evento.
 */
export const test = base.extend<object, { mundo: Mundo }>({
  mundo: [
    // eslint-disable-next-line no-empty-pattern -- Playwright exige desestructurar el primer argumento
    async ({}, use) => {
      const org = await registrarOrganizador();
      const publicado = await publicarEvento(org.token, `E2E Evento ${Date.now()}`, 3);
      const vendedor = await crearStaff(org.token, "vendedor", publicado.evento.id);
      const staffQr = await crearStaff(org.token, "qr", publicado.evento.id);
      const tokenVendedor = await login(vendedor.email, vendedor.password);
      await use({ organizador: { token: org.token, email: org.email }, publicado, vendedor, tokenVendedor, staffQr });
    },
    { scope: "worker" },
  ],
});

export { PASSWORD };
export { expect } from "@playwright/test";
