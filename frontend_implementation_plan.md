# Plan de Implementación Frontend — AsistíAPP

Este plan detalla cómo llevar el mockup funcional de Figma Make (`figma-reference/`) — hoy 100% desconectado, con datos mock estáticos — a una aplicación real (`frontend/`) integrada contra el backend documentado en `API.md`. Sigue la misma lógica que `backend_implementation_plan.md`: fases numeradas, marcadas ✅ a medida que se completan.

> **Punto de partida (auditoría del código real, no del mockup en abstracto):** `figma-reference/src/app/App.tsx` (2308 líneas, el export crudo de Figma Make) no tiene ninguna llamada de red — cero `fetch`, cero estados de loading/error, cero router (la navegación es un switch de strings en memoria: `mode`/`buyerScreen`/`orgScreen`/etc.). Hay **tres mecanismos de login distintos y los tres son falsos**: Organizador y Admin aceptan cualquier click sin validar nada; Staff compara contraseñas en texto plano contra un array hardcodeado en el bundle del cliente. Ningún dato mock tiene forma de ID/relación real (`organizer` en `AdminEvent` es un nombre de texto suelto, no un `idOrganizador`). Nada de esto es criticable del mockup — está bien para lo que es, una demo de UI — pero significa que las Fases 1-2 de abajo son requisito antes de poder "conectar" cualquier pantalla, no un detalle menor.

## Decisiones ya tomadas

1. **Desarrollo aparte, Figma Make solo como referencia.** El export crudo de Figma Make vive en `figma-reference/` (nunca se shippea) — sirve para copiar estilos/patrones/inventario de pantallas. `frontend/` es un proyecto Vite + React + TypeScript nuevo y limpio, sin el scaffolding de vistas de prueba/selector de modo que traía el harness de Figma Make.
2. **Monorepo:** frontend y backend viven en el mismo repo de GitHub (`proy_asistiapp`). La raíz de git se movió de `backend/` a `AsistiApp/` (historial del backend preservado con prefijo `backend/`, reescrito y force-pusheado una única vez para consolidar).
3. **Responsive real (mobile + desktop), no solo mobile.** `DESIGN.md` solo especificaba layout desktop para el panel de Admin — Comprador/Organizador/Staff eran mobile-only (pensado para el "phone frame" de la demo de Figma Make). Como esto ya es una app real que se abre en cualquier navegador, todas las pantallas llevan breakpoints `lg:`/`md:` de Tailwind, manteniendo la paleta de colores intacta. Aplicado retroactivamente a las Fases 1-3 (comprador + organizador) antes de seguir con las Fases 4-5, para no tener que rehacerlo después. Cambios estructurales: `OrganizadorLayout` pasa de bottom tab bar (mobile) a sidebar fija de 208px (desktop, `md:`, mismo ancho que ya define `DESIGN.md` para Admin); Detail/Checkout del comprador pasan a dos columnas con panel de compra sticky en vez de barra fija inferior; Listado usa grilla de hasta 4 columnas en vez de lista vertical; Login de Organizador usa panel split-screen (marca a la izquierda, form a la derecha) en `lg:`.

## Fase 1: Arquitectura Base (routing, cliente API, sesión) ✅
**Objetivo:** Construir la infraestructura que hoy no existe y de la que dependen literalmente todas las fases siguientes.

1. **Router real:** reemplazar la navegación por string-state (`mode`, `buyerScreen`, `orgScreen`, `AdminShell.screen`, `StaffShell.screen`) por rutas reales con `react-router` — ya está en `package.json` como dependencia sin usar. Rutas mínimas: `/`, `/eventos/:urlPublica`, `/checkout`, `/ticket/:id` (buyer); `/organizador/*`; `/staff/*`; `/admin/*`.
2. **Cliente API (`src/lib/api.ts`):** wrapper de `fetch` con base URL desde `VITE_API_BASE_URL` (env), adjunta el JWT del storage en `Authorization`, parsea errores con el contrato ya documentado en `backend/README.md` (`{status, error, path, timestamp}`).
3. **Sesión/auth real:** un mecanismo único de almacenamiento de JWT (localStorage) + contexto/hook por rol (Organizador/Staff/Admin) que reemplace los tres booleanos falsos actuales (`orgLoggedIn`, el `screen` de `AdminShell`, el `account` de `StaffShell`).
4. **Tipos/DTOs (`src/lib/types.ts` o por dominio):** interfaces TypeScript espejo de los DTOs reales del backend (`EventoResponseDTO`, `EntradaResponseDTO`, `UsuarioResponseDTO`, etc. — swagger en `/v3/api-docs` como fuente de verdad).
5. **`.env.example`** con `VITE_API_BASE_URL=http://localhost:8080`.

## Fase 2: Flujo Comprador (público, sin auth) — CU-015/016/017 ✅
**Objetivo:** Primer flujo end-to-end conectado — el más simple porque no toca ninguno de los tres sistemas de auth falsos, ideal para probar el cliente API y el patrón de loading/error que se va a repetir en todas las fases siguientes.

1. `ListingScreen` → `GET /public/eventos`.
2. `DetailScreen` → `GET /public/eventos/{urlPublica}`.
3. `CheckoutScreen` → `POST /tickets/comprar-online` + `POST /tickets/webhook/pago` (simula MercadoPago igual que ya lo hace el backend).
4. `SuccessScreen` → mostrar el `codigoQr` real y la imagen (`GET /tickets/{id}/qr-image`) en vez del `QRCodeSVG seed="AST-HX7K2M"` hardcodeado.
5. Loading states + manejo de error (acá se define el patrón — reusar en todas las fases siguientes).

**Adaptaciones respecto al mockup (decisiones tomadas al conectar la API real):**
- Se sacó el "phone frame" (marco de celular con notch simulado) — tenía sentido para la demo dentro de Figma Make, no para una app real que corre en el navegador del usuario. Las páginas ahora son mobile-first responsive normales.
- El mockup permitía elegir cantidad de entradas en un solo submit; el backend genera **una Entrada (con su propio QR) por llamada**, no soporta "comprar 3" en una sola operación. Se resolvió haciendo `qty` llamadas secuenciales a `comprar-online` + `webhook/pago`, mostrando un QR por entrada en la pantalla de ticket — además es más correcto: cada entrada debe poder escanearse individualmente en la puerta (CU-018).
- El selector de método de pago (MercadoPago/Transferencia/Tarjeta/WhatsApp) del mockup no tiene respaldo real — `CompraOnlineRequestDTO` no tiene campo `metodoPago`, el backend solo simula MercadoPago. Se simplificó a mostrar MercadoPago como único método.
- Verificado end-to-end con Playwright contra un backend real (Postgres local + evento de prueba sembrado vía API): listado → detalle → checkout → ticket con QR real, sin errores de consola.

## Fase 3: Flujo Organizador — CU-001/002/010 a 014, gestión de staff CU-005/006 ✅
**Objetivo:** El flujo con más superficie: login real, dashboard con métricas, wizard de creación/publicación, billetera de créditos, gestión de staff propio.

1. `OrgLoginScreen`/`OrgRegisterScreen` → `POST /auth/login`, `POST /auth/register`, guardar JWT.
2. `DashboardScreen` → `GET /eventos/{id}/metricas` (reemplaza el `BarChart`/métricas 100% hardcodeadas).
3. `WizardScreen` → `POST /eventos`, `PATCH /eventos/{id}/publicar` (el descuento de créditos "–5 créditos" hoy es un string fijo, tiene que salir de la respuesta real).
4. `WalletScreen` → `GET /creditos/historial`, `POST /creditos/comprar` + `POST /creditos/webhook/pago` (el botón "Pagar con MercadoPago" hoy no tiene `onClick`).
5. `StaffMgmtScreen` → endpoints de `GestionStaffController`.

**Gap de backend encontrado y corregido:** no existía ningún endpoint para que el Organizador viera el catálogo de paquetes de crédito — solo había uno para Admin (`/admin/paquetes-credito`). Sin esto la Billetera no podía mostrar qué comprar. Se agregó `GET /creditos/paquetes` (`CreditoService.listarPaquetesDisponibles()`, `PaqueteCreditoDisponibleDTO`), reutilizando `PaqueteCreditoRepository.findByEstado` que ya existía pero nunca se llamaba desde ningún lado.

**Adaptaciones respecto al mockup:**
- Se agregó una `OrganizadorLayout` con la bottom tab bar (Dashboard/Crear/Créditos/Staff) que describe `DESIGN.md`, usando rutas anidadas de `react-router` en vez del switch de pantallas del mockup.
- El registro del mockup pedía "Nombre de la organización" — `RegisterRequestDTO` no tiene ese campo, se sacó del formulario.
- Los créditos de bienvenida (mockup: "+10" fijo) y el costo de publicar (mockup: "–5 créditos" fijo) ahora salen de la respuesta real del backend (`MovimientoCredito.saldoResultante`/`monto`), no de texto hardcodeado — en la práctica resultaron ser 5 y 1 respectivamente, distinto de lo que asumía el mockup.
- El wizard de creación de evento crea el `Evento` (Borrador) al pasar del paso 1 al 2, y recién crea las `Tanda` + publica al confirmar en el paso 2 — si falla la publicación (ej. saldo insuficiente), el evento queda en Borrador con sus tandas ya creadas, listo para reintentar.
- Gestión de Staff no tiene botón de eliminar: el backend no expone ningún endpoint para dar de baja un miembro de staff, solo alta y listado.
- Bug real encontrado y corregido: el mockup anidaba un `<button>` ("Pagar con MercadoPago") dentro de otro `<button>` (la tarjeta del paquete) — HTML inválido, React lo marcaba como error de hidratación. Se cambió el contenedor externo a un `<div role="button">`.
- Verificado end-to-end con Playwright: registro → dashboard vacío → wizard (2 pasos) → publicar → dashboard con métricas reales → wallet (compra de créditos real, saldo actualizado) → alta de Staff QR — sin errores de consola.

## Fase 4: Flujo Staff — CU-018/019 ✅
**Objetivo:** Login real de Staff (hoy es el único con "validación", pero contraseñas en texto plano en el bundle del cliente — hay que sacarlo de ahí) y validación de QR real.

1. `StaffLoginScreen` → `POST /auth/login` (roles Staff_QR/Staff_Vendedor).
2. `ScannerScreen` → reemplazar el coin-flip (`Math.random() > 0.3`) y los overlays con datos random por `POST /tickets/validate` real. Acá también entra la **cámara real de QR** (`html5-qrcode` o similar) — hoy no hay ninguna librería de lectura de cámara, los botones "Simular válido/inválido" son placeholders explícitos.
3. `StaffVendedorScreen` (POS) → `POST /tickets/venta-manual` (reemplaza el ticket ID fake generado client-side).

**Gaps de backend encontrados y corregidos:**
- No existía forma de que un Staff_Vendedor supiera para qué evento(s) de su organizador podía vender — `/eventos` es exclusivo Organizador. Se agregó `GET /eventos/vendedor` (`EventoController`, override del `@PreAuthorize` de la clase a `Staff_Vendedor`), reutilizando `EventoService.listarEventosPublicadosDeOrganizador()` sobre el `findByIdOrganizadorAndEstado` que ya existía.
- **IDOR real:** `VentaService.realizarVentaManual()` nunca verificaba que la tanda vendida perteneciera a un evento del organizador del Staff_Vendedor autenticado — cualquier Staff_Vendedor podía vender entradas de **cualquier organizador** con solo conocer/adivinar un `idTanda` ajeno (ni el ID de tanda es difícil de adivinar, son secuenciales). Se agregó la verificación de ownership (`tanda.evento.idOrganizador == staffVendedor.idOrganizador`, 403 `ForbiddenActionException` si no coincide) antes de tocar el cupo. Confirmado con un organizador y tanda de prueba aparte: el intento cruzado devuelve 403 con mensaje claro.

**Adaptaciones respecto al mockup:**
- `ScannerScreen` real no muestra "aforo total" (el mockup lo hardcodeaba en 400) porque no hay ningún endpoint que exponga esa cifra al rol Staff_QR (los `/eventos/*/metricas` son exclusivos Organizador) — se simplificó a mostrar solo los contadores de Válidos/Inválidos de la sesión actual del staff (se resetean al re-loguearse), que sí surgen 100% de las respuestas reales de `/tickets/validate`.
- Cámara real con `html5-qrcode` (`Html5Qrcode.start`, `facingMode: "environment"`) en vez del coin-flip; se mantiene el input de código manual como fallback, llamando al mismo endpoint. El botón de linterna usa `applyVideoConstraints({ advanced: [{ torch }] })` con fallback silencioso si el dispositivo/navegador no lo soporta.
- **Bug real encontrado y corregido en la propia integración:** `Html5Qrcode.stop()` tira una excepción síncrona ("Cannot stop, scanner is not running or paused") si se llama antes de que `start()` termine de negociar la cámara — pasa de verdad si el componente se desmonta rápido (ej. React StrictMode en dev, o navegación apurada). Se resolvió trackeando el estado real (`getState()`) en el cleanup del efecto y, si `start()` resuelve después de desmontado, deteniendo la cámara recién en ese momento.
- `StaffVendedorScreen` (POS) del mockup no pedía email del comprador — `VentaManualRequestDTO` lo exige (es a donde se manda la entrada), así que se agregó el campo. El método de pago (efectivo/transferencia/POS) del mockup no tiene respaldo real (`VentaManualRequestDTO` no lo contempla) y se sacó, igual que se hizo con el selector de método de pago del comprador en la Fase 2.
- "Vendidas hoy" es un contador de sesión (no persiste ni viene del backend, se resetea al re-loguearse) — no hay endpoint de reporte diario por vendedor.
- Igual que en Fase 2/3, "vender qty entradas" son qty llamadas secuenciales a `venta-manual` (una Entrada con su propio QR por llamada).
- El QR se muestra con `GET /tickets/{id}/qr-image?codigoQr=...` (mismo patrón que Fase 2) — el Staff_Vendedor no es Organizador, así que la única vía de autorización que le aplica es el `codigoQr` exacto, que ya tiene en la respuesta de `venta-manual`.
- Se agregó layout desktop propio al POS (dos columnas con resumen sticky, igual patrón que el checkout del comprador) — el mockup original y el primer borrador de esta fase solo contemplaban mobile. El Scanner se dejó como "cámara centrada" en una tarjeta con bordes redondeados en desktop en vez de forzar una grilla, coherente con el carácter full-bleed/inmersivo que ya describía `DESIGN.md` para esta pantalla.
- Verificado end-to-end con Playwright contra un backend real (Postgres local, organizador + evento publicado + Staff_QR + Staff_Vendedor sembrados vía API y limpiados después): login Vendedor → POS → venta manual → QR real → logout → login Staff_QR → Scanner → validación manual del QR recién generado (✅ válida, con nombre real del comprador) → segunda validación del mismo QR correctamente rechazada (ya usada) → sin errores de consola, verificado contra el build de producción (`vite preview`) en 1440px y 390px.

## Fase 5: Flujo Admin — CU-021 a CU-028 ✅
**Objetivo:** Backoffice completo — hoy `AdminLoginScreen` acepta cualquier click, cero validación.

1. `AdminLoginScreen` → `POST /auth/login` (rol Administrador).
2. `AdminUsers` → `AdminUsuarioController` (listar/suspender/reasignar rol/eliminar).
3. `AdminEvents` → `AdminEventoController` (listar/editar/cancelar/eliminar).
4. `AdminConfig` → `AdminConfiguracionController` (paquetes de crédito, config global) + `AdminMetricasService` para `AdminDashboard`.

**Sin gaps de backend esta vez** — los 6 controllers de Admin (`AdminUsuarioController`, `AdminEventoController`, `AdminConfiguracionController`, `AdminPaqueteCreditoController`, `AdminMetricasController`) ya cubrían uno a uno cada acción que necesitaba el mockup; no hizo falta agregar ni corregir nada del lado del backend.

**Adaptaciones respecto al mockup:**
- Se agregó `AdminLayout` (sidebar 208px en desktop / bottom tab bar en mobile), igual patrón que `OrganizadorLayout` — el mockup de Admin era desktop-only (`DESIGN.md` solo definía ese panel para desktop), pero la regla de responsive real ya establecida en fases anteriores aplica igual acá.
- **Gestión de Usuarios:** el mockup simplificaba a 3 roles con un botón que los rotaba en ciclo (`organizador → staff → admin`). El sistema real tiene 4 roles (`Administrador`, `Organizador`, `Staff_QR`, `Staff_Vendedor`) — se reemplazó por un submenú que deja elegir el rol destino explícitamente, más correcto que un ciclo que no puede representar los 4 estados con una sola dirección.
- **Gestión de Eventos:** el mockup mostraba "Organizador" como texto suelto (nombre de fantasía); `EventoResponseDTO` solo trae `idOrganizador` (no hace join con el nombre), así que la tabla muestra `#id` en esa columna. "Editar" en el mockup no tenía `onClick` (placeholder explícito) — acá se implementó completo con un modal (nombre, descripción, fecha, hora, lugar, URL de portada) contra `PUT /admin/eventos/{id}`, que el Admin puede usar sobre un evento en cualquier estado (a diferencia del Organizador, que solo puede editar en Borrador).
- **Configuración Global:** de los 4 campos que mostraba el mockup, solo 2 están conectados a lógica de negocio real (`creditos_bienvenida` que lee `AuthService`, `creditos_por_publicacion` que lee `EventoService` al publicar) — son los únicos que quedaron en la pantalla. "Máximo de eventos activos por organizador" y "Email de soporte visible" no tienen ningún lugar del backend que los lea ni los aplique, así que no se incluyeron (agregar un input que no hace nada sería peor que no tenerlo).
- **Dashboard:** el bloque "Actividad reciente" del mockup era 100% hardcodeado y no hay ningún endpoint de feed de actividad en el alcance de esta fase (existe `GET /admin/auditoria`, pero devuelve logs de auditoría técnicos, no un feed pensado para mostrarse así — queda para una fase de pulido si se decide usarlo). Se sacó y se dejó el dashboard con las 4 métricas reales (`GET /admin/metricas`) y los 3 accesos directos.
- Acciones destructivas (eliminar usuario, eliminar evento) piden confirmación con `window.confirm` — no hay ningún componente de modal de confirmación establecido en el proyecto todavía, así que se usó el patrón nativo más simple en vez de construir uno nuevo para esto solo.
- Verificado end-to-end con Playwright contra un backend real y el build de producción, en mobile (390px) y desktop (1440px): login → dashboard con métricas reales → usuarios (buscar, suspender, reactivar) → eventos (editar, cancelar) → config (crear paquete de crédito, guardar config global) — sin errores de consola. Datos de prueba sembrados vía API/SQL y eliminados después.

## Fase 6: Pulido Transversal ✅
**Objetivo:** Elevar el nivel de UX ahora que todo está conectado — hoy no hay ni un loading spinner ni un toast en toda la app, pese a que `skeleton.tsx` y `sonner.tsx` (shadcn) ya están instalados sin usar.

1. Loading states con `skeleton.tsx` en las pantallas que más tardan (dashboard, listados admin).
2. Notificaciones con `sonner.tsx` para confirmaciones/errores (reemplaza el patrón actual de mutar estado local silenciosamente).
3. Sacar la barra de navegación dev-only (selector de modo/pantalla, líneas ~2184-2224) — es scaffolding del harness de Figma Make, no debe llegar a producción.
4. Botones sin `onClick` que hoy no hacen nada: "Descargar entrada" (buyer), "Imprimir/Descargar" (POS), "Nuevo" pack (admin config), "Editar" evento (admin events).
5. Manejo de sesión expirada (401) → logout automático + redirect a login, consistente entre los 3 roles.

**Este plan se escribió pensando en el mockup de Figma Make; para cuando llegó esta fase, `frontend/` ya era un proyecto Vite propio sin `shadcn/skeleton.tsx` ni `sonner.tsx` instalados (esos existen solo en `figma-reference/`, que nunca se toca). Se releyó cada punto contra el código real antes de tocar nada:**

- **Punto 1 (skeletons):** no había ningún `skeleton.tsx` de shadcn — el patrón real ya establecido en todo el proyecto desde las Fases 2-3 es bloques `animate-pulse` inline (`ListingPage`, `OrganizadorDashboardPage`, `WalletPage`, etc. ya lo usaban). Las únicas pantallas que no lo seguían eran las 3 de Admin nuevas (Fase 5), que mostraban texto plano "Cargando…" — se reemplazaron por el mismo patrón `animate-pulse` para que quede consistente en toda la app.
- **Punto 2 (toasts):** se instaló `sonner` (librería real, no el componente shadcn) con un `<Toaster />` global en `App.tsx`, con los colores de `DESIGN.md`. Se agregaron confirmaciones donde hoy no había ninguna señal de éxito: alta de staff (Organizador), y en Admin — suspender/activar/reasignar rol/eliminar usuario, editar/cancelar/eliminar evento, crear/activar/desactivar paquete y editar su precio. El guardado de "Configuración Global" ya tenía su propio indicador visual (botón que pasa a "¡Cambios guardados!") — se dejó como está y solo se le sumó `toast.error` en el catch, que antes fallaba en silencio salvo por el banner ya existente.
- **Punto 3 (barra dev-only):** no aplica — ese scaffolding vive únicamente en `figma-reference/src/app/App.tsx`, que por decisión ya tomada en la Fase 1 nunca se edita ni se shipea. `frontend/` nunca tuvo ese código.
- **Punto 4 (botones sin `onClick`):** ya resuelto en fases anteriores sin que quedara anotado acá — "Imprimir/Descargar" del POS se sacó directamente al conectar la Fase 4 (no tiene respaldo real), "Descargar entrada" del comprador nunca se portó al frontend real, y "Nuevo" pack / "Editar" evento de Admin se implementaron completos en la Fase 5. Verificado con `grep` que no queda ningún botón sin `onClick` en `frontend/src/pages`.
- **Punto 5 (sesión expirada):** implementado en `lib/api.ts`, con un hallazgo real en el camino — el backend no tiene un `AuthenticationEntryPoint` propio, así que un JWT rechazado (vencido o inválido) nunca llega al `GlobalExceptionHandler`: Spring Security corta antes con un 401/403 **sin body JSON**. Un 403 legítimo de la app (rol correcto pero sin permiso, ej. Organizador pegándole a un endpoint de Admin) sí trae el JSON de siempre. La detección se hizo por la ausencia de body, no por el código de estado solo — así no se confunde un "no tenés permiso" real con una sesión vencida. Al detectarse, limpia la sesión de `localStorage` y redirige al login del rol que tenía (`/organizador/login`, `/staff/login` o `/admin/login`). No aplica a un 401 de `/auth/login` con contraseña incorrecta porque esa request nunca lleva token adjunto.
- Verificado end-to-end con Playwright contra un backend real y el build de producción, en mobile y desktop: alta de staff con toast de confirmación → login Admin → suspender usuario con toast → forzar un JWT inválido en `localStorage` → cualquier acción siguiente redirige automáticamente a `/admin/login` con la sesión local ya limpia — sin errores de consola.

## Fase 7: Tests (opcional, no bloqueante) ✅
Mismo criterio que la Fase 17 del backend — tests de componentes/integración si el tiempo lo permite, no bloquea nada de lo anterior.

Se instaló Vitest + React Testing Library + jsdom (`npm test`). Siguiendo el mismo criterio que la Fase 17 del backend (probar un representante de cada patrón de acceso, no cada endpoint/pantalla una por una), se cubrieron los dos puntos con más superficie de bug real en vez de las ~25 páginas una por una:

- **`lib/api.ts`** (10 tests): adjunta/omite el JWT según corresponda, parsea `ApiError` con el contrato de `GlobalExceptionHandler`, y en particular la detección de sesión vencida que se implementó en la Fase 6 — un 403/401 "legítimo" (con body JSON) no debe desloguear, uno "sin body" (JWT rechazado por Spring Security) sí. Es la lógica más sutil y con más potencial de romperse en un refactor futuro sin que se note a simple vista.
- **`lib/auth.tsx`** (8 tests): `RequireRole` redirige correctamente según sesión/rol (incluyendo el caso de múltiples roles permitidos, ej. Staff_QR/Staff_Vendedor), y `AuthProvider` persiste/limpia la sesión en `localStorage`.
- **`StaffLoginPage`** (5 tests) y **`AdminUsersPage`** (4 tests) como representantes de los dos patrones que se repiten en el resto de las pantallas: login → `POST /auth/login` → redirect por rol; y listado con skeleton de carga → mutación → toast de confirmación.

No se armó una suite de tests end-to-end versionada — la verificación e2e con Playwright contra un backend real que se vino hacienda al cerrar cada fase anterior cubre ese nivel, y mantenerla como suite corriendo en CI hubiera implicado levantar Postgres + backend + frontend en el pipeline, un costo que no se justificaba para una fase opcional.

Se agregó `.github/workflows/frontend-tests.yml` (typecheck + lint + tests + build en cada push/PR), mismo patrón que `backend-tests.yml` ya existente. Se actualizó `frontend/README.md` (hasta ahora el boilerplate default de Vite, nunca se había tocado) con instrucciones reales de setup, estructura del proyecto y cómo correr los tests — mismo estilo que `backend/README.md`.

## Fase 8: Pulido post-completitud ✅
Con las 7 fases anteriores cerradas, este bloque cubre trabajo posterior sin numeración de fase propia: rediseño visual inspirado en qrTicket.app (manteniendo la identidad violeta propia, nunca copiando su paleta) sobre el flujo del Comprador (Listing/Detail/Checkout/Ticket), los 3 logins (Organizador/Staff/Admin) y acentos sutiles en los paneles de Organizador y Admin (glow de sidebar, miniaturas de póster en dashboard/tabla de eventos); más el cierre de dos gaps funcionales menores que habían quedado documentados como pendientes en las Fases 3 y 5.

**Gap 1 — Gestión de Staff no tenía forma de dar de baja a un miembro** (documentado en Fase 3): se agregó `PATCH /organizador/staff/{id}/desactivar` y `/reactivar` (`GestionStaffController`/`GestionStaffService`), reutilizando el enum `EstadoUsuario` ya existente (`Activo`/`Inactivo`) en vez de agregar una columna nueva — mismo patrón que `AdminUsuarioService.suspenderUsuario`/`activarUsuario`. Se optó por soft-deactivate en vez de hard delete: `Entrada.idStaffVendedor`/`idStaffQrValidador` no son FKs JPA reales, pero borrar la fila igual dejaría huérfana la trazabilidad de quién vendió/validó una entrada — mismo criterio que ya usa `AdminUsuarioService.eliminarUsuario` al bloquear el borrado de un Organizador con recursos a cargo. Se verificó ownership (IDOR) antes de tocar el estado: directo por `idOrganizador` en `StaffVendedor`, vía el evento asignado en `StaffQR` (no tiene `idOrganizador` propio) — mismo patrón que la corrección de IDOR de `VentaService.realizarVentaManual` de la Fase 4. `StaffMgmtPage.tsx` ahora muestra "Dar de baja"/"Reactivar" por miembro, con toast de confirmación.

**Gap 2 — Dashboard de Admin sin "Actividad reciente"** (documentado en Fase 5, con la nota de que `GET /admin/auditoria` devuelve logs técnicos sin nombres resueltos): se conectó igual, con una capa de traducción en el frontend (`ACCION_LABELS` en `AdminDashboardPage.tsx`) que mapea cada código de acción (`SUSPENDER_USUARIO`, `CAMBIAR_ROL`, `EDITAR_EVENTO_ADMIN`, etc.) a una frase en español. El endpoint no pagina ni tiene parámetro de límite (devuelve toda la tabla, ya ordenada por fecha desc. desde el backend), así que el recorte a los últimos 6 registros se hace client-side.

**Bug de tests pre-existente encontrado y corregido en el camino:** `VentaServiceTest` fallaba con `NullPointerException` en 2 de sus tests (`realizarVentaManual_sinCupo_...`, `realizarVentaManual_exitoso_...`) — el mock de `Evento`/`StaffVendedor` nunca seteaba `idOrganizador`, así que el chequeo de IDOR agregado en la Fase 4 explotaba contra un `null` en vez de comparar. No relacionado con este trabajo (confirmado que ya fallaba en `master` antes de estos cambios), pero se corrigió de paso para que la suite quede verde.

Verificado end-to-end con Playwright contra un backend real (reiniciado para levantar el código nuevo) y datos demo persistentes: alta de un Staff Vendedor de prueba → "Dar de baja" → estado pasa a Inactivo con toast → "Reactivar" → vuelve a Activo, probado también sobre el Staff QR Demo real (dado de baja y reactivado en el mismo pase, sin dejarlo inactivo) → Admin Dashboard mostrando actividad reciente real y legible — sin errores de consola, en mobile y desktop. Fixture de staff de prueba eliminado de la base por SQL al terminar (no hay endpoint de borrado real, ver Gap 1).

---

**Orden de ejecución recomendado:** 1 → 2 → 3 → 4 → 5 → 6 → (7). La Fase 1 es la única bloqueante real — nada del resto se puede hacer sin cliente API y sesión real. La Fase 2 (Comprador) va segunda a propósito: es el flujo con menos fricción (sin auth) para validar que el patrón cliente-API + loading/error funciona antes de meterse con los tres sistemas de login falsos de las Fases 3-5.
