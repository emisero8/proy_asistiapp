# Para retomar el trabajo en otra máquina — AsistíAPP

> Escrito para el agente (o la persona) que continúa el proyecto en otra PC sin el contexto de las sesiones anteriores. Resume dónde estamos para no tener que re-investigar. **No contiene credenciales** (nunca poner acá contraseñas ni tokens).
> Última actualización: 2026-11-16 (cierre del día) · Rama: `feature-mercadopago` (remoto `https://github.com/emisero8/proy_asistiapp.git`, rama principal `master`). El último commit está en `git log`: este archivo se actualiza junto con el código.

## 1. Qué leer, en este orden

1. `CLAUDE.md` — reglas del proyecto (se carga solo). Es el contrato de trabajo.
2. **`PLAN_MEJORAS.md`**, sección "Estado actual — por dónde vamos" (arriba de todo) y la tabla de la etapa que toque. Es la fuente de verdad de qué está hecho y qué falta.
3. `DECISIONES.md` — decisiones ya tomadas (con fecha, no se re-discuten), preguntas abiertas y deuda técnica. Las filas del 2026-11-16 son las más recientes.
4. Solo si hace falta: `backend/README.md` (variables de entorno, SMTP, MercadoPago, cómo probar un pago en local), `frontend/README.md` (incluye "Contrato con el backend"), `backend_implementation_plan.md`, `frontend_implementation_plan.md`, `API.md`, `DESIGN.md`, `SECURITY.md`.

## 2. El proyecto en 5 líneas

Monorepo: `backend/` (Java 17 + Spring Boot 3.3.2, PostgreSQL, JWT stateless) y `frontend/` (React + Vite + TypeScript 6 + Tailwind v4). Venta de entradas para eventos con roles Administrador, Organizador, Staff_QR y Staff_Vendedor. Pagos con **MercadoPago Checkout Pro** (backend e integración del frontend ya hechos), mails por SMTP, imágenes en Cloudinary. `figma-reference/` y `nuevo-diseño/` son solo material de consulta: no se editan.

## 3. Dónde estamos

Se trabaja ítem por ítem sobre `PLAN_MEJORAS.md` (8 etapas). Todo lo siguiente está **commiteado y pusheado a `feature-mercadopago`**. Suites: backend **338 tests, 0 fallos** (`cd backend && mvn clean test`); frontend **24 archivos, 219 tests, 0 fallos** (`cd frontend; npx vitest run`, desde PowerShell), además de `npx tsc -b`, `npm run lint` y `npm run build` limpios.

**Hecho antes del 16/11:**
- **Etapas 1, 2 y 3 completas** (2.4 queda para producción: `MP_VALIDAR_FIRMA=true`). Etapa 3: borrado de eventos con compras en curso, manejo global de errores 4xx (405/415/400 en vez de 500), el organizador puede borrar sus borradores, regla de "evento finalizado" unificada, zona horaria fija, venta manual con `cantidad`, espera de pago sin chocar con el límite de peticiones.
- **Etapa 4: 4.3, 4.4, 4.5, 4.6.** Perfil `prod` (`application-prod.yml` + `ConfiguracionProdValidator`): 12 variables obligatorias, sin SQL en el log, log INFO/WARN, errores sin mensajes internos. Cloudinary exigido en prod. El mail de reembolso se prueba por SMTP real con GreenMail.
- **Fuera del plan, el 12/11:** SMTP configurable por variables de entorno (Gmail sin editar `application.yml`); el backend lee un `backend/.env` opcional; el QR del mail de confirmación viaja como imagen inline `cid:` (Gmail bloqueaba la `data:` URI); el mail de confirmación lleva versión en texto plano.

**Hecho el 17/11:**
- **5.5** — el botón de tema ya no es global ni flotante: `ThemeToggle` se coloca en el header de cada pantalla (`variante="normal"` en headers, `"sobre-imagen"` sobre la portada del evento, `"esquina"` fijo solo en pantallas sin header: login/registro vía `AuthBackground`). En `OrganizadorLayout`/`AdminLayout` va en el grupo de acciones (campanita, tema, salir). El escáner QR no lo tiene a propósito. **Los tests de páginas que renderizan `ThemeToggle` deben envolverse en `ThemeProvider`** (`useTheme` tira error fuera). Verificado con Playwright: 18 pantallas × desktop y mobile, 1 toggle, visible, sin tapar, sin errores de consola.
- **5.3** — los tests de fecha y hora ya no usan el `<input>` nativo oculto que quedaba como puente: `DatePicker` y `TimePicker` tienen tests propios, `src/testing/pickers.ts` expone `elegirFecha`/`elegirHora` (abren el selector, navegan los meses y tocan el día/la hora como una persona) y `WizardPage`/`EditEventPage` los usan; el input oculto se eliminó de los componentes. Los días y horas ahora tienen nombre accesible ("28 de junio de 2030", "Hora 21"). **Ojo al escribir tests con fechas:** el calendario abre en el mes de hoy y cada mes es un clic, así que hay que congelar el reloj cerca con `vi.useFakeTimers({ toFake: ["Date"], now })` (solo `Date`, para no frenar a `userEvent`). Y con los selectores reales **no se puede elegir un día fuera de `min`/`max`** (por eso ya no hay un test que fuerce una fecha pasada o una venta posterior al evento: se prueba que esos días estén deshabilitados y, para el aviso de venta posterior al evento, el camino real de adelantar el evento).

**Hecho el 16/11:**
- **5.6** — borradas 5 órdenes `Pendiente` huérfanas de la base local (eran del flujo simulado previo a MercadoPago, sin `fecha_vencimiento`, por eso el job de vencimiento nunca las tocó).
- **6.1** — la Auditoría del Admin pasa a ser la 5ª pestaña de la barra inferior en mobile (`AdminLayout`).
- **6.3** — aviso de que "el enlace de la entrada es la entrada" en la pantalla de resultado del pago y en el POS.
- **6.4** — la venta manual del POS manda **un solo mail con todas las entradas** al comprador (`VentaController.ventaManual`, mismo `EmailService` que la compra online). El envío va protegido: si falla se loguea y la venta igual responde 201 (un 500 con la venta ya guardada haría que el vendedor reintente y la duplique).
- **5.4** — tests de `ListingPage` (17) y `PosPage` (22), verificados rompiendo el código a propósito.
- **5.1** — **guardia de desfasajes entre `types.ts` y el OpenAPI del backend.** `types.ts` NO se reemplazó por tipos generados (el backend no declara campos obligatorios ni `null`: todo saldría opcional). Los tipos generados (`openapi.json` + `src/lib/api-schema.d.ts`) vigilan a `types.ts` mediante `src/lib/types.contract.ts`, y `OpenApiContratoTest` (backend) falla si el contrato cambia y la copia no se regeneró. De paso: se corrigió `CompraOnlineRequestDTO` (faltaba `cantidad`), se tipearon 3 DTOs de entrada y se arregló un error del backend (springdoc documentaba `horaEvento` como objeto). **Flujo cuando cambia un DTO/endpoint:** con el backend corriendo `cd frontend && npm run types:api`, luego `npx tsc -b`, actualizar `types.ts` donde marque, commitear todo junto (detalle en `frontend/README.md`).
- **7.1, 7.2, 7.3** — `CLAUDE.md` actualizado (MercadoPago ya integrado en el frontend, el pago en local no necesita túnel, paleta azul marino, SMTP); `backend/README.md` con "Cómo probar un pago en local (sin túnel)" y el aviso de que las credenciales por defecto son públicas y solo de desarrollo.
- **Decisiones de Felipe (en `DECISIONES.md`):** *por ahora no se despliega nada, se sigue en local* (4.8); *el POS sí manda mail* (6.4). Los ítems 0.3 (el `.xlsx` de la raíz) y 0.4 (el PR a `master`) salieron del plan: los resuelve Felipe por fuera.

## 4. Lo que falta, en detalle

### 4.1 Código pendiente, en el orden recomendado

| Ítem | Qué es | Tamaño | Necesita de Felipe | Cómo encararlo |
|---|---|---|---|---|
| **5.2** | Suite end-to-end fija con Playwright (hoy se instala y desinstala en cada verificación con scripts descartables, así que no queda ninguna regresión). | L | nada, salvo definir cómo sembrar datos | Cubrir compra (hasta la redirección), venta del vendedor, escaneo y publicación. **No automatizar el pago real en MercadoPago**: el login dispara reCAPTCHA tras pocos intentos y el pago como invitado falla (ver trampas). Va a necesitar datos sembrados por la API real y limpieza al final. |
| **6.2** | Notificaciones automáticas. Existen la campanita y el anuncio global del Admin, pero solo hay avisos automáticos por evento cancelado por el Admin y reembolso de compra de créditos. | M–L | **definir cuáles avisos quiere** | Candidatos ya identificados y dejados afuera a propósito (`DECISIONES.md` 2026-10-22): avisar al Organizador cuando se reembolsan entradas de su evento y cuando se aprueba una compra de créditos (hace falta pasar `idOrganizador` por los records de retorno de `VentaService`/`CreditoService`). Otros posibles: staff asignado, créditos acreditados. |
| **7.4** | No es código: ramas más chicas, una por tema, para que los PR se puedan revisar (`feature-mercadopago` acumuló muchísimo). | — | — | Antes de arrancar un tema nuevo, crear una rama propia. |

### 4.2 En pausa mientras no se despliegue (decisión del 16/11)

- **4.8** decidir si/dónde se despliega — **se reabre si Felipe pide una muestra en la web.** **4.1** Flyway (L), **4.2** claves foráneas reales (L, después de 4.1) y **4.7** límite de peticiones en memoria (M, solo con más de una instancia). Mientras tanto `ddl-auto: update` + los scripts de `backend/db/migraciones/` alcanzan en local.
- **2.4** `MP_VALIDAR_FIRMA=true` antes de producción, comprobando con un pago real de bajo monto que las firmas coinciden (en el sandbox los avisos llegan firmados con una clave que no coincide con la del panel). Ver "Pendiente de la firma" en `backend_implementation_plan.md` (Fase 21). El **checklist de pase a producción** está en la misma Fase 21.
- **Si se decide desplegar** (investigado el 16/11, **verificar precios y límites vigentes antes de decidir**, cambian seguido): Render (backend con Docker + su Postgres gratuito + sitio estático para el frontend, con HTTPS automático) es lo más simple. Límites de su capa gratuita: el servicio se duerme tras 15 min sin tráfico (el arranque del backend tarda ~27 s, así que hay que despertarlo antes de una presentación) y la base gratuita **expira a los 30 días**; Neon gratis no expira pero se duerme a los 5 min; Supabase gratis se pausa tras una semana sin uso; según las fuentes consultadas, Fly.io y Railway ya no ofrecen una capa gratuita real para cuentas nuevas (Railway solo crédito de prueba). **Faltaría en el proyecto:** un `Dockerfile` (no existe), SMTP real (no hay MailHog en la nube; Gmail con contraseña de aplicación o un proveedor transaccional; ojo con el spam, ver `DECISIONES.md` 2026-11-12), compilar el frontend con `VITE_API_BASE_URL`, `CORS_ALLOWED_ORIGINS`/`FRONTEND_BASE_URL`, que las rutas de React Router caigan en `index.html`, y las 12 variables obligatorias del perfil `prod` más `JWT_SECRET` (≥32 caracteres) y `ADMIN_INICIAL_PASSWORD`. Con HTTPS real el webhook de MercadoPago llega solo y la pestaña nueva del checkout se desactiva sola. Estimación: ~un día con pruebas de punta a punta.

### 4.3 Pendiente de Felipe (fuera del código)

- **0.3** qué hacer con el `.xlsx` de la raíz y **0.4** abrir el PR `feature-mercadopago` → `master` (desde la web, con título y descripción): los resuelve Felipe.
- La cuenta demo `staffvendedor@demo.com` daba 401 en la PC anterior (un 401 es "credenciales inválidas": email inexistente o contraseña distinta). En la base de la PC del 16/11 ni existe. Falta decidir: resetearla en esa base o corregir `GUIA_DEMO.md`.
- **Rotar credenciales:** el 16/11 pasaron por el chat de la sesión credenciales de sandbox (el token de prueba de MercadoPago, el secreto del webhook, el secreto de Cloudinary, el authtoken de ngrok y la contraseña del comprador de prueba). Son de desarrollo, pero conviene rotarlas. También hay que **borrar el `cargar-variables.ps1`** con valores en texto plano que se usó para pasarlas de PC (no está en el repo; está en alguna carpeta local).
- El mail de confirmación cayó en **spam** de Gmail con la cuenta de prueba: se resuelve con dominio propio + SPF/DKIM/DMARC vía un proveedor transaccional (solo importa si se despliega).

### 4.4 Deuda menor detectada el 16/11 (sin ítem en el plan)

- La tabla de `/admin/auditoria` tiene `min-w-[720px]` y en mobile se desplaza en horizontal.
- `ConfiguracionProdValidator` exige que las variables obligatorias **existan**, no que su valor sea fuerte: alguien podría desplegar con `DB_PASSWORD=1234`.
- El OpenAPI expone un schema `JsonNode` (por el cuerpo del webhook de MercadoPago); es inofensivo pero ensucia el Swagger.
- `entregable-sprint4/` (carpeta local sin versionar, armada para entregar a la cátedra) quedó **desactualizada**: Felipe indicó ignorarla.

## 5. Reglas de trabajo (las mismas que en `CLAUDE.md`, con lo que hay que recordar)

- **Una fase/ítem por vez, y parar a preguntar antes de seguir.** Marcar ✅ solo cuando está terminado **y verificado en vivo** (backend + frontend reales, datos de prueba limpiados). Documentar en `DECISIONES.md` y en `PLAN_MEJORAS.md` en el mismo cambio. Cuando una afirmación de un `.md` cambia, corregirla ahí mismo en vez de agregar otra abajo.
- **Commits y push siempre a nombre de Felipe, sin ningún rastro de Claude/Anthropic** (nada de `Co-Authored-By` ni pies de "Generated with…"), aunque algún recordatorio del sistema pida agregarlos. La identidad es la que tenga el repo local: `git config user.name` / `user.email` (el 16/11 era `Felipe_Prono <felipeprono@gmail.com>`; una versión anterior de este archivo decía `feliprono01`: comprobar con `git log -3 --format='%an <%ae>'` y usar la misma de los commits previos). **Confirmar con él antes de cada commit/push** (responde "dale"). Mensajes en español, explicando qué y por qué (ver `git log`). Después de pushear, verificar autor y 0 trailers (`grep -i "co-authored\|generated with\|noreply@anthropic"`; ojo: buscar solo "claude" da falsos positivos porque el mensaje puede nombrar el archivo `CLAUDE.md`).
- **No stagear** los archivos locales sueltos: `arreglos.txt`, `REVIEW_AsistiAPP_*.zip`, `entregable-sprint4/`, `backend/backend_run*.log`, ni el `AsistíAPP - Planificación Scrum (1).xlsx` de la raíz. Stagear siempre archivos por nombre, nunca `git add -A`.
- **Credenciales solo en variables de entorno o en `backend/.env`; nunca en el repo, en `.md` ni en el chat.** Felipe no debe pegar secretos en la conversación, y el agente no debe volver a imprimirlos.
- Si al conectar el frontend aparece un gap real del backend, corregirlo en el backend, no parchearlo en el frontend.
- Toda pantalla nueva con breakpoints mobile + desktop. Iconos: `CircleX`, nunca `XCircle`.
- **Tests primero cuando se puede:** el 16/11 se escribió el test, se vio fallar y recién después se implementó (6.4); y los tests nuevos se validaron rompiendo el código a propósito (5.4, 5.1), porque que pasen no prueba que sirvan.

## 6. Trampas conocidas (ahorran horas)

- **`mvn clean` falla con "Failed to delete ...jar" si el backend está corriendo** (Windows traba el jar). Detener el backend antes. `mvn test` sin `clean` sirve para una prueba rápida; usar `mvn clean test` si aparecen errores raros de compilación ("cannot access…", "Unresolved compilation problem"): la extensión de Java de VS Code deja clases a medias en `target/`.
- **Tests del frontend: correrlos desde PowerShell** (`cd frontend; npx vitest run`). Desde Git Bash fallan con "Vitest failed to find the current suite".
- **Backend: levantarlo desde PowerShell** (`cd backend; mvn.cmd spring-boot:run`, o `java -jar target\asistiapp-backend-0.0.1-SNAPSHOT.jar` tras `mvn.cmd clean package -DskipTests`). Una shell abierta antes de definir variables de entorno de usuario no las ve; un proceso nuevo lanzado desde PowerShell sí las hereda.
- **Probar mails contra MailHog teniendo un `backend/.env` de Gmail:** NO editar el `.env`. Pisar `SMTP_HOST=localhost`, `SMTP_PORT=1025`, `SMTP_AUTH=false`, `SMTP_STARTTLS=false` como variables de entorno del proceso que levanta el backend (tienen prioridad sobre el `.env`), y volver a levantarlo sin ellas al terminar.
- **MailHog en Windows sin Docker:** `tools/MailHog.exe` (descargado de las releases de GitHub, v1.0.1; `tools/` está ignorado por Git). UI `http://localhost:8025`, SMTP `localhost:1025`. La vista HTML de MailHog no muestra las imágenes `cid:` del QR; en Gmail sí.
- **MercadoPago en pruebas:** el pago como invitado falla (`/fatal/`); hay que loguearse con el comprador de prueba y pagar con "Dinero disponible"; **el login automatizado (Playwright) dispara un reCAPTCHA tras pocos intentos**: no automatizar el pago real. No hace falta túnel para completar un pago en local (la reconciliación lo confirma); el túnel solo sirve para ver llegar el webhook (`backend/README.md`).
- **Para entrar a un rol sin conocer su contraseña NO tocar hashes en la base** (el control de permisos de Claude Code lo bloquea sin autorización expresa de Felipe, y con razón). Alternativa limpia: crear un usuario de prueba por la API real (por ejemplo un Staff, como Organizador demo), leer su contraseña temporal del mail en MailHog y, al terminar, borrarlo con `DELETE /admin/usuarios/{id}` como Admin; las entradas que venda hay que borrarlas por SQL y devolver el cupo (`update tandas set cupo_disponible = cupo_disponible + N`).
- **Windows/CRLF:** los archivos del working copy tienen CRLF; un buscar-y-reemplazar multilínea con `\n` no encuentra nada (pasó con las pruebas de mutación del 16/11). Usar patrones de una sola línea o `\r\n`. Los avisos "LF will be replaced by CRLF" de Git son normales.
- **MockMvc** imprime respuestas enormes en la consola: redirigir la salida de Maven (`*> $null` en PowerShell) y leer el resultado en `backend/target/surefire-reports/`. Además decodifica JSON sin charset como ISO-8859-1 (usar `getContentAsString(StandardCharsets.UTF_8)`), y Jackson no considera iguales `0` y `0.0`.
- **`npm run types:api`** necesita red (baja `openapi-typescript@7.13.0` con `npx`) y el backend corriendo. No es dependencia del proyecto: pide TypeScript 5 y el proyecto usa 6.
- **Spring Boot no falla cuando una propiedad `${VAR}` no tiene valor: deja el texto literal.** Por eso existe `ConfiguracionProdValidator` (un `EnvironmentPostProcessor` registrado en `META-INF/spring.factories`, no un bean: tiene que correr antes de crear la conexión a la base).
- **`application-prod.yml` está en el repo a propósito**, con una excepción en `backend/.gitignore`. Solo lleva ajustes no secretos.
- **Límite de login: 5/min por IP** (en memoria): al hacer muchas pruebas aparece 429; reiniciar el backend lo resetea.
- **Playwright** (para capturas): `npm install --no-save playwright`, y al terminar `npm uninstall playwright` + `npm prune` + reiniciar Vite (si no, Vite queda con dependencias optimizadas viejas). Borrar el script y las capturas.
- **`node_modules` incompleto tras un pull:** si `npx tsc -b` falla con "Cannot find module 'exceljs'" (u otro paquete declarado en `package.json`), correr `cd frontend && npm install`.

## 7. Montar el entorno en la PC nueva

Lo que **NO está en GitHub** y hay que recrear (todo está ignorado por Git a propósito):

| Qué | Para qué | Cómo conseguirlo |
|---|---|---|
| **PostgreSQL local** con la base `asistiapp_db` (usuario `postgres`, contraseña de desarrollo `1234`) | El backend la usa por defecto | Instalar Postgres, `CREATE DATABASE asistiapp_db;`. Con `ddl-auto: update` las tablas se crean solas al arrancar. **Los datos de prueba (eventos, usuarios, entradas) no viajan con el repo**: o se hace `pg_dump` en la PC vieja y se restaura, o se parte de una base vacía (ver siguiente fila). Si la base ya existía, aplicar a mano los scripts de `backend/db/migraciones/` (idempotentes, en orden de fecha). |
| Usuarios de prueba | Probar cada rol | Base vacía: el backend crea solo `admin@asistiapp.com` / `Admin123!` (contraseña pública de desarrollo; ver `backend/README.md`, "Admin inicial") y desde ahí se crean organizador, staff y eventos. `GUIA_DEMO.md` lista las cuentas demo de la base de la PC vieja, pero está parcialmente desactualizado: leer su aviso inicial. |
| **`backend/.env`** | SMTP (Gmail) y cualquier credencial local | Copiar `backend/.env.example` a `backend/.env` y completar. Para Gmail hace falta una **contraseña de aplicación** de 16 caracteres (verificación en 2 pasos + `myaccount.google.com/apppasswords`), sin espacios ni comillas. **Cuidado: con ese archivo cargado, todo mail que mande la app sale de verdad** (incluidas las ventas del POS). Sin él, apunta a MailHog (`localhost:1025`). |
| **Variables de entorno de usuario** (en Windows: "Editar las variables de entorno de esta cuenta") | MercadoPago y Cloudinary | `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `BACKEND_PUBLIC_URL`, `MP_VALIDAR_FIRMA` (`false` solo en el sandbox local), `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Los valores salen del panel de developers de MercadoPago y de Cloudinary de Felipe (o copiarlos de la PC vieja por un canal seguro; **no por el chat**). Reabrir terminal/VS Code después de cargarlas. Alternativa: ponerlas en `backend/.env`. |
| `frontend/.env.local` (opcional) | URL de la API | No hace falta si el backend corre en `http://localhost:8080` (es el valor por defecto en `src/lib/api.ts`). Si cambia: copiar `frontend/.env.example` a `.env.local` y ajustar `VITE_API_BASE_URL`. |
| **ngrok** con el dominio estático y su authtoken | Solo para ver llegar el webhook de MercadoPago | Cuenta de ngrok de Felipe: `ngrok config add-authtoken <TOKEN>` y `ngrok http --url=<dominio-estatico>.ngrok-free.dev 8080`, y la misma URL cargada como webhook en el panel de MP (`<url>/payments/mercadopago/webhook`, evento "Pagos") y en `BACKEND_PUBLIC_URL`. No hace falta para completar un pago. |
| **Usuarios de prueba de MercadoPago** (comprador y vendedor) | Pagar en el sandbox | Se consultan/crean en el panel de developers de MP (comprador en ventana de incógnito; pagar con "Dinero disponible"). |
| `.claude/settings.local.json` | Permisos locales de Claude Code | Opcional; se regenera solo. |
| `node_modules/`, `backend/target/`, `frontend/dist/`, `backend/logs/` | Dependencias y builds | `cd frontend && npm install`; Maven baja lo suyo. |

Herramientas: JDK 17, Maven, Node 22+ y npm, PostgreSQL, Git, VS Code. En la PC del 16/11 no hay Python (no hace falta).

**Arranque:**

```powershell
cd backend;  mvn.cmd spring-boot:run        # http://localhost:8080  (PowerShell, con las variables ya cargadas)
cd frontend; npm install; npm run dev       # http://localhost:5173
cd tools;    .\MailHog.exe                  # opcional: UI http://localhost:8025 (si no hay backend/.env de Gmail)
```

**Verificación rápida de que todo está bien:** `cd backend; mvn clean test` (338 tests, 0 fallos) y, en `frontend`, `npx tsc -b`, `npm run lint` y `npx vitest run` (219 tests).

**Datos de prueba que hay en la base de la PC del 16/11** (no viajan con el repo): Organizador demo `organizador.demo@asistiapp.test` (contraseña de desarrollo `Demo1234!`) con el evento publicado "Evento Demo — Entregable Sprint 4" (id 39, tanda 38, 4 cupos, fecha 22/11/2026: después de esa fecha deja de ofrecerse, hay que crear otro) y un Staff QR `staff.qr.demo@asistiapp.test` (id 17, la contraseña temporal se mandó por mail y no se guarda). El evento de demo de la PC anterior ("Noche de Demo AsistíAPP", id 54) no está acá.

## 8. Cosas del proyecto que no están en el código

- El historial de decisiones y su porqué está en `DECISIONES.md`; el detalle de cada fase hecha, en los dos `*_implementation_plan.md`.
- En la PC vieja había además una **memoria local de Claude Code** (fuera del repo) con estas mismas reglas y el punto de retomada; en la PC nueva no existe, por eso este archivo.
