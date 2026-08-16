import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// RTL no limpia el DOM entre tests automáticamente a menos que detecte
// "afterEach" como global — acá no se usa test.globals, así que se registra a mano.
afterEach(() => {
  cleanup();
});
