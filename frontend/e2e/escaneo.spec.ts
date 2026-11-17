import { ventaManual } from "./api";
import { test, expect } from "./fixtures";

test("el Staff QR valida una entrada con su código, y la segunda vez la rechaza", async ({ page, mundo }) => {
  // La entrada la vende el vendedor por la API; lo que se prueba es el escaneo.
  const entrada = await ventaManual(mundo.tokenVendedor, mundo.publicado.idTanda);

  await page.goto("/staff/login");
  await page.getByPlaceholder("tu@mail.com").fill(mundo.staffQr.email);
  await page.getByPlaceholder("••••••••").fill(mundo.staffQr.password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/staff\/scanner/);

  async function validarManual() {
    await page.getByRole("button", { name: /Ingresar código manualmente/ }).click();
    await page.getByPlaceholder("AST-XXXXXX").fill(entrada.codigoQr);
    await page.getByRole("button", { name: "Validar", exact: true }).click();
  }

  await validarManual();
  await expect(page.getByText("Comprador E2E")).toBeVisible();
  const contador = (rotulo: string) => page.getByText(rotulo, { exact: true }).locator("xpath=..");
  await expect(contador("Válidos")).toContainText("1");

  // La misma entrada otra vez: ya fue usada.
  await validarManual();
  await expect(contador("Inválidos")).toContainText("1");
  await expect(contador("Válidos")).toContainText("1");
});
