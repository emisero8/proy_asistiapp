# AsistíAPP — Frontend

SPA de AsistíAPP. React 19 + TypeScript + Vite + Tailwind CSS v4 + react-router. Consume la API real del backend (ver `backend/README.md`) — no usa mocks ni datos hardcodeados.

## Requisitos

- Node.js 22+
- Backend corriendo en local (ver `backend/README.md`) — sin él, ninguna pantalla más allá del login funciona.

## Levantar en local

1. Copiar el env de ejemplo:
   ```
   cp .env.example .env.local
   ```
   `VITE_API_BASE_URL` apunta a `http://localhost:8080` por default.
2. Instalar dependencias:
   ```
   npm install
   ```
3. Correr:
   ```
   npm run dev
   ```
4. La app queda en `http://localhost:5173`. El backend tiene que tener ese origen habilitado en `CORS_ALLOWED_ORIGINS` (ya viene así por default en dev).

> Si vas a **rediseñar la interfaz**, leé primero [`GUIA_REDISENO.md`](GUIA_REDISENO.md). Las pruebas de punta a punta están en [`e2e/README.md`](e2e/README.md).

## Estructura

- `src/pages/{buyer,organizador,staff,admin}/` — una carpeta por rol/flujo.
- `src/lib/api.ts` — cliente HTTP: adjunta el JWT, parsea errores con el contrato de `GlobalExceptionHandler`, y desloguea automáticamente si el backend rechaza la sesión (ver comentario en el archivo).
- `src/lib/auth.tsx` — contexto de sesión (`useAuth`) y guard de rutas por rol (`RequireRole`).
- `src/lib/types.ts` — espejo a mano de los DTOs del backend, con la nulabilidad real de cada campo. Se verifica contra el contrato del backend (ver "Contrato con el backend" más abajo).
- `src/lib/types.contract.ts`, `src/lib/api-schema.d.ts` y `openapi.json` — la guardia de desfasajes de `types.ts`; los dos últimos son generados, no se editan a mano.

Las páginas de cada rol están separadas por rutas y cargadas con `React.lazy()` (ver `src/App.tsx`) — las que traen dependencias pesadas (`recharts` en el dashboard del Organizador, `html5-qrcode` en el scanner de Staff) quedan en su propio chunk, que solo se descarga al entrar a esa pantalla.

## Contrato con el backend (tipos de la API)

`types.ts` se escribe a mano a propósito: el backend no declara qué campos de respuesta son obligatorios ni cuáles pueden ser `null`, así que los tipos generados salen con **todo opcional** y reemplazarlos obligaría a tratar como posiblemente ausente cada campo que siempre viene. Lo que evita que `types.ts` se desfase es esto:

- `openapi.json` es una copia versionada del contrato del backend (`GET /v3/api-docs`) y `src/lib/api-schema.d.ts` son los tipos generados de esa copia.
- `src/lib/types.contract.ts` compara cada DTO de `types.ts` con su versión generada: mismos campos (también en objetos y listas anidados) y mismo tipo base (los enums, con exactamente los mismos valores). **No compara** si un campo es opcional o acepta `null`, porque eso es justo lo que el backend no dice. Si algo no coincide, `npx tsc -b` falla en la línea de ese DTO.
- Los cuerpos de las peticiones se arman con `satisfies <Tipo>RequestDTO`, así que el compilador también los compara con el backend.
- `src/lib/types.contract.test.ts` avisa si se agrega un DTO a `types.ts` y se olvida de sumarlo a `types.contract.ts`.
- En el backend, `OpenApiContratoTest` falla si el contrato cambia y `openapi.json` no se actualizó, así que la guardia no depende de que alguien se acuerde de regenerar.

**Cuando cambia un endpoint o un DTO del backend:**

1. Con el backend corriendo: `npm run types:api` (regenera `openapi.json` y `api-schema.d.ts`; otra URL: `API_URL=https://... npm run types:api`).
2. `npx tsc -b`: los errores señalan qué DTO de `types.ts` hay que actualizar, y dónde se usa.
3. Commitear `openapi.json`, `api-schema.d.ts` y `types.ts` juntos.

El generador (`openapi-typescript`, a una versión fija) se ejecuta con `npx` y **no es una dependencia del proyecto**: exige TypeScript 5 y el proyecto usa 6, y el CI solo verifica los archivos ya generados. Necesita red la primera vez.

## Tests

```
npm test
```

Vitest + React Testing Library, con `jsdom` (29 archivos, 293 tests). Cubren las reglas con más superficie de bug real y las pantallas principales:

- **`src/lib/`** — el cliente HTTP (`api.test.ts`, incluida la detección de sesión vencida: un JWT rechazado por Spring Security no trae el mismo body que un 403 legítimo de la app), la sesión y `RequireRole` (`auth.test.tsx`), formato, reglas de tandas y de pago, y la guardia de tipos contra el backend (`types.contract.test.ts`).
- **`src/components/`** — `DatePicker`, `TimePicker`, `ImagenPortadaField`, `DialogProvider` y `ThemeToggle`.
- **`src/pages/`** — las pantallas del comprador (inicio, detalle, checkout, resultado del pago), del Organizador (dashboard, asistente, edición, detalle, staff, perfil), del Staff (login y POS) y de Admin (usuarios).

Dos cosas a tener en cuenta al escribir tests:
- Cualquier pantalla que muestre el botón de tema se renderiza envuelta en `<ThemeProvider>` (sin él, `useTheme` falla a propósito).
- Para fechas, congelar solo el reloj de `Date` (`vi.useFakeTimers({ toFake: ["Date"], now })`) y elegir días con `elegirFecha`/`elegirHora` de `src/testing/pickers.ts`, que usan los selectores reales como una persona.

Correr vitest desde PowerShell o CMD; desde Git Bash en Windows puede fallar al arrancar.

### Pruebas de punta a punta

Playwright contra el backend real, en `e2e/` (`npm run e2e`): publicación de un evento, compra hasta MercadoPago, venta en el POS y escaneo de una entrada. Requisitos y trampas en [`e2e/README.md`](e2e/README.md).

### Integración continua

`.github/workflows/frontend-tests.yml` corre typecheck, lint, tests y build en cada push y pull request. El e2e no corre ahí (necesita backend, base de datos y MercadoPago).

## Build de producción

```
npm run build
```

`tsc -b` (typecheck) seguido de `vite build`. `npm run preview` sirve el build en `http://localhost:5173` (mismo puerto que `dev`, para que el CORS del backend siga funcionando sin tocar nada).
