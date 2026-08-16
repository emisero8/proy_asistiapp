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

## Estructura

- `src/pages/{buyer,organizador,staff,admin}/` — una carpeta por rol/flujo.
- `src/lib/api.ts` — cliente HTTP: adjunta el JWT, parsea errores con el contrato de `GlobalExceptionHandler`, y desloguea automáticamente si el backend rechaza la sesión (ver comentario en el archivo).
- `src/lib/auth.tsx` — contexto de sesión (`useAuth`) y guard de rutas por rol (`RequireRole`).
- `src/lib/types.ts` — espejo a mano de los DTOs del backend (fuente de verdad: Swagger en `/v3/api-docs` con el backend corriendo).
- `figma-reference/` — export crudo del mockup original de Figma Make. Solo material de consulta de diseño — **nunca se edita ni se shipea**.

Las páginas de cada rol están separadas por rutas y cargadas con `React.lazy()` (ver `src/App.tsx`) — las que traen dependencias pesadas (`recharts` en el dashboard del Organizador, `html5-qrcode` en el scanner de Staff) quedan en su propio chunk, que solo se descarga al entrar a esa pantalla.

## Tests

```
npm test
```

Vitest + React Testing Library, con `jsdom`. Cubren lógica con más superficie de bug real, no cada pantalla una por una:

- `src/lib/api.test.ts` — el cliente HTTP, en particular la detección de sesión vencida (un JWT rechazado por Spring Security no trae el mismo body que un 403 legítimo de la app — ver el comentario en `api.ts`).
- `src/lib/auth.test.tsx` — `RequireRole` (redirige según sesión/rol) y `AuthProvider` (persiste/limpia la sesión en `localStorage`).
- Un componente de login (`StaffLoginPage`) y una pantalla de listado con mutaciones (`AdminUsersPage`) como representantes de esos dos patrones, que se repiten en el resto de los roles.

No hay tests end-to-end en el repo — la verificación end-to-end (Playwright contra un backend real) se corre a mano al cerrar cada fase del `frontend_implementation_plan.md`, no queda como suite versionada.

CI configurado en `.github/workflows/frontend-tests.yml` (typecheck + lint + tests + build en cada push/PR).

## Build de producción

```
npm run build
```

`tsc -b` (typecheck) seguido de `vite build`. `npm run preview` sirve el build en `http://localhost:5173` (mismo puerto que `dev`, para que el CORS del backend siga funcionando sin tocar nada).
