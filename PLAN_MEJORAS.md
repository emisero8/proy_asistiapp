# Plan de mejoras — AsistíAPP

**Fecha del relevamiento:** 2026-11-10 · **Rama:** `feature-mercadopago`

Este documento junta todo lo que quedó pendiente después de cerrar las fases de `backend_implementation_plan.md` y `frontend_implementation_plan.md`: problemas de seguridad, bugs, deuda técnica y mejoras de UX detectados revisando el código y probando la app en vivo.

**Nada de lo que está acá está aprobado todavía.** Es una lista para evaluar: cada ítem se hace recién cuando se decide hacerlo, y al terminarlo se marca con ✅ y se anota en `DECISIONES.md` como el resto del trabajo.

## Cómo leerlo

- Las etapas están en el orden sugerido. Dentro de cada una, los ítems son independientes entre sí salvo que se indique lo contrario.
- **Tamaño:** S = menos de una hora · M = medio día · L = un día o más.
- **(a confirmar)** = es una sospecha razonable, no algo verificado. El primer paso de ese ítem es comprobarlo.
- **Ya documentado en** = el tema ya figura en otro archivo; acá solo se lo ordena junto al resto.

## Resumen

| Etapa | Qué resuelve | Ítems | Cuándo |
|---|---|---|---|
| 0 | Cerrar lo que está abierto | 4 | Ya |
| 1 | Lo mínimo para mostrar la app | 4 | Antes de la demo |
| 2 | Seguridad | 5 | Antes de cualquier despliegue |
| 3 | Bugs y comportamiento incorrecto | 9 | Cuando haya tiempo |
| 4 | Base de datos e infraestructura | 8 | Antes de cualquier despliegue |
| 5 | Calidad de código y tests | 6 | Continuo |
| 6 | UX y funcionalidad faltante | 4 | A definir |
| 7 | Documentación y repo | 4 | Continuo |

---

## Etapa 0 — Cerrar lo que está abierto

| # | Qué | Tamaño | Estado |
|---|---|---|---|
| 0.1 | Commitear y pushear el pago en pestaña nueva (Fase 13 del plan de frontend). Está terminado y probado, sin commitear. | S | ✅ commit `4f341e9`, pusheado |
| 0.2 | Hacer un pago real con el usuario comprador de prueba de MercadoPago. El paso a "aprobado" se verificó simulando la respuesta del backend, no con un pago de verdad. | S | ✅ 2026-11-12: pago real de $1.500 con el comprador de prueba; la pestaña original pasó sola a "¡Pago aprobado!" con la entrada |
| 0.3 | Decidir qué hacer con `AsistíAPP - Planificación Scrum (1).xlsx` de la raíz (sin versionar). Ya hay una copia en `docs/`; si es la misma, borrarlo. | S | ⏳ |
| 0.4 | Abrir el PR de `feature-mercadopago` a `master`. La rama ya acumula notificaciones, soporte, POS, calendarios y favicon. | S | ⏳ |

## Etapa 1 — Lo mínimo para mostrar la app

| # | Qué | Tamaño | Estado |
|---|---|---|---|
| 1.1 | **Evento de demo con una tanda abierta.** El único evento publicado ("cervecero") tiene las dos tandas con la venta cerrada (29/10 y 6/11): hoy no se puede mostrar una compra. | S | ✅ evento "Noche de Demo AsistíAPP" (id 54) publicado, 5 cupos a $1.500, venta abierta hasta el 19/12 |
| 1.2 | **La pantalla del evento deja avanzar con una tanda cerrada.** La tanda viene seleccionada, "Comprar entradas" está activo y el error ("La venta de la tanda ya cerró") aparece recién al confirmar en el checkout. Mostrar las tandas cerradas como "Venta cerrada", sin poder elegirlas, y desactivar el botón si no queda ninguna abierta. Archivo: `frontend/src/pages/buyer/DetailPage.tsx`. | M | ✅ `DetailPage` + `lib/tanda.ts` (misma regla que el backend), con tests |
| 1.3 | **Script SQL para las bases de los compañeros.** Sin `ALTER TABLE log_auditoria ALTER COLUMN id_entidad_afectada DROP NOT NULL;` el anuncio global del Admin devuelve 500 en cualquier base creada antes del 22/10. Dejarlo como archivo en `backend/db/migraciones/` (donde ya está el de MercadoPago) y mencionarlo en el README. Ya documentado en `DECISIONES.md` (deuda, 2026-10-22), pero solo como nota. | S | ✅ `backend/db/migraciones/2026-10-22-log-auditoria-entidad-nullable.sql` + sección en `backend/README.md` |
| 1.4 | **Unificar las credenciales del Admin.** El README documenta `admin@asistiapp.com`, pero en la base de desarrollo actual el que funciona es otro. Revisar el seeder y dejar una sola. | S | ✅ No era una inconsistencia del código: ver nota abajo |

**Nota 1.4:** el seeder (hoy `AdminInicialSeeder`, antes `DevDataSeeder`) crea `admin@asistiapp.com` **solo si no existe ningún Administrador**. La base de desarrollo de Felipe ya tenía uno creado a mano (`admin@demo.com`), así que el seeder no actuó; ambas credenciales son correctas, cada una en su base. `GUIA_DEMO.md` (que documenta `admin@demo.com`) está en `.gitignore`: es solo local. Se aclaró en `backend/README.md`. Lo que sí queda abierto es que la contraseña del seeder esté en el código (ítem 2.5).

**Nota 1.1:** el evento de demo tiene 5 cupos porque cada entrada consume un crédito y el Organizador demo tenía 6 disponibles. Si hace falta más cupo, hay que acreditar créditos a ese Organizador. No tiene imagen de portada: se ve el ícono de imagen por defecto.

## Etapa 2 — Seguridad

| # | Qué | Tamaño | Estado |
|---|---|---|---|
| 2.1 | **La auditoría guarda contraseñas en texto plano.** `AuditoriaAspect` (línea 71) arma el detalle con `Arrays.toString(joinPoint.getArgs())`, así que el cambio de contraseña hecho por el Admin (`AdminUsuarioService.cambiarPassword`) deja la contraseña nueva escrita en `log_auditoria`. Enmascarar los argumentos sensibles, limpiar las filas existentes y agregar un test que lo cubra. | M | ✅ `@DatoSensible` + enmascarado por nombre en `AuditoriaAspect`, script de limpieza y 5 tests |
| 2.2 | **El límite de peticiones se puede saltear.** `RateLimitFilter` (línea 102) usa el header `X-Forwarded-For` tal como lo manda el cliente; cambiándolo en cada request no hay límite. Leerlo solo si hay un proxy de confianza configurado. | S | ✅ IP de la conexión por defecto + `app.rate-limit.proxies-confiables`, 6 tests |
| 2.3 | **`JWT_SECRET` con valor por defecto.** `application.yml` trae una clave de desarrollo; si en producción no se setea la variable, los tokens se firman con una clave pública en el repo. Que el backend no arranque con el valor por defecto fuera del perfil de desarrollo. Ya documentado en `backend_implementation_plan.md` (checklist de producción, punto 4), pero como paso manual. | S | ✅ `JwtSecretValidator`: con perfil `prod` y el secreto público no arranca; 7 tests |
| 2.4 | **`MP_VALIDAR_FIRMA=true` antes de producción.** Sigue sin explicación por qué la firma de los avisos del sandbox no coincide. Ya documentado en `backend_implementation_plan.md` (Fase 21, "Pendiente de la firma"). | M | 🔎 Investigado, sin cerrar: ver `DECISIONES.md` (2026-11-12) y "Pendiente de la firma" en el plan de backend. Se cierra en producción |
| 2.5 | **Contraseña del Admin inicial por variable de entorno.** Hoy la del seeder está en el código y en el README. | S | ✅ `AdminInicialSeeder`: `ADMIN_INICIAL_PASSWORD`/`ADMIN_INICIAL_EMAIL`; en `prod` sin variable no se crea ningún Admin; 8 tests |

## Etapa 3 — Bugs y comportamiento incorrecto

| # | Qué | Tamaño | Estado |
|---|---|---|---|
| 3.1 | **El Admin puede borrar un evento con órdenes `Pendiente`.** Solo se bloquea si hay entradas vendidas; las órdenes quedan sin evento. **(a confirmar)** qué pasa si alguien paga una de esas órdenes después del borrado. | M | ✅ |
| 3.2 | **Método HTTP no soportado devuelve 500 en vez de 405.** Falta manejar `HttpRequestMethodNotSupportedException` en el `@ControllerAdvice`. Visto con `DELETE /eventos/{id}` como Organizador y con un `Content-Type` no JSON en el webhook de MercadoPago (debería ser 415); un UTF-8 inválido también da 500 en vez de 400. | S | ✅ |
| 3.3 | **El Organizador no puede borrar ni un borrador propio.** Solo el Admin borra eventos. **(a confirmar)** si es a propósito; si lo es, anotarlo en `DECISIONES.md`. | S–M | ✅ |
| 3.4 | **La regla de "evento finalizado" está duplicada.** Vive en el backend (`EventoService.yaFinalizo`) y otra vez en el frontend (`eventoDisponibleParaStaff` en `StaffMgmtPage.tsx`). Dejar una sola en el backend; de paso, que el backend valide el estado del evento al crear staff. | M | ✅ |
| 3.5 | **Fechas sin zona horaria explícita.** El frontend compara con la hora del navegador y el backend con la del servidor. Con el servidor en UTC, un evento "finaliza" tres horas corrido. Fijar `America/Argentina/Buenos_Aires` en el backend. | M | ✅ |
| 3.6 | **La venta manual del vendedor no recibe `cantidad`.** El POS hace una llamada por entrada, así que vender varias no es una sola operación atómica. | M | ⏳ |
| 3.7 | **Bloqueo de pegar en "Confirmar email"** (`CheckoutPage.tsx`). Molesta con gestores de contraseñas y autocompletado, y no evita errores de tipeo. Sacarlo. | S | ⏳ |
| 3.8 | **Pestaña de pago bloqueada o en blanco.** Si el navegador bloquea la pestaña nueva, el pago cae a la redirección de siempre y el comprador queda varado en MercadoPago: avisarle antes. Y mientras se crea la orden la pestaña queda en blanco: escribirle "Redirigiendo a MercadoPago…". Archivo: `frontend/src/lib/pago.ts`. | S | ⏳ |
| 3.9 | **La espera del pago puede chocar con el límite de peticiones.** Cada pestaña consulta 15 veces por minuto y el límite es 30 por IP: dos compradores en el mismo wifi ya lo tocan. Espaciar las consultas con el tiempo o subir el límite de ese endpoint. | S | ⏳ |

## Etapa 4 — Base de datos e infraestructura

| # | Qué | Tamaño | Estado |
|---|---|---|---|
| 4.1 | **Migraciones con Flyway** en lugar de `ddl-auto: update`, que no aplica cambios de restricciones. Reemplaza los scripts sueltos de `backend/db/migraciones/` y hace innecesario el ítem 1.3 a futuro. | L | ⏳ |
| 4.2 | **Claves foráneas reales.** Varias relaciones son un `Long` suelto, y al borrar un usuario hay que limpiar tabla por tabla a mano (`notificaciones`, `movimientos_credito`, `transacciones_credito`, `tokens_recuperacion`). Conviene hacerlo después de 4.1. | L | ⏳ |
| 4.3 | **Perfiles `dev` y `prod` separados.** Hoy todo vive en un solo `application.yml` con valores por defecto de desarrollo. | M | ⏳ |
| 4.4 | **Apagar `show-sql: true`** fuera de desarrollo. | S | ⏳ |
| 4.5 | **Credenciales de Cloudinary.** Sin ellas no anda la subida de imágenes. Ya documentado en `DECISIONES.md` (deuda). | S | ⏳ |
| 4.6 | **Verificar el mail de reembolso contra MailHog.** Solo tiene tests unitarios. Ya documentado en `backend_implementation_plan.md` (21.6). | S | ⏳ |
| 4.7 | **Límite de peticiones en memoria.** **(a confirmar)** Se reinicia con el backend y no sirve con más de una instancia. Solo importa si se despliega. | M | ⏳ |
| 4.8 | **Decidir si se despliega.** Con HTTPS real, MercadoPago vuelve solo al sitio y la pestaña nueva se desactiva sola. El resto del checklist ya está en `backend_implementation_plan.md` ("Checklist de pase a producción"). | L | ⏳ |

## Etapa 5 — Calidad de código y tests

| # | Qué | Tamaño | Estado |
|---|---|---|---|
| 5.1 | **Generar `types.ts` desde el OpenAPI del backend** (`/v3/api-docs`). Está escrito a mano y ya se desfasó una vez: `ordenId` de créditos figuraba como `number` y era `string`. | M | ⏳ |
| 5.2 | **Suite end-to-end fija con Playwright.** Hoy se instala y desinstala en cada verificación con scripts descartables, así que nada queda como regresión. Cubrir compra, venta del vendedor, escaneo y publicación. | L | ⏳ |
| 5.3 | **Reescribir los tests de fecha y hora contra `DatePicker`/`TimePicker`.** Siguen pasando gracias a un `<input>` nativo oculto que quedó como puente; después se puede sacar. | M | ⏳ |
| 5.4 | **Tests para `ListingPage` y `PosPage`.** No tienen ninguno y las dos cambiaron bastante. | M | ⏳ |
| 5.5 | **Mover el botón de tema claro/oscuro al header o a la navegación.** Como botón flotante ya causó dos bugs (tapaba botones del escáner; no respondía en el home). | M | ⏳ |
| 5.6 | **Borrar las órdenes `Pendiente` huérfanas** que quedaron de las pruebas del 10/11 si el job de vencimiento no las cerró. | S | ⏳ |

## Etapa 6 — UX y funcionalidad faltante

| # | Qué | Tamaño | Estado |
|---|---|---|---|
| 6.1 | **Auditoría accesible desde mobile** en el panel de Admin. | S | ⏳ |
| 6.2 | **Notificaciones automáticas.** Existen la campanita y el anuncio global, pero no avisos por evento cancelado, staff asignado, créditos acreditados, etc. Primero definir cuáles. | M–L | ⏳ |
| 6.3 | **Aclarar que el enlace de la entrada es la entrada.** Quien tenga `/mi-entrada?codigoQr=…` puede entrar. Decirlo en el texto del botón de compartir del POS y de la pantalla de resultado. | S | ⏳ |
| 6.4 | **Enviar la entrada por mail desde el POS.** **(a confirmar)** si hace falta; hoy el vendedor solo copia o comparte el enlace. | M | ⏳ |

## Etapa 7 — Documentación y repo

| # | Qué | Tamaño | Estado |
|---|---|---|---|
| 7.1 | **Actualizar `CLAUDE.md`.** Dice que el frontend "todavía no" integra MercadoPago y que `CheckoutPage`/`WalletPage` "están rotos" (ya está hecho), que probar el pago necesita ngrok (ya no, por la reconciliación) y menciona la estética "TicketVibe" celeste/violeta/lima cuando la app usa el azul marino monocromo. | S | ⏳ |
| 7.2 | **Sección "cómo probar un pago en local" en el README.** Comprador de prueba, pestaña nueva, sin ngrok. Hoy está solo en `CLAUDE.md`. | S | ⏳ |
| 7.3 | **Aclarar en el README que las credenciales son solo de desarrollo.** Va junto con 1.4 y 2.5. | S | ⏳ |
| 7.4 | **Ramas más chicas de acá en adelante,** una por tema, para que los PR se puedan revisar. | — | ⏳ |

---

## Orden sugerido

1. **Etapa 0 completa**, para no arrastrar trabajo sin commitear.
2. **Etapa 1 completa**, y de la Etapa 2 al menos el ítem 2.1: es lo que puede salir mal en una demo o quedar feo si alguien mira la base.
3. **Etapa 2 y Etapa 4** solo si se decide desplegar (4.8); la mayoría de esos ítems no afectan una demo en local.
4. **Etapas 3, 5, 6 y 7** según el tiempo que quede, empezando por los ítems S.
