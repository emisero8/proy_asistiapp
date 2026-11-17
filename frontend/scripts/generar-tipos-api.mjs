// Regenera dos archivos a partir del backend en marcha:
//   - openapi.json            copia del contrato (GET /v3/api-docs), versionada
//   - src/lib/api-schema.d.ts tipos generados de ese contrato, versionados
//
// Uso (con el backend corriendo):   npm run types:api
// Otra URL:                         API_URL=https://mi-backend npm run types:api
//
// Después correr `npx tsc -b`: si el backend cambió, types.contract.ts marca qué tipo de types.ts quedó desfasado.
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const apiUrl = process.env.API_URL ?? "http://localhost:8080";
// Versión fija y por npx (no es dependencia del proyecto): exige TypeScript 5 y el proyecto usa 6, y el CI
// solo verifica los archivos ya generados, no los regenera.
const GENERADOR = "openapi-typescript@7.13.0";

let spec;
try {
  const respuesta = await fetch(`${apiUrl}/v3/api-docs`);
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
  spec = await respuesta.json();
} catch (e) {
  console.error(`No se pudo leer ${apiUrl}/v3/api-docs (${e.message}). ¿Está el backend corriendo?`);
  process.exit(1);
}

// "servers" refleja el host desde el que se pidió el contrato: no es parte del contrato y haría cambiar el archivo sin motivo.
delete spec.servers;
writeFileSync(resolve(raiz, "openapi.json"), `${JSON.stringify(spec, null, 2)}\n`);

execSync(`npx --yes ${GENERADOR} openapi.json -o src/lib/api-schema.d.ts`, { cwd: raiz, stdio: "inherit" });
console.log("Listo: openapi.json y src/lib/api-schema.d.ts actualizados. Ahora corré `npx tsc -b`.");
