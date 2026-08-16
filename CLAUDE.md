# Guía de Desarrollo AsistíAPP (Full-Stack)

- **Repo:** monorepo en GitHub (`proy_asistiapp`), raíz en `AsistiApp/`. `backend/` (Java/Spring Boot) y `frontend/` (React/Vite) son hermanos en el mismo repo.
- **Frontend real:** `frontend/` — proyecto Vite + React + TypeScript **nuevo y limpio**, desarrollado y buildeado directo con `npm install && npm run dev` / `npm run build` (NO es el harness de Figma Make). Estructura multi-archivo normal: `src/App.tsx` (router), `src/lib/` (api.ts, auth.tsx, types.ts, format.ts), `src/pages/{buyer,organizador,staff,admin}/`.
- **`figma-reference/`:** el export crudo original de Figma Make (single-file `App.tsx`, mock data). Es **solo material de consulta** de diseño/patrones — nunca se edita ni se shipea. Cuando haga falta ver cómo resolvía una pantalla el mockup, mirar ahí.
- **Stack Frontend:** React + TypeScript + Tailwind CSS v4, `react-router` (v7, paquete unificado, no hace falta `react-router-dom`), `recharts` para gráficos.
- **Stack Backend:** Java + Spring Boot + PostgreSQL.
- **Iconos (Frontend):** lucide-react v0.487.0 (IMPORTANTE: Usa `CircleX`, NUNCA `XCircle`).

## 🎨 SISTEMA DE DISEÑO (FRONTEND - CRÍTICO)
Para estructurar componentes, utilizar colores (`--primary`, `--card`, etc.), espaciados y tipografías, **DEBES leer y aplicar estrictamente las reglas del archivo `DESIGN.md`** ubicado en este directorio. 
- Usa la sección "Component Patterns" del `DESIGN.md` para crear botones, inputs y tarjetas. No inventes clases de Tailwind.

## ⚙️ ARQUITECTURA Y DATOS (BACKEND - CRÍTICO)
Para cualquier tarea relacionada con la base de datos, creación de endpoints, lógica de negocio o integraciones, **DEBES leer el archivo `API.md`** ubicado en este directorio.
- **Seguridad:** Usa Spring Security con JWT Stateless. Verifica siempre los roles del sistema (`Administrador`, `Organizador`, `Staff_QR`, `Staff_Vendedor`).
- **Reglas de Negocio:** Respeta estrictamente los casos de uso definidos (ej. publicar un evento consume créditos, la validación de QR marca la entrada como usada).
- **Transacciones (ACID):** Usa `@Transactional` en los servicios que modifican datos para evitar sobreventa de entradas (controlando rigurosamente el `cupo_disponible` en la entidad `TANDA`).
- **Patrones de Código:** Usa siempre DTOs para las peticiones/respuestas (no expongas entidades JPA) e implementa manejo de errores global estructurado con `@ControllerAdvice`.

## 🛡️ AUDITORÍA DE SEGURIDAD
Si se solicita una revisión de seguridad de código, **DEBES leer el archivo `SECURITY.md`** y auditar estrictamente el fragmento de código proporcionado buscando vulnerabilidades (SQLi, XSS, CSRF, IDOR), sin modificar ni requerir la lectura del resto del proyecto.

## 📋 PLANES DE IMPLEMENTACIÓN — CÓMO TRABAJAMOS
- `backend_implementation_plan.md` y `frontend_implementation_plan.md` (raíz del repo) son la fuente de verdad de qué está hecho y qué falta. Antes de arrancar cualquier trabajo nuevo, **leerlos** para saber en qué fase estamos.
- Se trabaja **fase por fase, en orden**, marcando cada una con ✅ recién cuando queda terminada y verificada (no antes). Cada fase, al cerrarla, se documenta con: qué se hizo, qué adaptaciones hubo respecto al plan/mockup original y por qué, y cualquier gap de backend que se haya encontrado y corregido en el camino.
- **No arrancar la fase siguiente sin confirmación del usuario.** Al terminar una fase, parar y preguntar antes de seguir (y antes de commitear/pushear).
- Si al conectar el frontend aparece un gap real en el backend (falta un endpoint, un DTO, etc.), **corregirlo en el backend correctamente**, no parchear del lado del frontend. Documentar el gap y la corrección en el plan.

## 🎯 GIT / COMMITS — REGLA FIJA
- **Todo commit y push va SIEMPRE a nombre del usuario, sin ningún rastro de Claude/Anthropic** (nada de trailers `Co-Authored-By: Claude`). Config local ya seteada: `Felipe_Prono <felipeprono@gmail.com>`. Esta regla aplica a este proyecto y a cualquier otro.
- Confirmar con el usuario antes de cada commit/push (no auto-commitear al terminar una tarea).
- Mensajes de commit en español, explicando el qué y el porqué, del mismo estilo que el historial existente (`git log` para ver el tono).

## 📱💻 RESPONSIVE — MOBILE + DESKTOP
`DESIGN.md` originalmente solo definía layout desktop para el panel de Admin (Comprador/Organizador/Staff eran mobile-only, pensados para el "phone frame" de la demo de Figma Make). Como esto es una app real que se abre en cualquier navegador, **toda pantalla nueva debe incluir breakpoints `md:`/`lg:` de Tailwind desde el principio** (no solo mobile), manteniendo intacta la paleta de colores/tokens de `DESIGN.md`. Patrón ya establecido: `OrganizadorLayout` usa sidebar fija de 208px en desktop (mismo ancho que el sidebar de Admin) y bottom tab bar en mobile; pantallas de detalle/checkout usan dos columnas con panel sticky en desktop.

## ✅ VERIFICACIÓN ANTES DE DAR POR TERMINADA UNA PANTALLA
No alcanza con que compile. Antes de marcar una fase de frontend como hecha:
1. Levantar el backend real (`cd backend && mvn spring-boot:run`, requiere Postgres corriendo) y el frontend (`cd frontend && npm run dev`).
2. Probar el flujo end-to-end contra el backend real (no mocks) — si hace falta datos de prueba (un evento publicado, un organizador, etc.), sembrarlos vía `curl` contra la API y limpiarlos después (cancelar/suspender, no dejar basura de test en la base).
3. Verificar visualmente con capturas (Playwright headless: `npm install --no-save playwright` + `npx playwright install chromium` si no están, un script `.mjs` temporal, revisar `console --errors`/`pageerror`, y **mirar las capturas**, no asumir). Borrar el script y desinstalar playwright al terminar.
4. Confirmar que no rompió el otro tamaño de pantalla (mobile y desktop).

## 🔌 INTEGRACIONES EXTERNAS — ESTADO ACTUAL (a propósito, no son bugs)
- **MercadoPago:** simulado end-to-end (`iniciarCompra` + webhook simulado). Queda para el final del proyecto — no bloquea nada, el contrato de los endpoints no va a cambiar cuando se conecte el SDK real.
- **SMTP (envío de mails):** `EmailService` funciona con cualquier proveedor SMTP estándar (Gmail + App Password recomendado para dev/demo, ver `backend/README.md`), pero hoy corre sin credenciales reales configuradas — si el envío falla, el flujo de negocio igual se completa (diseño intencional). También queda para el final.