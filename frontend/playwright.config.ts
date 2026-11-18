import { defineConfig, devices } from "@playwright/test";

/**
 * Suite end-to-end contra el sistema real (backend + frontend levantados). No levanta nada sola:
 * ver `e2e/README.md` para arrancar el backend sin mandar mails reales.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Un solo worker: los tests comparten un evento sembrado y el login tiene límite de 5 por minuto.
  workers: 1,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_FRONTEND_URL ?? "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "es-AR",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
