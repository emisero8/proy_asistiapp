# Guía de Desarrollo AsistíAPP (Full-Stack)

- **Repo:** monorepo en GitHub (`proy_asistiapp`), raíz en `AsistiApp/`. `backend/` (Java/Spring Boot) y `frontend/` (React/Vite) son hermanos en el mismo repo.
- **Frontend real:** `frontend/` — proyecto Vite + React + TypeScript **nuevo y limpio**, desarrollado y buildeado directo con `npm install && npm run dev` / `npm run build` (NO es el harness de Figma Make). Estructura multi-archivo normal: `src/App.tsx` (router), `src/lib/` (api.ts, auth.tsx, types.ts, format.ts), `src/pages/{buyer,organizador,staff,admin}/`.
- **`figma-reference/`:** el export crudo original de Figma Make (single-file `App.tsx`, mock data). Es **solo material de consulta** de diseño/patrones — nunca se edita ni se shipea. Cuando haga falta ver cómo resolvía una pantalla el mockup, mirar ahí.
- **`nuevo-diseño/`:** referencias visuales sueltas (mockups de Stitch/Figma Make, `code.html` + `DESIGN.md` + captura) que se van sumando cuando el usuario quiere adoptar una nueva estética. Igual que `figma-reference/`: **solo material de consulta**, nunca se edita ni se shipea. La adopción de "TicketVibe" (celeste/violeta/lima, tipografía Anybody/JetBrains Mono) está documentada en `DESIGN.md`.
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
- **MercadoPago (Checkout Pro):** el **backend ya está integrado de verdad** (Fase 21 de `backend_implementation_plan.md`): preferencia real con `cantidad`, webhook con firma + verificación contra la API de MP, idempotencia, reembolso automático y mail desde el backend. **El frontend todavía no** (Fase 12 de `frontend_implementation_plan.md`): hasta entonces `CheckoutPage`/`WalletPage` están rotos porque los endpoints simulados se eliminaron. El contrato SÍ cambió: `ordenId` es un UUID string, `urlPago` es el `init_point` real, `comprar-online` recibe `cantidad` y ya no existen `/tickets/webhook/pago` ni `/creditos/webhook/pago`.
  - **Credenciales por variable de entorno, nunca en el repo ni en los .md:** `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `BACKEND_PUBLIC_URL`, `MP_VALIDAR_FIRMA` (ver tabla en la Fase 21). En esta máquina están guardadas como variables de entorno del usuario de Windows (hay que reabrir la terminal/VS Code para que las tomen).
  - **`MP_VALIDAR_FIRMA=false` es solo para el sandbox local** (los avisos de pagos reales de prueba llegan firmados con una clave que no coincide con la del panel — ver "Pendiente de la firma" en la Fase 21). **En producción debe ser `true`.**
  - **Probar el flujo real necesita un túnel público:** `ngrok http --url=<dominio-estatico>.ngrok-free.dev 8080` y el webhook cargado en el panel de MP (`<url>/payments/mercadopago/webhook`, evento "Pagos"). Comprador de prueba en incógnito.
  - **El pago como invitado (tipeando cualquier tarjeta de prueba, titular `APRO`) no funciona con credenciales de usuario de prueba** — MercadoPago lo rechaza con una pantalla de error genérica (`/fatal/`), tanto en automatización (Playwright) como en un Chrome real. Hay que loguearse con un **test user comprador** (botón "Ingresar con mi cuenta" en el checkout de MP) y pagar con "Dinero disponible" de esa cuenta. Los test users (comprador y vendedor) se crean/consultan desde el panel de developers de MP.
  - **No hay botón "Volver al sitio" ni auto-redirect en local:** `MercadoPagoService.crearPreferencia()` manda siempre `back_urls`, pero el `auto_return` (y en la práctica el botón manual también) solo los activa MercadoPago si `FRONTEND_BASE_URL` es HTTPS pública. Con el frontend en `http://localhost:5173` la pantalla de "pago aprobado" de MercadoPago se queda sin ningún botón de vuelta. **No es un bug a arreglar** — en producción (dominio real HTTPS) funciona solo. Para seguir probando en local, navegar a mano a `http://localhost:5173/pago/resultado?ref=<externalReference>&tipo=entradas|creditos` (el `externalReference` queda logueado en el backend como `Preferencia MP creada: ... externalReference=...` y `Compra iniciada: ... ref=...`).
  - **El plan free de ngrok no soporta 2 túneles simultáneos** (uno para el backend y otro para tunelear también el frontend y así tener HTTPS real en local): si se intenta, ambos terminan "compitiendo" por el mismo dominio público y solo uno queda realmente activo (verificar con `curl -I <url>` — si devuelve 403 de Spring Security es el backend, no el frontend). No vale la pena perseguirlo sin pasar a un plan pago de ngrok.
  - **Si hay que reiniciar el backend a mano durante una sesión con el túnel ya levantado, hacerlo desde PowerShell, no desde una shell de Bash que ya estaba abierta antes de setear las variables de entorno de MercadoPago** (`MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `BACKEND_PUBLIC_URL`) — una Bash preexistente no las ve (quedó con el entorno viejo) y el backend arranca con "El cobro con MercadoPago no está configurado". En PowerShell, leerlas con `[Environment]::GetEnvironmentVariable('X','User')` y asignarlas a `$env:X` antes de lanzar `mvn spring-boot:run`.
  - **Antes de correr `mvn test`, si aparecen errores raros de compilación/contexto, usar `mvn clean test`** (la extensión de Java de VS Code deja clases sin Lombok en `target/classes`).
- **SMTP (envío de mails):** `EmailService` funciona con cualquier proveedor SMTP estándar. En desarrollo se usa **MailHog** (SMTP local en `localhost:1025`, UI web en `http://localhost:8025`) levantado con `docker compose up -d` desde la raíz del repo. La config de Gmail queda comentada en `application.yml` para cuando se necesite en producción. Si MailHog no está corriendo, el flujo de negocio igual se completa (diseño intencional — el fallo de mail solo se loguea).