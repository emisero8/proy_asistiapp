# AsistíAPP — Backend

API REST del sistema de venta de entradas y control de acceso. Java 17 + Spring Boot 3 + PostgreSQL.

## Requisitos

- Java 17
- Maven (o usar el wrapper si se agrega más adelante)
- PostgreSQL corriendo localmente (o accesible por red)

## Levantar en local

> **Todo lo que figura en este README como valor por defecto es público y solo sirve para desarrollo.** `DB_PASSWORD=1234`, el `JWT_SECRET` de desarrollo y el Admin `admin@asistiapp.com` / `Admin123!` están escritos en el repositorio, así que cualquiera que lo lea los conoce: alcanzan para levantar el sistema en una PC local y nada más. En producción no se usan: con `SPRING_PROFILES_ACTIVE=prod` el backend exige **definir** las variables marcadas ⚠️ (incluida `DB_PASSWORD`), se niega a arrancar con el `JWT_SECRET` público y no crea ningún Admin si no se define `ADMIN_INICIAL_PASSWORD` (el validador comprueba que las variables existan, no que su valor sea fuerte: eso depende de quien despliega). Las credenciales reales (base de datos, MercadoPago, Cloudinary, SMTP) van siempre por variable de entorno o en `backend/.env` (ignorado por Git), nunca en el repo ni en la documentación.

1. Crear la base de datos:
   ```sql
   CREATE DATABASE asistiapp_db;
   ```
2. Variables de entorno (todas tienen default de desarrollo si no se setean — ver `application.yml`). **Con `SPRING_PROFILES_ACTIVE=prod` esos defaults NO se usan**: las variables marcadas ⚠️ pasan a ser obligatorias y, si falta alguna, el backend no arranca y el error nombra todas las que faltan (`ConfiguracionProdValidator`):

   | Variable         | Default (dev)                                   |
   |------------------|--------------------------------------------------|
   | `DB_URL` ⚠️      | `jdbc:postgresql://localhost:5432/asistiapp_db`  |
   | `DB_USERNAME` ⚠️ | `postgres`                                       |
   | `DB_PASSWORD` ⚠️ | `1234`                                           |
   | `SMTP_HOST` ⚠️   | `localhost` (MailHog)                            |
   | `SMTP_PORT`      | `1025` (MailHog)                                 |
   | `SMTP_USERNAME` / `SMTP_PASSWORD` | vacíos (MailHog no usa autenticación). Con Gmail: la cuenta y su *contraseña de aplicación* (ver sección Envío de mails) |
   | `SMTP_AUTH` / `SMTP_STARTTLS` | `false` (MailHog). Con Gmail: `true` y `true` |
   | `JWT_SECRET`     | valor de desarrollo hardcodeado (público). **En producción es obligatorio definirlo**: con `SPRING_PROFILES_ACTIVE=prod` el backend se niega a arrancar si sigue el de desarrollo, o si tiene menos de 32 caracteres |
   | `SPRING_PROFILES_ACTIVE` | vacío en desarrollo. **`prod` en producción**: activa el control de `JWT_SECRET`, exige las variables marcadas ⚠️ (también `FRONTEND_BASE_URL`; las tres de Cloudinary también), evita que se cree un Admin con contraseña pública, apaga el SQL en el log, baja el nivel de log a INFO y no devuelve mensajes internos en los errores |
   | `CORS_ALLOWED_ORIGINS` ⚠️ | `http://localhost:5173,http://localhost:3000` |
   | `MP_ACCESS_TOKEN` ⚠️ | vacío — Access Token de MercadoPago (ver sección MercadoPago) |
   | `MP_WEBHOOK_SECRET` ⚠️ | vacío — clave secreta de Webhooks de MercadoPago |
   | `MP_VALIDAR_FIRMA` | `true` — **dejar en `true` en producción** |
   | `BACKEND_PUBLIC_URL` ⚠️ | `http://localhost:8080` — solo hace falta HTTPS público para recibir el webhook (ngrok en local); para pagar en local no es necesario, ver "Pagos con MercadoPago" |
   | `CLOUDINARY_CLOUD_NAME` ⚠️ | vacío — sin esto, subir una imagen de portada de evento o una foto de perfil falla (el resto de la app funciona igual; en desarrollo el backend avisa en el log al arrancar) |
   | `CLOUDINARY_API_KEY` ⚠️ | vacío |
   | `CLOUDINARY_API_SECRET` ⚠️ | vacío |
   | `RATE_LIMIT_PROXIES_CONFIABLES` | `0` — cantidad de proxies propios delante del backend (nginx, balanceador). Con `0` el límite de peticiones cuenta por la IP de la conexión e ignora `X-Forwarded-For`. **Si se despliega detrás de un proxy, ponerlo en su cantidad** (normalmente `1`); si no, todos los usuarios comparten un único límite |
   | `MP_INTERVALO_RECONCILIACION_SEGUNDOS` | `10` — como mucho una consulta a MercadoPago cada tantos segundos por orden cuando el comprador mira el estado de su pago; el resto de las consultas se responde desde la base. Permite que el límite de peticiones por IP sea holgado (120/min) sin sobrecargar a MercadoPago |
   | `APP_TIMEZONE` | `America/Argentina/Buenos_Aires` — zona horaria de la aplicación. Se fija al arrancar, sin importar cómo esté configurado el servidor (en la nube suele ser UTC). Las fechas de eventos, tandas y vencimiento de órdenes son hora de pared argentina; con otra zona el backend las correría. Un valor inválido hace fallar el arranque |
   | `ADMIN_INICIAL_PASSWORD` | vacío — contraseña del primer Administrador (ver "Primer usuario Administrador"). **Obligatoria en producción** |
   | `ADMIN_INICIAL_EMAIL` | `admin@asistiapp.com` — email del primer Administrador |

3. Correr:
   ```
   mvn spring-boot:run
   ```
   Hibernate crea/actualiza el schema solo (`ddl-auto: update`): tablas y columnas nuevas aparecen solas. Lo que **no** hace es cambiar constraints de tablas que ya existen, así que si tu base es anterior a un cambio de ese tipo hay que aplicar a mano los scripts de `db/migraciones/` (todos idempotentes, en orden de fecha):

   ```
   psql -h localhost -U postgres -d asistiapp_db -f db/migraciones/<archivo>.sql
   ```

   Si arrancás con una base vacía no necesitás correr ninguno. Si el anuncio global del Admin o marcar una orden como vencida/reembolsada devuelven 500, casi seguro falta alguno.

4. La API queda en `http://localhost:8080`.

## Primer usuario Administrador

No existe auto-registro para el rol Administrador (solo Organizador puede registrarse solo — `POST /auth/register`; Admin y Staff los da de alta un Administrador existente). Para no depender de insertar filas a mano, al arrancar el backend crea el primer Administrador **si todavía no hay ninguno** (`AdminInicialSeeder`). Las credenciales salen de dos variables de entorno:

| Variable | Qué hace |
|---|---|
| `ADMIN_INICIAL_PASSWORD` | Contraseña del primer Admin (mínimo 8 caracteres; si es más corta el backend no arranca). **Obligatoria en producción.** |
| `ADMIN_INICIAL_EMAIL` | Email del primer Admin. Opcional: por defecto `admin@asistiapp.com`. |

Qué pasa según el caso:

- **Con `ADMIN_INICIAL_PASSWORD` definida** (cualquier perfil): se crea el Admin con esas credenciales. La contraseña nunca se escribe en el log.
- **Desarrollo, sin variables**: se crea `admin@asistiapp.com` / `Admin123!` (contraseña pública de desarrollo, para no obligar a configurar nada en local).
- **Producción (`SPRING_PROFILES_ACTIVE=prod`), sin `ADMIN_INICIAL_PASSWORD`**: **no se crea ningún Admin** y el backend avisa en el log. Crear uno con una contraseña pública sería regalar el sistema.

Solo actúa si **no existe ningún Administrador**: si tu base ya tenía uno (por ejemplo creado a mano), no hace nada y las credenciales de arriba no existen en esa base — usá las de tu Admin. Para saber cuál es: `select email from usuarios where rol = 'Administrador';`. Una vez creado, cambiar la contraseña desde el panel de Admin y quitar `ADMIN_INICIAL_PASSWORD` del entorno.

## Documentación de la API (Swagger / OpenAPI)

Con la app corriendo:

- Swagger UI (explorable, con botón "Authorize" para pegar el JWT): `http://localhost:8080/swagger-ui/index.html`
- Spec cruda OpenAPI: `http://localhost:8080/v3/api-docs`

Flujo típico para probar un endpoint protegido desde Swagger:
1. `POST /auth/login` (o `/auth/register` si es la primera vez) → copiar el `token` de la respuesta.
2. Botón **Authorize** (arriba a la derecha) → pegar el token (sin `Bearer `, Swagger lo agrega solo).
3. Probar cualquier endpoint protegido desde la UI.

## Envío de mails (SMTP)

`EmailService` usa `JavaMailSender` estándar — cualquier proveedor SMTP sirve, no está atado a ninguno en particular.

### Desarrollo local: MailHog

Por defecto, `application.yml` apunta a **MailHog** (`localhost:1025`, sin auth ni TLS). Para levantarlo:

```bash
# Desde la raíz del repo (donde está docker-compose.yml)
docker compose up -d
```

Esto levanta MailHog con:
- **SMTP:** `localhost:1025` (el backend ya envía ahí por defecto)
- **UI web:** `http://localhost:8025` (bandeja de entrada para ver los mails capturados)

Todos los mails que envía el backend (confirmaciones de compra, credenciales de staff, recuperación de contraseña, cancelación de evento) se capturan en la UI web de MailHog — nada sale a internet.

### Gmail u otro proveedor SMTP (producción, o local si no se puede usar Docker)

No hace falta editar `application.yml`: el proveedor se elige solo con variables de entorno (de Windows o en un archivo `backend/.env`, ver más abajo) (los valores por defecto siguen siendo los de MailHog). Para Gmail:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_AUTH=true
SMTP_STARTTLS=true
SMTP_USERNAME=tu_cuenta@gmail.com
SMTP_PASSWORD=<app password de 16 caracteres, NO la contraseña normal de la cuenta>
```

**Con Gmail hace falta un "App Password"**, no la contraseña de la cuenta (Google deprecó SMTP con contraseña normal):
1. La cuenta de Gmail tiene que tener verificación en 2 pasos activada.
2. Generarlo en `myaccount.google.com/apppasswords` (Cuenta de Google → Seguridad → Verificación en 2 pasos → Contraseñas de aplicaciones).
3. Copiar el código de 16 caracteres que muestra una sola vez — ese es el `SMTP_PASSWORD`.

**Alternativa: archivo `backend/.env`.** Se puede copiar `backend/.env.example` a `backend/.env`, completar las líneas y arrancar el backend desde `backend/` (`mvn spring-boot:run`). `.env` está en el `.gitignore` (nunca se commitea) y, si no existe, no pasa nada. Las variables de entorno reales pisan a las del archivo. No poner comillas en los valores.

Notas:
- Gmail envía siempre **desde la cuenta autenticada** (no se puede poner otro remitente) y limita el volumen diario (unos 500 mails por cuenta personal): sirve para una demo o un lanzamiento chico, no para volumen.
- Como los mails salen de verdad, en desarrollo usar una cuenta de prueba y destinatarios propios.
- Sin Docker (por ejemplo, con la virtualización desactivada en la BIOS) MailHog no se puede levantar con `docker compose`; Gmail con una cuenta de prueba es la alternativa más simple para ver los mails en local.
- Variables de entorno de usuario en Windows: reabrir la terminal / VS Code para que las tome (ver el `CLAUDE.md` para el caso de MercadoPago, que es igual).

Para otros proveedores transaccionales (Brevo, SendGrid, Mailgun), el mecanismo es el mismo: son SMTP compatible, solo cambian esas variables.

Si el envío falla (MailHog caído, credenciales mal puestas, límite excedido), la operación de negocio (compra, alta de staff, etc.) **igual se completa** — el fallo queda solo logueado (`EmailService` está diseñado para no bloquear el flujo principal por un mail caído). Para detectar fallos sistemáticos, revisar los logs del backend.

## Pagos con MercadoPago (Checkout Pro)

El cobro de entradas y de créditos usa MercadoPago Checkout Pro. El detalle del diseño, las decisiones y el estado están en la **Fase 21** de `../docs/tecnica/backend_implementation_plan.md`.

**Configuración mínima (todo por variable de entorno, nunca en el repo). Alcanza para pagar en local, sin túnel:**
1. Crear una aplicación en el [panel de desarrolladores de MercadoPago](https://www.mercadopago.com.ar/developers/panel/app) y copiar el **Access Token de las credenciales de prueba** a `MP_ACCESS_TOKEN`. Reiniciar el backend (y reabrir la terminal / VS Code si la variable es de usuario de Windows).
2. Si la base ya existía, aplicar una vez `db/migraciones/2026-10-15-mercadopago-ordenes.sql` (una base nueva no lo necesita).
3. Tener un **usuario comprador de prueba**: panel de la app → *Cuentas de prueba*, con saldo cargado.

### Cómo probar un pago en local (sin túnel)

1. Con el backend y el frontend corriendo, elegir un evento publicado, ir a **Comprar entradas** y completar el checkout.
2. Como el sitio corre en `http`, **el checkout de MercadoPago se abre en una pestaña nueva** (`frontend/src/lib/pago.ts`). Si el navegador bloquea la ventana emergente, la app avisa antes de crear la orden: permitirlas para `localhost` y reintentar. La pestaña original queda en `/pago/resultado` esperando.
3. En MercadoPago, **en una ventana de incógnito**, elegir **"Ingresar con mi cuenta"**, entrar con el usuario comprador de prueba y pagar con **"Dinero disponible"**.
   - **No pagar como invitado con una tarjeta de prueba** (ni siquiera con titular `APRO`): con credenciales de usuario de prueba MercadoPago lo rechaza con una pantalla de error genérica (`/fatal/`). Está probado en un Chrome real y en Playwright; ver `../DECISIONES.md` (2026-10-15).
   - Si se automatiza el login con Playwright, MercadoPago muestra un reCAPTCHA después de varios intentos seguidos: hacer este paso a mano.
4. **En local la pantalla de "pago aprobado" de MercadoPago no tiene botón "Volver al sitio"**, y no es un bug: MercadoPago solo vuelve solo si el frontend es HTTPS público. Cerrar esa pestaña y volver a la original: sigue en `/pago/resultado`, consulta el estado cada 4 s (hasta 10 minutos) y pasa sola a **"¡Pago aprobado!"** con las entradas y su QR.
5. El mail de confirmación sale por el SMTP configurado (ver "Envío de mails"). En la vista HTML de MailHog el QR no se ve, porque viaja como imagen inline `cid:`; en un cliente real (Gmail) sí. Las entradas se ven igual en la pantalla de resultado.

Si se perdió la pestaña de espera, se entra a mano a `http://localhost:5173/pago/resultado?ref=<externalReference>&tipo=entradas` (o `tipo=creditos`). El `externalReference` queda en el log del backend: `Compra iniciada: ... ref=...` y `Preferencia MP creada: ... externalReference=...`.

**Por qué no hace falta un túnel:** la pantalla de resultado consulta `GET /tickets/orden/{ref}` (o `/creditos/orden/{ref}`) y, mientras la orden sigue `Pendiente`, el backend busca el pago en la API de MercadoPago por `external_reference` y lo confirma si ya está aprobado (como mucho una consulta cada `MP_INTERVALO_RECONCILIACION_SEGUNDOS` por orden). El job de vencimiento (cada 10 minutos) hace la misma reconciliación antes de expirar una orden. Verificado en vivo con el túnel apagado.

### Probar el webhook en sí (opcional, con túnel)

Solo hace falta para ver llegar el aviso de MercadoPago. Si `BACKEND_PUBLIC_URL` no es HTTPS, el backend lo avisa en el log y no manda `notification_url`.
1. Con ngrok (el plan gratuito da un dominio estático):
   ```
   ngrok config add-authtoken <TU_TOKEN>
   ngrok http --url=<tu-dominio>.ngrok-free.dev 8080
   ```
2. En el panel de la app → **Webhooks** (modo de prueba): URL `https://<tu-dominio>.ngrok-free.dev/payments/mercadopago/webhook`, evento **Pagos**. Copiar la **Clave secreta** a `MP_WEBHOOK_SECRET`, y setear `BACKEND_PUBLIC_URL=https://<tu-dominio>.ngrok-free.dev`. Reiniciar el backend.
3. El plan gratuito de ngrok no soporta dos túneles a la vez, así que no se puede tunelear también el frontend para tener HTTPS real en local.

**Firma del webhook:** el backend valida `x-signature`. En el sandbox los avisos de pagos reales llegan firmados con una clave que no coincide con la del panel, por lo que en desarrollo local se puede usar `MP_VALIDAR_FIRMA=false` (el pago igual se verifica contra la API de MercadoPago antes de entregar nada). **En producción tiene que estar en `true`.**

## Contrato de errores

Toda respuesta de error (4xx/5xx) tiene el mismo formato JSON, sin excepciones:
```json
{
  "status": 403,
  "error": "No tienes permisos para realizar esta acción",
  "path": "/eventos/5",
  "timestamp": "2026-08-14T12:00:00"
}
```
Los errores de validación (`400` por `@Valid`) además incluyen un campo `fields` con el detalle por campo.

## CORS

Los orígenes permitidos salen de `CORS_ALLOWED_ORIGINS` (coma-separado). Si el Frontend corre en un puerto/dominio distinto a los defaults de arriba, agregarlo ahí antes de integrar — sin esto el navegador bloquea las requests aunque el backend esté andando bien.

## Tests

```
mvn test
```
Corren contra H2 en memoria (perfil `test`, ver `application-test.yml`) — no necesitan PostgreSQL. CI configurado en `.github/workflows/backend-tests.yml`.

`OpenApiContratoTest` compara el contrato que publica la API (`/v3/api-docs`) con la copia que guarda el frontend (`../frontend/openapi.json`, de la que genera sus tipos). **Si cambiás un endpoint o un DTO y falla**, es lo esperado: con el backend corriendo, `cd frontend && npm run types:api`, después `npx tsc -b` para ver qué tipos del frontend actualizar, y commitear todo junto.
