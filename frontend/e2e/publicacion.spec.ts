import { PASSWORD, enDias, registrarOrganizador } from "./api";
import { test, expect } from "./fixtures";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

test("un Organizador crea un evento con el asistente, lo publica y aparece en el catálogo público", async ({ page }) => {
  const org = await registrarOrganizador();
  const nombre = `E2E Publicado ${Date.now()}`;

  await page.goto("/organizador/login");
  await page.getByPlaceholder("hola@miempresa.com").fill(org.email);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar al panel" }).click();
  await expect(page).toHaveURL(/\/organizador\/dashboard/);

  await page.goto("/organizador/crear");
  await page.getByPlaceholder("Festival de Jazz al Aire Libre").fill(nombre);

  // Fecha: se navega el calendario hasta el mes del evento y se toca el día.
  const [anio, mes, dia] = enDias(10).split("-").map(Number);
  await page.getByRole("button", { name: /Elegí una fecha/ }).click();
  for (let i = 0; i < 3; i++) {
    const encabezado = (await page.getByText(new RegExp(`^(${MESES.join("|")}) \\d{4}$`)).textContent()) ?? "";
    if (encabezado === `${MESES[mes - 1]} ${anio}`) break;
    await page.getByRole("button", { name: "Mes siguiente" }).click();
  }
  // exact: con substring, "5 de diciembre de 2026" también encuentra el 15 y el 25 y el click falla.
  const etiquetaDia = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(anio, mes - 1, dia));
  await page.getByRole("button", { name: etiquetaDia, exact: true }).click();

  await page.getByRole("button", { name: /Elegí un horario/ }).click();
  await page.getByRole("button", { name: "Hora 21" }).click();
  await page.getByRole("button", { name: "Minutos 00" }).click();

  await page.getByPlaceholder("Ej: Pavón 123, Santa Fe").fill("Lugar E2E 456");
  await page.getByRole("button", { name: /Siguiente: configurar tandas/ }).click();

  await page.getByPlaceholder("Anticipada 1").fill("General");
  await page.getByPlaceholder("12000").fill("2000");
  await page.getByPlaceholder("200", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Publicar evento" }).click();

  await expect(page.getByText("¡Evento publicado!")).toBeVisible();

  await page.goto("/eventos");
  await expect(page.getByText(nombre)).toBeVisible();
});
