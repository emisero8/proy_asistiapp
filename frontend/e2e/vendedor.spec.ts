import { test, expect } from "./fixtures";

test("el Staff Vendedor entra al POS y vende una entrada", async ({ page, mundo }) => {
  await page.goto("/staff/login");
  await page.getByPlaceholder("tu@mail.com").fill(mundo.vendedor.email);
  await page.getByPlaceholder("••••••••").fill(mundo.vendedor.password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();

  await expect(page).toHaveURL(/\/staff\/pos/);
  await expect(page.getByText(mundo.publicado.evento.nombre)).toBeVisible();

  await page.getByPlaceholder("Nombre del comprador").fill("Comprador E2E");
  await page.getByPlaceholder("comprador@ejemplo.com").fill("venta.e2e@asistiapp.test");
  await page.getByRole("button", { name: "Generar entrada" }).first().click();

  await expect(page.getByText("¡Entrada generada!")).toBeVisible();
});
