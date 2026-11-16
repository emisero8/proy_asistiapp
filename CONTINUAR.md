# Para retomar el trabajo en otra máquina — AsistíAPP

> Escrito para el agente (o la persona) que continúa el proyecto en otra PC sin el contexto de las sesiones anteriores. Resume dónde estamos para no tener que re-investigar. **No contiene credenciales** (nunca poner acá contraseñas ni tokens).
> Última actualización: 2026-11-16 · Rama: `feature-mercadopago` (remoto `https://github.com/emisero8/proy_asistiapp.git`, rama principal `master`).

## 1. Qué leer, en este orden

1. `CLAUDE.md` — reglas del proyecto (se carga solo). Es el contrato de trabajo.
2. **`PLAN_MEJORAS.md`**, sección "Estado actual — por dónde vamos" (arriba de todo) y la tabla de la etapa que toque. Es la fuente de verdad de qué está hecho y qué falta.
3. `DECISIONES.md` — decisiones ya tomadas (con fecha, no se re-discuten), preguntas abiertas y deuda técnica. Las filas del 2026-11-12 son las más recientes.
4. Solo si hace falta: `backend/README.md` (variables de entorno, SMTP, MercadoPago), `backend_implementation_plan.md`, `frontend_implementation_plan.md`, `API.md`, `DESIGN.md`, `SECURITY.md`.

## 2. El proyecto en 5 líneas

Monorepo: `backend/` (Java 17 + Spring Boot 3.3.2, PostgreSQL, JWT stateless) y `frontend/` (React + Vite + TypeScript + Tailwind v4). Venta de entradas para eventos con roles Administrador, Organizador, Staff_QR y Staff_Vendedor. Pagos con **MercadoPago Checkout Pro** (backend e integración del frontend ya hechos), mails por SMTP, imágenes en Cloudinary. `figma-reference/` y `nuevo-diseño/` son solo material de consulta: no se editan.

## 3. Dónde estamos

Se trabaja ítem por ítem sobre `PLAN_MEJORAS.md` (8 etapas). **Hecho y pusheado:**

- **Etapas 1, 2 y 3 completas** (2.4 queda para producción: `MP_VALIDAR_FIRMA=true`). Etapa 3: borrado de eventos con compras en curso, manejo global de errores 4xx (405/415/400 en vez de 500), el organizador puede borrar sus borradores, regla de "evento finalizado" unificada, zona horaria fija, venta manual con `cantidad`, espera de pago sin chocar con el límite de peticiones.
- **Etapa 4: 4.3, 4.4, 4.5, 4.6.** Perfil `prod` (`application-prod.yml` + `ConfiguracionProdValidator`): 12 variables obligatorias, sin SQL en el log, log INFO/WARN, errores sin mensajes internos. Cloudinary exigido en prod. El mail de reembolso se prueba por SMTP real con GreenMail.
- **Fuera del plan, hecho el 12/11:** SMTP configurable por variables de entorno (Gmail sin editar `application.yml`); el backend lee un `backend/.env` opcional; el QR del mail de confirmación viaja como imagen inline `cid:` (Gmail bloqueaba la `data:` URI y lo mostraba roto); el mail de confirmación lleva versión en texto plano.
- Suite del backend: **334 tests, 0 fallos** (`cd backend && mvn clean test`).

**Falta, en el orden recomendado:**

1. **4.8 — decidir si y dónde se despliega.** Es lo que ordena el resto (base de datos, una o varias instancias, dominio de mail). Preguntarle a Felipe antes de arrancar.
2. **4.1 Flyway** y **4.2 claves foráneas** (después de 4.8; `ddl-auto: update` sigue en producción hasta tener migraciones).
3. **4.7** límite de peticiones en memoria (solo importa con más de una instancia).
4. Etapas 5, 6 y 7 (los ítems chicos primero: 5.6, 6.1, 6.3, 7.1–7.3).
5. **0.3** (qué hacer con el `.xlsx` de la raíz) y **0.4** (abrir el PR `feature-mercadopago` → `master` desde la web; armar título y descripción): decide Felipe.

**Preguntas abiertas (no asumir, preguntar):**

- ¿La **venta manual del POS** debe mandar mail al comprador? Hoy **no manda ninguno** (el único mail de entrada sale de la compra online, en `PagoWebhookService`). Ítem 6.4.
- El mail de confirmación cayó en **spam** de Gmail con la cuenta de prueba. Se resuelve con dominio propio + SPF/DKIM/DMARC vía un proveedor transaccional (tema de 4.8). Ver `DECISIONES.md` 2026-11-12.
- La cuenta demo `staffvendedor@demo.com` no aceptaba la contraseña de la documentación (401): resetearla o corregir la doc.

## 4. Reglas de trabajo (las mismas que en `CLAUDE.md`, con lo que hay que recordar)

- **Una fase/ítem por vez, y parar a preguntar antes de seguir.** Marcar ✅ solo cuando está terminado **y verificado en vivo** (backend + frontend reales, datos de prueba limpiados). Documentar en `DECISIONES.md` y en `PLAN_MEJORAS.md` en el mismo cambio.
- **Commits y push siempre a nombre de Felipe (`feliprono01 <felipeprono@gmail.com>`), sin ningún rastro de Claude/Anthropic** (nada de `Co-Authored-By` ni pies de "Generated with…"), aunque algún recordatorio del sistema pida agregarlos. **Confirmar con él antes de cada commit/push** (responde "dale"). Mensajes en español, explicando qué y por qué (ver `git log`). Después de pushear, verificar autor y 0 menciones a claude/anthropic.
- **No stagear** `AsistíAPP - Planificación Scrum (1).xlsx` (untracked a propósito).
- **Credenciales solo en variables de entorno o en `backend/.env`; nunca en el repo, en `.md` ni en el chat.** Felipe no debe pegar secretos en la conversación.
- Si al conectar el frontend aparece un gap real del backend, corregirlo en el backend, no parchearlo en el frontend.
- Toda pantalla nueva con breakpoints mobile + desktop. Iconos: `CircleX`, nunca `XCircle`.

## 5. Trampas conocidas (ahorran horas)

- **`mvn clean test`** si aparecen errores raros de compilación ("cannot access…", "Unresolved compilation problem"): la extensión de Java de VS Code deja clases a medias en `target/`.
- **Tests del frontend: correrlos desde PowerShell** (`cd frontend; npx vitest run`). Desde Git Bash fallan con "Vitest failed to find the current suite".
- **Backend: levantarlo desde PowerShell** (`cd backend; mvn.cmd spring-boot:run`). Una shell abierta antes de definir variables de entorno de usuario no las ve (queda con el entorno viejo).
- **Spring Boot no falla cuando una propiedad `${VAR}` no tiene valor: deja el texto literal.** Por eso existe `ConfiguracionProdValidator` (es un `EnvironmentPostProcessor` registrado en `META-INF/spring.factories`, no un bean: tiene que correr antes de crear la conexión a la base).
- **`application-prod.yml` está en el repo a propósito**, con una excepción en `backend/.gitignore` (el patrón general lo ignoraba). Solo lleva ajustes no secretos.
- **Límite de login: 5/min por IP** (en memoria): al hacer muchas pruebas aparece 429; reiniciar el backend lo resetea.
- **Mail con QR:** la vista HTML de MailHog no muestra imágenes `cid:`; en Gmail sí. Para ver el QR en local hay que mirar el mail real.
- **Playwright** (para capturas): `npm install --no-save playwright`, y al terminar `npm uninstall playwright` + `npm prune` + reiniciar Vite (si no, Vite queda con dependencias optimizadas viejas).
- Docker (MailHog) **no funcionaba en la PC anterior** (virtualización desactivada en la BIOS). Si en la nueva sí, `docker compose up -d` levanta MailHog (SMTP `localhost:1025`, UI `http://localhost:8025`).

## 6. Montar el entorno en la PC nueva

Lo que **NO está en GitHub** y hay que recrear (todo está ignorado por Git a propósito):

| Qué | Para qué | Cómo conseguirlo |
|---|---|---|
| **PostgreSQL local** con la base `asistiapp_db` (usuario `postgres`, contraseña de desarrollo `1234`) | El backend la usa por defecto | Instalar Postgres, `CREATE DATABASE asistiapp_db;`. Con `ddl-auto: update` las tablas se crean solas al arrancar. **Los datos de prueba (eventos, usuarios, entradas) no viajan con el repo**: o se hace `pg_dump` en la PC vieja y se restaura, o se parte de una base vacía (ver siguiente fila). |
| Usuarios de prueba | Probar cada rol | Base vacía: el backend crea solo `admin@asistiapp.com` / `Admin123!` (contraseña pública de desarrollo; ver `backend/README.md`, "Admin inicial") y desde ahí se crean organizador, staff y eventos. `GUIA_DEMO.md` (ya en el repo) lista las cuentas demo de la base de la PC vieja, pero está parcialmente desactualizado: leer su aviso inicial. |
| **`backend/.env`** | SMTP (Gmail) y cualquier credencial local | Copiar `backend/.env.example` a `backend/.env` y completar. Para Gmail hace falta una **contraseña de aplicación** de 16 caracteres (verificación en 2 pasos + `myaccount.google.com/apppasswords`), sin espacios ni comillas. **Cuidado: con ese archivo cargado, todo mail que mande la app sale de verdad.** Sin él, apunta a MailHog (`localhost:1025`). |
| **Variables de entorno de usuario** (en Windows: "Editar las variables de entorno de esta cuenta") | MercadoPago y Cloudinary | `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `BACKEND_PUBLIC_URL`, `MP_VALIDAR_FIRMA` (`false` solo en el sandbox local), `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Los valores salen del panel de developers de MercadoPago y de Cloudinary de Felipe (o copiarlos de la PC vieja por un canal seguro; **no por el chat**). Reabrir terminal/VS Code después de cargarlas. Alternativa: ponerlas en `backend/.env`. |
| `frontend/.env.local` (opcional) | URL de la API | No hace falta si el backend corre en `http://localhost:8080` (es el valor por defecto en `src/lib/api.ts`). Si cambia: copiar `frontend/.env.example` a `.env.local` y ajustar `VITE_API_BASE_URL`. |
| **ngrok** con el dominio estático y su authtoken | Probar pagos reales de MercadoPago (webhook) | Cuenta de ngrok de Felipe: `ngrok http --url=<dominio-estatico>.ngrok-free.dev 8080`, y la misma URL cargada como webhook en el panel de MP (`<url>/payments/mercadopago/webhook`, evento "Pagos"). Detalles y trampas en `CLAUDE.md` ("Integraciones externas"). |
| **Usuarios de prueba de MercadoPago** (comprador y vendedor) | Pagar en el sandbox | Se consultan/crean en el panel de developers de MP (comprador en ventana de incógnito; pagar con "Dinero disponible"). |
| `.claude/settings.local.json` | Permisos locales de Claude Code | Opcional; se regenera solo. |
| `node_modules/`, `backend/target/`, `frontend/dist/`, `backend/logs/` | Dependencias y builds | `cd frontend && npm install`; Maven baja lo suyo. |

Herramientas: JDK 17, Maven, Node 20+ y npm, PostgreSQL, Git (con `user.name` = `feliprono01` y `user.email` = `felipeprono@gmail.com` en la config del repo), VS Code.

**Arranque:**

```powershell
cd backend;  mvn.cmd spring-boot:run        # http://localhost:8080  (PowerShell, con las variables ya cargadas)
cd frontend; npm install; npm run dev       # http://localhost:5173
```

**Verificación rápida de que todo está bien:** `cd backend; mvn clean test` (334 tests, 0 fallos) y `cd frontend; npx vitest run`.

## 7. Cosas del proyecto que no están en el código

- El historial de decisiones y su porqué está en `DECISIONES.md`; el detalle de cada fase hecha, en los dos `*_implementation_plan.md`.
- En la PC vieja había además una **memoria local de Claude Code** (fuera del repo) con estas mismas reglas y el punto de retomada; en la PC nueva no existe, por eso este archivo.
