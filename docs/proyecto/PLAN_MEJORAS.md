# Plan de mejoras — AsistíAPP

**Fecha del relevamiento:** 2026-11-10 · **Rama:** `feature-mercadopago`

Este documento junta todo lo que quedó pendiente después de cerrar las fases de `docs/tecnica/backend_implementation_plan.md` y `docs/tecnica/frontend_implementation_plan.md`: problemas de seguridad, bugs, deuda técnica y mejoras de UX detectados revisando el código y probando la app en vivo.

**Estado (17/11/2026): todos los ítems críticos están hechos.** Quedan solo los que dependen de decidir el despliegue (en pausa) y el 7.4, descartado. Cada ítem se hizo recién cuando se decidió hacerlo, y al terminarlo se marcó y se anotó en `docs/proyecto/DECISIONES.md`.

**Estados:** ✅ hecho y verificado · ⏸ en pausa (depende del despliegue) · 🔎 investigado, se cierra en producción · ❎ descartado.

## Cómo leerlo

- Las etapas están en el orden sugerido. Dentro de cada una, los ítems son independientes entre sí salvo que se indique lo contrario.
- **Tamaño:** S = menos de una hora · M = medio día · L = un día o más.
- **(a confirmar)** = es una sospecha razonable, no algo verificado. El primer paso de ese ítem es comprobarlo.
- **Ya documentado en** = el tema ya figura en otro archivo; acá solo se lo ordena junto al resto.

## Resumen

| Etapa | Qué resuelve | Ítems | Cuándo |
|---|---|---|---|
| 0 | Cerrar lo que está abierto | 2 | Ya (completa; 0.3 y 0.4 salieron del plan) |
| 1 | Lo mínimo para mostrar la app | 4 | Antes de la demo |
| 2 | Seguridad | 5 | Antes de cualquier despliegue |
| 3 | Bugs y comportamiento incorrecto | 9 | Cuando haya tiempo |
| 4 | Base de datos e infraestructura | 8 | Antes de cualquier despliegue |
| 5 | Calidad de código y tests | 6 | Continuo |
| 6 | UX y funcionalidad faltante | 4 | A definir |
| 7 | Documentación y repo | 4 | Continuo |
| 8 | Modelo de cobro del Organizador y cierre legal/fiscal | 8 | Desde el 18/11 (decidido el 17/11) |

---

## Estado actual — por dónde vamos (actualizado el 2026-11-17)

> Para retomar desde otra máquina leer también `docs/proyecto/CONTINUAR.md`: tiene el detalle de lo que falta, las trampas conocidas y cómo montar el entorno.

**Hecho (todo commiteado y pusheado a `feature-mercadopago`):**
- Etapas **0, 1 y 3 completas** (0.3 y 0.4 salieron del plan: los resuelve Felipe por fuera); Etapa **2** completa salvo 2.4 (se cierra en producción); de la Etapa 4: **4.3, 4.4, 4.5 y 4.6**.
- **Etapa 5:** 5.1 (guardia de desfasajes de `types.ts` contra el OpenAPI del backend), 5.4 (tests de `ListingPage` y `PosPage`) y 5.6, cerrados el 16/11; **5.3** (tests de fecha y hora contra los selectores reales) y **5.5** (botón de tema en el header de cada pantalla) y **5.2** (suite e2e con Playwright) cerrados el 17/11. **Etapa 6:** 6.1, 6.3 y 6.4 (16/11) y 6.2 (17/11). **Etapa 7:** 7.1, 7.2 y 7.3. Cerrados el 16/11.
- Fuera del plan, el 12/11: SMTP configurable por variables de entorno (Gmail sin editar `application.yml`), lectura de un `backend/.env` opcional, el QR del mail de confirmación como imagen inline `cid:` y la versión en texto plano del mismo mail.
- Suites: backend **346 tests, 0 fallos**; frontend **24 archivos, 219 tests, 0 fallos**; typecheck, lint y build limpios.

**Decisiones de Felipe del 16/11** (en `docs/proyecto/DECISIONES.md`): **por ahora no se despliega nada, se sigue en local** (4.8); **el POS sí manda mail** al comprador (6.4).

**Falta, en el orden que recomiendo** (detalle de cada uno en `docs/proyecto/CONTINUAR.md`, sección 4):
0. **Nuevo (17/11): Etapa 8 — modelo de cobro del Organizador.** Hoy el dinero de las entradas no tiene camino hacia el Organizador (un solo token de MercadoPago de la plataforma). Está decidido el modelo y falta construirlo; ver la Etapa 8 y `docs/proyecto/MODELO_DE_COBRO.md`. Lo legal y fiscal está en `docs/proyecto/LEGAL_Y_FISCAL.md`. **Se retoma el 18/11 por el ítem 8.2 (entradas manuales), que no depende de MercadoPago.**
1. **En pausa mientras no se despliegue:** 4.1 Flyway (L), 4.2 claves foráneas (L), 4.7 límite de peticiones en memoria (M) y 4.8. Si Felipe pide una muestra en la web, se reabre 4.8 (hay una recomendación de dónde y cómo en `docs/proyecto/CONTINUAR.md`, sección 4.2).
2. **Antes de cualquier producción:** 2.4 (`MP_VALIDAR_FIRMA=true` comprobado con un pago real) y el checklist de la Fase 21 de `docs/tecnica/backend_implementation_plan.md`.

**Preguntas abiertas / pendientes de Felipe (no asumir):**
- La cuenta demo `staffvendedor@demo.com` no acepta `Demo1234!` (devuelve 401). Un 401 en el login es "credenciales inválidas" (email inexistente o contraseña distinta; el backend no distingue). En la base de la PC del 16/11 esa cuenta ni existe; en la de la PC anterior lo más probable es que se haya reseteado (el reseteo genera una contraseña al azar), pero no se pudo comprobar. Falta decidir: resetearla en esa base o corregir `docs/tecnica/GUIA_DEMO.md`.
- **Rotar las credenciales de sandbox** que pasaron por el chat el 16/11 (MercadoPago, Cloudinary, ngrok, contraseña del comprador de prueba) y borrar el `cargar-variables.ps1` con valores en texto plano.
- El mail de confirmación cayó en spam de Gmail con la cuenta de prueba: se resuelve con dominio propio y un proveedor transaccional (solo importa si se despliega; ver `docs/proyecto/DECISIONES.md` 2026-11-12).

**Cómo está la máquina de desarrollo (PC del 16/11):**
- Windows 10, JDK 17, Maven 3.8.8, Node 24, PostgreSQL 18; sin Python ni Docker. Backend en `localhost:8080` (PowerShell: `cd backend; mvn.cmd spring-boot:run`, con las variables `MP_*` y `CLOUDINARY_*` de usuario cargadas) y Vite en `localhost:5173`. MailHog standalone en `tools/MailHog.exe` (ignorado por Git).
- **Hay un `backend/.env` con SMTP de Gmail** (ignorado por Git; nunca pegarlo en el chat ni commitearlo): mientras esté, **todo mail que mande la app sale de verdad**, incluidas las ventas del POS. Para probar contra MailHog hay que pisar `SMTP_*` con variables de entorno del proceso, sin editar el `.env` (ver `docs/proyecto/CONTINUAR.md`, trampas).
- Los tests del frontend se corren desde PowerShell (`npx vitest run`), no desde Git Bash. Si un build raro falla con "cannot access…" usar `mvn clean test` (con el backend detenido).
- Datos de prueba en la base local: Organizador demo `organizador.demo@asistiapp.test` con el evento 39 y un Staff QR. No viajan con el repo.

**Reglas de trabajo vigentes:** una fase por vez y parar a preguntar antes de seguir; confirmar antes de cada commit/push; commits a nombre de Felipe (la identidad del repo local), sin ningún rastro de Claude; no stagear archivos sueltos (`arreglos.txt`, `entregable-sprint4/`, el `.xlsx` de la raíz, logs); credenciales solo en variables de entorno o en `.env`; verificar en vivo y limpiar los datos de prueba; documentar en `docs/proyecto/DECISIONES.md` y en este plan en el mismo cambio.
---

## Etapa 0 — Cerrar lo que está abierto

| # | Qué | Tamaño | Estado |
|---|---|---|---|
| 0.1 | Commitear y pushear el pago en pestaña nueva (Fase 13 del plan de frontend). Está terminado y probado, sin commitear. | S | ✅ commit `4f341e9`, pusheado |
| 0.2 | Hacer un pago real con el usuario comprador de prueba de MercadoPago. El paso a "aprobado" se verificó simulando la respuesta del backend, no con un pago de verdad. | S | ✅ 2026-11-12: pago real de $1.500 con el comprador de prueba; la pestaña original pasó sola a "¡Pago aprobado!" con la entrada |

> Los ítems 0.3 (qué hacer con el `.xlsx` de la raíz) y 0.4 (abrir el PR `feature-mercadopago` → `master`) **se sacaron de este plan el 2026-11-16**: los resuelve Felipe por fuera. La numeración queda con ese salto a propósito.

## Etapa 1 — Lo mínimo para mostrar la app

| # | Qué | Tamaño | Estado |
|---|---|---|---|
| 1.1 | **Evento de demo con una tanda abierta.** El único evento publicado ("cervecero") tiene las dos tandas con la venta cerrada (29/10 y 6/11): hoy no se puede mostrar una compra. | S | ✅ evento "Noche de Demo AsistíAPP" (id 54) publicado, 5 cupos a $1.500, venta abierta hasta el 19/12 |
| 1.2 | **La pantalla del evento deja avanzar con una tanda cerrada.** La tanda viene seleccionada, "Comprar entradas" está activo y el error ("La venta de la tanda ya cerró") aparece recién al confirmar en el checkout. Mostrar las tandas cerradas como "Venta cerrada", sin poder elegirlas, y desactivar el botón si no queda ninguna abierta. Archivo: `frontend/src/pages/buyer/DetailPage.tsx`. | M | ✅ `DetailPage` + `lib/tanda.ts` (misma regla que el backend), con tests |
| 1.3 | **Script SQL para las bases de los compañeros.** Sin `ALTER TABLE log_auditoria ALTER COLUMN id_entidad_afectada DROP NOT NULL;` el anuncio global del Admin devuelve 500 en cualquier base creada antes del 22/10. Dejarlo como archivo en `backend/db/migraciones/` (donde ya está el de MercadoPago) y mencionarlo en el README. Ya documentado en `docs/proyecto/DECISIONES.md` (deuda, 2026-10-22), pero solo como nota. | S | ✅ `backend/db/migraciones/2026-10-22-log-auditoria-entidad-nullable.sql` + sección en `backend/README.md` |
| 1.4 | **Unificar las credenciales del Admin.** El README documenta `admin@asistiapp.com`, pero en la base de desarrollo actual el que funciona es otro. Revisar el seeder y dejar una sola. | S | ✅ No era una inconsistencia del código: ver nota abajo |

**Nota 1.4:** el seeder (hoy `AdminInicialSeeder`, antes `DevDataSeeder`) crea `admin@asistiapp.com` **solo si no existe ningún Administrador**. La base de desarrollo de Felipe ya tenía uno creado a mano (`admin@demo.com`), así que el seeder no actuó; ambas credenciales son correctas, cada una en su base. `docs/tecnica/GUIA_DEMO.md` (que documenta `admin@demo.com`) está en `.gitignore`: es solo local. Se aclaró en `backend/README.md`. Lo que sí queda abierto es que la contraseña del seeder esté en el código (ítem 2.5).

**Nota 1.1:** el evento de demo tiene 5 cupos porque cada entrada consume un crédito y el Organizador demo tenía 6 disponibles. Si hace falta más cupo, hay que acreditar créditos a ese Organizador. No tiene imagen de portada: se ve el ícono de imagen por defecto.

## Etapa 2 — Seguridad

| # | Qué | Tamaño | Estado |
|---|---|---|---|
| 2.1 | **La auditoría guarda contraseñas en texto plano.** `AuditoriaAspect` (línea 71) arma el detalle con `Arrays.toString(joinPoint.getArgs())`, así que el cambio de contraseña hecho por el Admin (`AdminUsuarioService.cambiarPassword`) deja la contraseña nueva escrita en `log_auditoria`. Enmascarar los argumentos sensibles, limpiar las filas existentes y agregar un test que lo cubra. | M | ✅ `@DatoSensible` + enmascarado por nombre en `AuditoriaAspect`, script de limpieza y 5 tests |
| 2.2 | **El límite de peticiones se puede saltear.** `RateLimitFilter` (línea 102) usa el header `X-Forwarded-For` tal como lo manda el cliente; cambiándolo en cada request no hay límite. Leerlo solo si hay un proxy de confianza configurado. | S | ✅ IP de la conexión por defecto + `app.rate-limit.proxies-confiables`, 6 tests |
| 2.3 | **`JWT_SECRET` con valor por defecto.** `application.yml` trae una clave de desarrollo; si en producción no se setea la variable, los tokens se firman con una clave pública en el repo. Que el backend no arranque con el valor por defecto fuera del perfil de desarrollo. Ya documentado en `docs/tecnica/backend_implementation_plan.md` (checklist de producción, punto 4), pero como paso manual. | S | ✅ `JwtSecretValidator`: con perfil `prod` y el secreto público no arranca; 7 tests |
| 2.4 | **`MP_VALIDAR_FIRMA=true` antes de producción.** Sigue sin explicación por qué la firma de los avisos del sandbox no coincide. Ya documentado en `docs/tecnica/backend_implementation_plan.md` (Fase 21, "Pendiente de la firma"). | M | 🔎 Investigado, sin cerrar: ver `docs/proyecto/DECISIONES.md` (2026-11-12) y "Pendiente de la firma" en el plan de backend. Se cierra en producción |
| 2.5 | **Contraseña del Admin inicial por variable de entorno.** Hoy la del seeder está en el código y en el README. | S | ✅ `AdminInicialSeeder`: `ADMIN_INICIAL_PASSWORD`/`ADMIN_INICIAL_EMAIL`; en `prod` sin variable no se crea ningún Admin; 8 tests |

## Etapa 3 — Bugs y comportamiento incorrecto

| # | Qué | Tamaño | Estado |
|---|---|---|---|
| 3.1 | **El Admin puede borrar un evento con órdenes `Pendiente`.** Solo se bloquea si hay entradas vendidas; las órdenes quedan sin evento. **(a confirmar)** qué pasa si alguien paga una de esas órdenes después del borrado. | M | ✅ |
| 3.2 | **Método HTTP no soportado devuelve 500 en vez de 405.** Falta manejar `HttpRequestMethodNotSupportedException` en el `@ControllerAdvice`. Visto con `DELETE /eventos/{id}` como Organizador y con un `Content-Type` no JSON en el webhook de MercadoPago (debería ser 415); un UTF-8 inválido también da 500 en vez de 400. | S | ✅ |
| 3.3 | **El Organizador no puede borrar ni un borrador propio.** Solo el Admin borra eventos. **(a confirmar)** si es a propósito; si lo es, anotarlo en `docs/proyecto/DECISIONES.md`. | S–M | ✅ |
| 3.4 | **La regla de "evento finalizado" está duplicada.** Vive en el backend (`EventoService.yaFinalizo`) y otra vez en el frontend (`eventoDisponibleParaStaff` en `StaffMgmtPage.tsx`). Dejar una sola en el backend; de paso, que el backend valide el estado del evento al crear staff. | M | ✅ |
| 3.5 | **Fechas sin zona horaria explícita.** El frontend compara con la hora del navegador y el backend con la del servidor. Con el servidor en UTC, un evento "finaliza" tres horas corrido. Fijar `America/Argentina/Buenos_Aires` en el backend. | M | ✅ |
| 3.6 | **La venta manual del vendedor no recibe `cantidad`.** El POS hace una llamada por entrada, así que vender varias no es una sola operación atómica. | M | ✅ |
| 3.7 | **Bloqueo de pegar en "Confirmar email"** (`CheckoutPage.tsx`). Molesta con gestores de contraseñas y autocompletado, y no evita errores de tipeo. Sacarlo. | S | ✅ |
| 3.8 | **Pestaña de pago bloqueada o en blanco.** Si el navegador bloquea la pestaña nueva, el pago cae a la redirección de siempre y el comprador queda varado en MercadoPago: avisarle antes. Y mientras se crea la orden la pestaña queda en blanco: escribirle "Redirigiendo a MercadoPago…". Archivo: `frontend/src/lib/pago.ts`. | S | ✅ |
| 3.9 | **La espera del pago puede chocar con el límite de peticiones.** Cada pestaña consulta 15 veces por minuto y el límite es 30 por IP: dos compradores en el mismo wifi ya lo tocan. Espaciar las consultas con el tiempo o subir el límite de ese endpoint. | S | ✅ |

## Etapa 4 — Base de datos e infraestructura

| # | Qué | Tamaño | Estado |
|---|---|---|---|
| 4.1 | **Migraciones con Flyway** en lugar de `ddl-auto: update`, que no aplica cambios de restricciones. Reemplaza los scripts sueltos de `backend/db/migraciones/` y hace innecesario el ítem 1.3 a futuro. | L | ⏸ en pausa (sin despliegue) |
| 4.2 | **Claves foráneas reales.** Varias relaciones son un `Long` suelto, y al borrar un usuario hay que limpiar tabla por tabla a mano (`notificaciones`, `movimientos_credito`, `transacciones_credito`, `tokens_recuperacion`). Conviene hacerlo después de 4.1. | L | ⏸ en pausa (sin despliegue) |
| 4.3 | **Perfiles `dev` y `prod` separados.** Hoy todo vive en un solo `application.yml` con valores por defecto de desarrollo. | M | ✅ |
| 4.4 | **Apagar `show-sql: true`** fuera de desarrollo. | S | ✅ |
| 4.5 | **Credenciales de Cloudinary.** Sin ellas no anda la subida de imágenes. Ya documentado en `docs/proyecto/DECISIONES.md` (deuda). | S | ✅ |
| 4.6 | **Verificar el mail de reembolso contra MailHog.** Solo tiene tests unitarios. Ya documentado en `docs/tecnica/backend_implementation_plan.md` (21.6). | S | ✅ |
| 4.7 | **Límite de peticiones en memoria.** **(a confirmar)** Se reinicia con el backend y no sirve con más de una instancia. Solo importa si se despliega. | M | ⏸ en pausa (sin despliegue) |
| 4.8 | **(Decidido el 2026-11-16: por ahora no se despliega, ver `docs/proyecto/DECISIONES.md`; 4.1, 4.2 y 4.7 quedan en pausa.)** **Decidir si se despliega.** Con HTTPS real, MercadoPago vuelve solo al sitio y la pestaña nueva se desactiva sola. El resto del checklist ya está en `docs/tecnica/backend_implementation_plan.md` ("Checklist de pase a producción"). | L | ⏸ decidido: no se despliega por ahora |

## Etapa 5 — Calidad de código y tests

| # | Qué | Tamaño | Estado |
|---|---|---|---|
| 5.1 | **Generar `types.ts` desde el OpenAPI del backend** (`/v3/api-docs`). Está escrito a mano y ya se desfasó una vez: `ordenId` de créditos figuraba como `number` y era `string`. | M | ✅ 2026-11-16, **con una adaptación respecto de lo planeado**: `types.ts` NO se reemplaza por tipos generados, porque el backend no declara qué campos de respuesta son obligatorios (todos salen `required: []`) ni cuáles aceptan null, y los tipos generados quedarían con todo opcional, lo que rompería el código de los 46 archivos que lo usan. En su lugar los tipos generados son una **guardia de desfasajes**: `openapi.json` (copia versionada del contrato) + `src/lib/api-schema.d.ts` (generado) + `src/lib/types.contract.ts`, que compara cada DTO de `types.ts` con el generado (mismos campos, también anidados, y mismo tipo base; los enums con exactamente los mismos valores) y hace fallar `tsc -b` en la línea del DTO. Script `npm run types:api`; el generador (`openapi-typescript@7.13.0`) se ejecuta con `npx` y no es dependencia (exige TypeScript 5, el proyecto usa 6). Hallazgos al medirlo contra el backend real: `CompraOnlineRequestDTO` no tenía `cantidad` (desfasaje real, corregido), tres DTOs de entrada no tenían tipo y se mandaban con objetos sueltos (ahora `IniciarCompraCreditoRequestDTO`, `RestablecerPasswordRequestDTO`, `SolicitarRecuperacionRequestDTO`, y los 4 cuerpos usan `satisfies`), y **un error del backend**: springdoc documentaba `horaEvento` como un objeto `{hour, minute, second, nano}` en 4 DTOs (también en `EventoRequestDTO`, o sea que el Swagger UI invitaba a enviar un objeto) cuando viaja como texto `"HH:mm:ss"`; corregido en `OpenApiConfig`. `OpenApiContratoTest` (backend) falla si el contrato cambia y `frontend/openapi.json` no se regeneró, así que la guardia no depende de la memoria de nadie; y `types.contract.test.ts` avisa si un DTO nuevo de `types.ts` queda fuera del contrato. Se comprobó con 5 desfasajes provocados a propósito en el frontend (campo faltante, valor nuevo en un enum, `ordenId` como `number`, cuerpo sin `cantidad`, campo renombrado) y 2 en el backend (copia vieja, arreglo de `LocalTime` borrado): todos detectados. Backend: **338 tests**; frontend: **21 archivos, 200 tests**; build y lint OK |
| 5.2 | **Suite end-to-end fija con Playwright.** Hoy se instala y desinstala en cada verificación con scripts descartables, así que nada queda como regresión. Cubrir compra, venta del vendedor, escaneo y publicación. | L | ✅ 2026-11-17: `frontend/e2e/` (Playwright, `npm run e2e`): publicación con el asistente, compra hasta la pestaña de MercadoPago, venta del vendedor en el POS y escaneo del Staff QR; datos sembrados por la API real; `e2e/limpiar.sql` borra lo que crea |
| 5.3 | **Reescribir los tests de fecha y hora contra `DatePicker`/`TimePicker`.** Siguen pasando gracias a un `<input>` nativo oculto que quedó como puente; después se puede sacar. | M | ✅ 2026-11-17: tests propios de `DatePicker` y `TimePicker`, `src/testing/pickers.ts` (`elegirFecha`/`elegirHora`), `WizardPage` y `EditEventPage` reescritos, input oculto eliminado |
| 5.4 | **Tests para `ListingPage` y `PosPage`.** No tienen ninguno y las dos cambiaron bastante. | M | ✅ 2026-11-16: `ListingPage.test.tsx` (17 tests) y `PosPage.test.tsx` (22 tests). Cubren estados de carga/error/vacío, orden por fecha, el tope de 16 eventos con el botón "Ir a ver todos" y el link fijo a `/eventos` (los dos bugs de la home que ya habían pasado), la línea de soporte, el tope de cantidad del POS (cupo de la tanda, tope por comprador, máximo 20, mail que ya agotó el tope), la validación del formulario, la venta en una sola llamada, el error de venta, "Vendidas hoy" y "Nueva venta", y copiar enlaces. Se comprobó que sirven: se rompió a propósito el código real de 3 formas (tope de 20, tope por comprador, tope de 16) y 4 tests fallaron; se revirtió. Suite del frontend: **20 archivos, 197 tests, 0 fallos**; lint sin mensajes en los tests nuevos |
| 5.5 | **Mover el botón de tema claro/oscuro al header o a la navegación.** Como botón flotante ya causó dos bugs (tapaba botones del escáner; no respondía en el home). | M | ✅ 2026-11-17: el toggle va en el header de cada pantalla (`ThemeToggle` con variantes `normal`/`sobre-imagen`/`esquina`), sin botón global; verificado con Playwright en 18 pantallas × desktop/mobile |
| 5.6 | **Borrar las órdenes `Pendiente` huérfanas** que quedaron de las pruebas del 10/11 si el job de vencimiento no las cerró. | S | ✅ 2026-11-16: en esta base había 5 `Pendiente` (ids 25–29), pero eran del 10/9, del flujo simulado previo a MercadoPago: sin `fecha_vencimiento`, por eso el job nunca las tocó. Sin entradas asociadas; borradas. Limpieza de datos locales, sin cambio de código |

## Etapa 6 — UX y funcionalidad faltante

| # | Qué | Tamaño | Estado |
|---|---|---|---|
| 6.1 | **Auditoría accesible desde mobile** en el panel de Admin. | S | ✅ 2026-11-16: `AdminLayout` la suma como 5ª pestaña de la bottom tab bar (`grid-cols-5`, igual que `OrganizadorLayout`) y unifica la lista de pestañas con la del sidebar. Verificado en vivo con Playwright en mobile (390px) y desktop (1440px), sin errores de consola. Pendiente menor, fuera del ítem: la tabla de la pantalla tiene `min-w-[720px]` y en mobile se desplaza en horizontal |
| 6.2 | **Notificaciones automáticas.** Existen la campanita y el anuncio global, pero no avisos por evento cancelado, staff asignado, créditos acreditados, etc. Primero definir cuáles. | M–L | ✅ 2026-11-17: avisos automáticos al Organizador (campanita) por primera venta de un evento, tanda agotada, reembolso de entradas y créditos acreditados; 8 tests nuevos y verificado en vivo. Staff asignado quedó afuera (ver DECISIONES) |
| 6.3 | **Aclarar que el enlace de la entrada es la entrada.** Quien tenga `/mi-entrada?codigoQr=…` puede entrar. Decirlo en el texto del botón de compartir del POS y de la pantalla de resultado. | S | ✅ 2026-11-16: aviso bajo "Copiar enlace para compartir" en `PagoResultadoPage` (ahí el enlace da acceso a **todas** las entradas de la orden) y una sola vez bajo la lista de entradas generadas en `PosPage`. Los botones no cambiaron de texto. Verificado en vivo en mobile y desktop; para el POS se hizo una venta real con la cuenta demo de Sofia (hash de contraseña cambiado temporalmente y restaurado idéntico), y se borraron las 3 entradas de prueba y se devolvió el cupo (base igual que antes). 14 tests de las pantallas del comprador siguen en verde |
| 6.4 | **Enviar la entrada por mail desde el POS.** Confirmado el 12/11: hoy la venta manual no manda ningún mail. **(a confirmar)** si hace falta; hoy el vendedor solo copia o comparte el enlace. | M | ✅ 2026-11-16 (Felipe: "lo recomendable es que sí"): `VentaController.ventaManual` manda, ya con la venta confirmada, un solo mail con todas las entradas (`EmailService.enviarConfirmacionCompra`, el mismo de la compra online). El envío va protegido: si falla al encolarse se loguea y la venta igual responde 201, porque un error con la venta ya guardada haría que el vendedor reintente y se duplique. Test nuevo `VentaControllerVentaManualTest` (3 tests, escrito antes del cambio y visto fallar). Verificado en vivo contra MailHog con una venta real de 2 entradas desde el POS (un solo mail, al comprador, con los dos QR y el saludo con su nombre) y con MailHog apagado (HTTP 201, el error queda solo en el log); datos de prueba borrados y cupo devuelto. Backend: **337 tests, 0 fallos** |

## Etapa 7 — Documentación y repo

| # | Qué | Tamaño | Estado |
|---|---|---|---|
| 7.1 | **Actualizar `CLAUDE.md`.** Dice que el frontend "todavía no" integra MercadoPago y que `CheckoutPage`/`WalletPage` "están rotos" (ya está hecho), que probar el pago necesita ngrok (ya no, por la reconciliación) y menciona la estética "TicketVibe" celeste/violeta/lima cuando la app usa el azul marino monocromo. | S | ✅ 2026-11-16: cada afirmación se contrastó antes con el código (`MercadoPagoService` solo manda `notification_url` si `BACKEND_PUBLIC_URL` es HTTPS; `docs/tecnica/DESIGN.md` declara reemplazada la paleta TicketVibe). Se corrigieron los 3 puntos del ítem y se actualizó el párrafo de SMTP (variables `SMTP_*`, `backend/.env`, MailHog standalone, y que con un `.env` de Gmail los mails salen de verdad). Se sumó "ni pegadas en el chat" a la regla de credenciales, tomada de `docs/proyecto/CONTINUAR.md` |
| 7.2 | **Sección "cómo probar un pago en local" en el README.** Comprador de prueba, pestaña nueva, sin ngrok. Hoy está solo en `CLAUDE.md`. | S | ✅ 2026-11-16: `backend/README.md`, sección "Pagos con MercadoPago", reordenada en configuración mínima, **"Cómo probar un pago en local (sin túnel)"** paso a paso y "Probar el webhook en sí (opcional, con túnel)". De paso se corrigieron dos afirmaciones viejas del README: que MercadoPago "necesita una URL pública" para pagar y que una tarjeta con titular `APRO` aprueba el pago (como invitado falla con `/fatal/`, ver `docs/proyecto/DECISIONES.md` 2026-10-15). Cada dato se contrastó con el código (`pago.ts`, `PagoResultadoPage`, `MercadoPagoService`, `VencimientoOrdenesJob`, `application.yml`). Es documentación: el flujo ya estaba verificado en vivo (0.2 y la reconciliación sin túnel) |
| 7.3 | **Aclarar en el README que las credenciales son solo de desarrollo.** Va junto con 1.4 y 2.5. | S | ✅ 2026-11-16: aviso al principio de "Levantar en local" en `backend/README.md`: `DB_PASSWORD=1234`, el `JWT_SECRET` de desarrollo y el Admin `admin@asistiapp.com` / `Admin123!` son públicos y solo para desarrollo, y qué hace el perfil `prod` con cada uno. Se contrastó con `ConfiguracionProdValidator`: exige que las variables ⚠️ existan, pero no valida que su valor sea fuerte, y el texto lo dice. Los otros `.md` con credenciales de dev (`docs/tecnica/GUIA_DEMO.md`, `docs/proyecto/CONTINUAR.md`) ya las marcan como públicas de desarrollo |
| 7.4 | **Ramas más chicas de acá en adelante,** una por tema, para que los PR se puedan revisar. | — | ❎ Descartado el 2026-11-17 por Felipe: ya no tiene sentido |

## Etapa 8 — Modelo de cobro del Organizador y cierre legal/fiscal

Decidido el 2026-11-17 (ver `docs/proyecto/DECISIONES.md`). La especificación completa está en [`MODELO_DE_COBRO.md`](MODELO_DE_COBRO.md); acá solo el orden de trabajo. Cada ítem cierra con tests, verificación en vivo y documentación, como el resto del plan.

| # | Qué | Tamaño | Depende de | Estado |
|---|---|---|---|---|
| 8.1 | **Registrar la aplicación como marketplace en Mercado Pago** y crear vendedor y comprador de prueba. Verificar qué API aplica en Argentina (`/checkout/preferences` u `/v1/orders`), cómo llegan las notificaciones de pagos de vendedores vinculados y el vencimiento de los tokens. | S (de Felipe) | — | Pendiente |
| 8.2 | **Entradas manuales del Organizador** (cortesía / pago externo, con motivo opcional): cada una consume 1 crédito y guarda **quién la emitió** (también para las del POS). | M | — | Pendiente — **arranca el 18/11** |
| 8.3 | **Tope de entradas por vendedor** (obligatorio al asignar un Staff Vendedor) y resumen por vendedor (cantidad y total) para el Organizador. | M | 8.2 | Pendiente |
| 8.4 | **Vinculación OAuth de la cuenta del Organizador:** endpoints de inicio y retorno, tokens cifrados en la base, renovación, manejo de acceso revocado, estado visible en el panel. | L | 8.1 | Pendiente |
| 8.5 | **Cobro de entradas con el token del Organizador:** preferencia, consulta del pago, webhook y reconciliación con el token del vendedor de la orden; no se puede publicar sin cuenta vinculada; la compra de créditos sigue con el token de la plataforma. | L | 8.4 | Pendiente |
| 8.6 | **Anular y reembolsar entradas:** buscar una entrada y anularla (deja de valer en el escáner), reembolsar desde el panel con el token del Organizador, reembolso masivo al cancelar un evento con reintento y lista de pendientes, y devolución de créditos de las entradas anuladas o reembolsadas. El arrepentimiento no se reembolsa desde la plataforma (ver 8.8). | L | 8.5 (la parte de anular no depende de MP) | Pendiente |
| 8.8 | **Botón de arrepentimiento que deriva al contacto del Organizador** (WhatsApp o mail): la plataforma solo hace de intermediaria, sin recibir ni aprobar solicitudes. Requiere que el Organizador tenga un contacto cargado (por cuenta o por evento). Decisión del 18/11. | S–M | — | Pendiente |
| 8.7 | **Legal y fiscal:** términos y condiciones, política de privacidad, inscripción de la base en la AAIP, definir el aviso de arrepentimiento y la facturación con abogado y contador. Lista en [`LEGAL_Y_FISCAL.md`](LEGAL_Y_FISCAL.md). | — (de Felipe) | — | Pendiente |

Notas:
- **8.2 y 8.3 se pueden hacer ya;** 8.4 a 8.6 esperan a 8.1.
- El frontend lo rediseña otro integrante: las pantallas nuevas de esta etapa (entradas manuales, tope, vinculación, anulación) conviene avisarle antes para que las incluya en su diseño.
- Riesgo a validar con un abogado: que la plataforma no tenga obligación propia de ofrecer el botón de arrepentimiento (ver `LEGAL_Y_FISCAL.md`, punto 1).

---

## Orden sugerido

1. **Etapa 0 completa**, para no arrastrar trabajo sin commitear.
2. **Etapa 1 completa**, y de la Etapa 2 al menos el ítem 2.1: es lo que puede salir mal en una demo o quedar feo si alguien mira la base.
3. **Etapa 2 y Etapa 4** solo si se decide desplegar (4.8); la mayoría de esos ítems no afectan una demo en local.
4. **Etapas 3, 5, 6 y 7** según el tiempo que quede, empezando por los ítems S.
