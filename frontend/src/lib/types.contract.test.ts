import { describe, expect, it } from "vitest";
import contrato from "./types.contract.ts?raw";
import tipos from "./types.ts?raw";
import openapi from "../../openapi.json?raw";

// `types.contract.ts` solo protege a los DTOs que lista. Este test evita que un DTO nuevo de `types.ts`
// quede afuera sin que nadie se entere.
describe("types.contract.ts cubre todos los DTOs de types.ts", () => {
  const schemas = Object.keys((JSON.parse(openapi) as { components: { schemas: Record<string, unknown> } }).components.schemas);
  const interfaces = [...tipos.matchAll(/^export interface (\w+)/gm)].map((m) => m[1]);

  it("types.ts tiene DTOs que existen en el contrato del backend", () => {
    expect(interfaces.filter((nombre) => schemas.includes(nombre)).length).toBeGreaterThan(40);
  });

  it("todo DTO de types.ts que existe en el backend está verificado en types.contract.ts", () => {
    const sinVerificar = interfaces.filter((nombre) => schemas.includes(nombre) && !contrato.includes(`S["${nombre}"]`));

    expect(sinVerificar, `Sumar a types.contract.ts: ${sinVerificar.join(", ")}`).toEqual([]);
  });

  it("types.contract.ts no verifica DTOs que ya no existen en el backend", () => {
    const verificados = [...contrato.matchAll(/S\["(\w+)"\]/g)].map((m) => m[1]);
    const huerfanos = verificados.filter((nombre) => !schemas.includes(nombre));

    expect(huerfanos).toEqual([]);
  });
});
