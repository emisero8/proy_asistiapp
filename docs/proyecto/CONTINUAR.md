# Para retomar el trabajo — AsistíAPP

> Para la persona o el agente que continúa el proyecto sin el contexto de las sesiones anteriores. **No contiene credenciales** (nunca poner acá contraseñas ni tokens).
> Última actualización: 2026-11-26 · **Entrega del proyecto: 01/12/2026** · Rama principal: `master` (`https://github.com/emisero8/proy_asistiapp.git`). Cada cambio va en una rama propia y entra por PR.

> ⚠️ **Si tu base local ya existía, corré las migraciones antes de arrancar el backend:** `backend/db/aplicar-migraciones.ps1` (ver `backend/db/migraciones/README.md`). Las últimas son del 25/11 (auditoría, ver `docs/proyecto/INTEGRAR_AUDITORIA.md`) y del 26/11 (precio de cada entrada).

## 1. Qué leer, en este orden

1. `CLAUDE.md` — reglas del proyecto (se carga solo). Es el contrato de trabajo.
2. Este archivo.
3. `docs/proyecto/DECISIONES.md` — decisiones tomadas (con fecha, no se re-discuten), preguntas abiertas y deuda técnica.
4. Según la tarea: `docs/README.md` es el índice de todo lo demás.

## 2. El proyecto en 5 líneas

Monorepo: `backend/` (Java 17 + Spring Boot 3.3.2, PostgreSQL, JWT stateless) y `frontend/` (React + Vite + TypeScript 6 + Tailwind v4). Venta de entradas para eventos con roles Administrador, Organizador, Staff_QR y Staff_Vendedor. El Organizador compra créditos a la plataforma y cobra las entradas en su cuenta de Mercado Pago. Mails por SMTP, imágenes en Cloudinary.

## 3. Dónde estamos

- Las mejoras de `docs/proyecto/PLAN_MEJORAS.md` (Etapas 0–8), el rediseño del frontend y la auditoría están en `master`.
- **Reglas de los eventos (26/11):** un evento finaliza 12 horas después de empezar; hasta entonces se vende y el escáner valida. Desde que empieza, el Organizador ya no lo puede cancelar (el Admin sí). Cada entrada guarda su precio de venta y el vendedor ve cuánto le queda de su tope.
- **Hay una demo online** (Vercel + Render + Neon + Brevo, cobro con credenciales de prueba): `docs/tecnica/DEPLOY_DEMO.md`.
- Suites: backend `cd backend && mvn clean test`; frontend `npx vitest run`, `npx tsc -b`, `npm run lint`, `npm run build` y `npm run e2e` (necesita los dos servidores levantados, ver `frontend/e2e/README.md`).

## 4. Lo que falta

### 4.1 Antes de la entrega

- Probar la demo de punta a punta (compra, mail, POS, escáner, cancelación).
- Preparar los datos de la demo: eventos posteriores a la presentación con tandas abiertas, un Staff QR, un vendedor con tope y alguna venta.
- El día de la presentación, abrir la demo unos minutos antes (el backend gratuito se duerme).

### 4.2 Antes de cualquier producción

- `MP_VALIDAR_FIRMA=true`, comprobado con un pago real de bajo monto, y el checklist de la Fase 21 de `docs/tecnica/backend_implementation_plan.md`.
- Credenciales productivas de Mercado Pago, dominio propio (con SPF/DKIM/DMARC para que los mails no caigan en spam) y rotar las credenciales de prueba que circularon durante el desarrollo.
- Revisar `MP_OAUTH_REDIRECT_URI` en el servidor: la ruta debe incluir `/payments`.
- Flyway (4.1), claves foráneas reales (4.2) y límite de peticiones compartido (4.7, solo con más de una instancia).
- El reembolso con el precio guardado en cada entrada no se probó con dinero real.
- Cobro con OAuth: no se puede probar con usuarios de prueba (`docs/tecnica/MERCADOPAGO_COBRO.md`, sección 7).
- Lo fiscal (AAIP, contador): `docs/proyecto/LEGAL_Y_FISCAL.md`.

### 4.3 Deuda menor

- `ConfiguracionProdValidator` exige que las variables obligatorias existan, no que su valor sea fuerte.
- El OpenAPI expone un schema `JsonNode` (cuerpo del webhook); es inofensivo.

## 5. Reglas de trabajo (las mismas que en `CLAUDE.md`, con lo que hay que recordar)

- **Una fase/ítem por vez, y parar a preguntar antes de seguir.** Marcar ✅ solo cuando está terminado **y verificado en vivo** (backend + frontend reales, datos de prueba limpiados). Documentar en `docs/proyecto/DECISIONES.md` y en `docs/proyecto/PLAN_MEJORAS.md` en el mismo cambio. Cuando una afirmación de un `.md` cambia, corregirla ahí mismo en vez de agregar otra abajo.
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
- **Playwright** ya es dependencia de desarrollo (`@playwright/test`): la suite está en `frontend/e2e/` (`npm run e2e`, ver `frontend/e2e/README.md`). La primera vez en una máquina: `npx playwright install chromium`. Para capturas sueltas, un script `.mjs` temporal fuera del repo.
- **`node_modules` incompleto tras un pull:** si `npx tsc -b` falla con "Cannot find module 'exceljs'" (u otro paquete declarado en `package.json`), correr `cd frontend && npm install`.

## 7. Montar el entorno en la PC nueva

Lo que **NO está en GitHub** y hay que recrear (todo está ignorado por Git a propósito):

| Qué | Para qué | Cómo conseguirlo |
|---|---|---|
| **PostgreSQL local** con la base `asistiapp_db` (usuario `postgres`, contraseña de desarrollo `1234`) | El backend la usa por defecto | Instalar Postgres, `CREATE DATABASE asistiapp_db;`. Con `ddl-auto: update` las tablas se crean solas al arrancar. **Los datos de prueba (eventos, usuarios, entradas) no viajan con el repo**: o se hace `pg_dump` en la PC vieja y se restaura, o se parte de una base vacía (ver siguiente fila). Si la base ya existía, aplicar a mano los scripts de `backend/db/migraciones/` (idempotentes, en orden de fecha). |
| Usuarios de prueba | Probar cada rol | Base vacía: el backend crea solo `admin@asistiapp.com` / `Admin123!` (contraseña pública de desarrollo; ver `backend/README.md`, "Admin inicial") y desde ahí se crean organizador, staff y eventos. `docs/tecnica/GUIA_DEMO.md` lista las cuentas demo de la base de la PC vieja, pero está parcialmente desactualizado: leer su aviso inicial. |
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

**Verificación rápida de que todo está bien:** `cd backend; mvn clean test` (0 fallos) y, en `frontend`, `npx tsc -b`, `npm run lint` y `npx vitest run`.


## 8. Cosas del proyecto que no están en el código

- El historial de decisiones y su porqué está en `docs/proyecto/DECISIONES.md`; el detalle de cada fase hecha, en los dos `*_implementation_plan.md`.
- En la PC vieja había además una **memoria local de Claude Code** (fuera del repo) con estas mismas reglas y el punto de retomada; en la PC nueva no existe, por eso este archivo.
