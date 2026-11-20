import { test, expect } from "./fixtures";

test("un comprador elige una tanda, completa sus datos y se abre el pago de MercadoPago", async ({ page, context, mundo }) => {
  const { evento, nombreTanda } = mundo.publicado;
  // No se paga de verdad: el login/pago de MercadoPago dispara reCAPTCHA. Se corta al llegar a su dominio.
  // La app abre el pago en una pestaña nueva y deja la original esperando.
  await context.route(/mercadopago|mercadolibre/, (ruta) =>
    ruta.fulfill({ status: 200, contentType: "text/html", body: "<h1>MercadoPago (simulado)</h1>" }),
  );

  await page.goto(`/eventos/${evento.urlPublica}`);
  await expect(page.getByRole("heading", { name: evento.nombre })).toBeVisible();
  await expect(page.getByRole("radio", { name: new RegExp(nombreTanda) })).toBeVisible();
  await page.getByRole("button", { name: /Comprar entradas/ }).click();

  await expect(page).toHaveURL(/\/checkout/);
  await page.getByPlaceholder("María García").fill("Comprador E2E");
  await page.getByPlaceholder("maria@ejemplo.com").fill("comprador.e2e@asistiapp.test");
  await page.getByPlaceholder("Repetí tu email").fill("comprador.e2e@asistiapp.test");
  await page.getByRole("checkbox", { name: /Acepto los Términos/ }).check();
  const pestanaPago = context.waitForEvent("page");
  await page.getByRole("button", { name: /^Pagar \$/ }).first().click();

  const pago = await pestanaPago;
  await expect(pago).toHaveURL(/mercadopago|mercadolibre/);
  await expect(page).toHaveURL(/\/pago\/resultado/);
  await expect(page.getByText("Esperando tu pago")).toBeVisible();
});
