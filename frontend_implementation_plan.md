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

## Fase 4: Flujo Staff — CU-018/019
**Objetivo:** Login real de Staff (hoy es el único con "validación", pero contraseñas en texto plano en el bundle del cliente — hay que sacarlo de ahí) y validación de QR real.

1. `StaffLoginScreen` → `POST /auth/login` (roles Staff_QR/Staff_Vendedor).
2. `ScannerScreen` → reemplazar el coin-flip (`Math.random() > 0.3`) y los overlays con datos random por `POST /tickets/validate` real. Acá también entra la **cámara real de QR** (`html5-qrcode` o similar) — hoy no hay ninguna librería de lectura de cámara, los botones "Simular válido/inválido" son placeholders explícitos.
3. `StaffVendedorScreen` (POS) → `POST /tickets/venta-manual` (reemplaza el ticket ID fake generado client-side).

## Fase 5: Flujo Admin — CU-021 a CU-028
**Objetivo:** Backoffice completo — hoy `AdminLoginScreen` acepta cualquier click, cero validación.

1. `AdminLoginScreen` → `POST /auth/login` (rol Administrador).
2. `AdminUsers` → `AdminUsuarioController` (listar/suspender/reasignar rol/eliminar).
3. `AdminEvents` → `AdminEventoController` (listar/editar/cancelar/eliminar).
4. `AdminConfig` → `AdminConfiguracionController` (paquetes de crédito, config global) + `AdminMetricasService` para `AdminDashboard`.

## Fase 6: Pulido Transversal
**Objetivo:** Elevar el nivel de UX ahora que todo está conectado — hoy no hay ni un loading spinner ni un toast en toda la app, pese a que `skeleton.tsx` y `sonner.tsx` (shadcn) ya están instalados sin usar.

1. Loading states con `skeleton.tsx` en las pantallas que más tardan (dashboard, listados admin).
2. Notificaciones con `sonner.tsx` para confirmaciones/errores (reemplaza el patrón actual de mutar estado local silenciosamente).
3. Sacar la barra de navegación dev-only (selector de modo/pantalla, líneas ~2184-2224) — es scaffolding del harness de Figma Make, no debe llegar a producción.
4. Botones sin `onClick` que hoy no hacen nada: "Descargar entrada" (buyer), "Imprimir/Descargar" (POS), "Nuevo" pack (admin config), "Editar" evento (admin events).
5. Manejo de sesión expirada (401) → logout automático + redirect a login, consistente entre los 3 roles.

## Fase 7: Tests (opcional, no bloqueante)
Mismo criterio que la Fase 17 del backend — tests de componentes/integración si el tiempo lo permite, no bloquea nada de lo anterior.

---

**Orden de ejecución recomendado:** 1 → 2 → 3 → 4 → 5 → 6 → (7). La Fase 1 es la única bloqueante real — nada del resto se puede hacer sin cliente API y sesión real. La Fase 2 (Comprador) va segunda a propósito: es el flujo con menos fricción (sin auth) para validar que el patrón cliente-API + loading/error funciona antes de meterse con los tres sistemas de login falsos de las Fases 3-5.
