# Cobro con Mercado Pago — cómo funciona y cómo probarlo

> Guía única para quien trabaje en el cobro (personas y agentes de código). Cubre la **Etapa 8** de `docs/proyecto/PLAN_MEJORAS.md`: cada Organizador vincula su cuenta de Mercado Pago y el dinero de las entradas va directo a ella; la plataforma cobra solo créditos. La especificación del modelo está en [`../proyecto/MODELO_DE_COBRO.md`](../proyecto/MODELO_DE_COBRO.md); las decisiones, en [`../proyecto/DECISIONES.md`](../proyecto/DECISIONES.md).
>
> Estado al 2026-11-17: el cobro y el reembolso **están probados de punta a punta con dinero real** (un pago de $10, su reembolso individual y un reembolso masivo). **No se pueden probar con usuarios de prueba del sandbox** con la aplicación OAuth (ver sección 7). Para desarrollar sin dinero real hay un modo que cobra con la cuenta de la plataforma (sección 4).

## 1. El modelo en una página

- **Dos tipos de cuenta de Mercado Pago intervienen:**
  1. **La cuenta de la plataforma** (credenciales `MP_ACCESS_TOKEN`). Cobra solo la **compra de créditos** del Organizador.
  2. **La cuenta de cada Organizador**, vinculada por **OAuth** (aplicación `MP_OAUTH_CLIENT_ID`). Cobra las **entradas**. El dinero nunca pasa por la plataforma.
- **Son dos aplicaciones distintas en el panel de Mercado Pago** (distinto `client_id`): la de las credenciales de prueba de la plataforma y la de OAuth/marketplace. Esa diferencia es la raíz de lo que se ve en la sección 7.
- Un Organizador **sin cuenta vinculada** (o con el acceso revocado) **no puede publicar** (409 que lo manda a Mi perfil), y sus eventos ya publicados **no cobran**. Se apaga solo en local con `MP_EXIGIR_CUENTA_VINCULADA=false` (sección 4).
- **Reembolsos, anulaciones y cancelaciones** son del Organizador: se hacen desde su panel con su token (sale de su saldo de Mercado Pago). La plataforma solo da la herramienta.
- **No hay comisión** de la plataforma. Mercado Pago cobra la suya al vendedor (en la prueba real: $0,42 sobre $10).
- **Quién paga la comisión de Mercado Pago** lo elige el Organizador en Mi perfil (por defecto, él). Si la traslada, cada entrada lleva un *cargo por procesamiento de pago* calculado con su plazo de liberación y zona (`CargoServicioMp`): va como segundo ítem de la preferencia, queda fijo en la orden (`cargoServicioUnitario`) y se devuelve junto con el precio al reembolsar.

## 2. Mapa del código

Backend (`backend/src/main/java/com/asistiapp/backend/`):

| Qué | Dónde |
|---|---|
| Llamadas a Mercado Pago (preferencia, consulta de pago, búsqueda, reembolso). Cada una acepta un `accessToken`; sin él usa el de la plataforma | `services/MercadoPagoService` |
| Elige qué token usa cada operación (`tokenParaCobrar`, `tokenParaOrden`, `tokenParaVendedor`, `tokenParaReembolsar`) | `services/CuentaCobroService` |
| Vinculación OAuth (URL con PKCE, callback, tokens cifrados AES-256-GCM, renovación, revocación) | `services/VinculacionMercadoPagoService`, `controllers/…`, `models/entities/CuentaMercadoPago` |
| Compra online de entradas y confirmación del pago | `services/VentaService`, `services/PagoWebhookService` |
| Webhook (`POST /payments/mercadopago/webhook`) | `controllers/MercadoPagoWebhookController` |
| Anular entrada (estado `Anulada`, devuelve el crédito una vez) | `services/AnulacionEntradaService` |
| Reembolso individual y masivo | `services/ReembolsoEntradaService` (orquesta, sin transacción) + `AnulacionEntradaService` (pasos con transacción), `controllers/ReembolsoEntradaController` |
| Cifrado de tokens | `services/TokenCifradoService` |

Frontend (`frontend/src/`): `pages/organizador/CuentaMercadoPagoCard.tsx` (Mi perfil), `EntradaAcciones.tsx` (anular/reembolsar por fila), `ReembolsosPanel.tsx` (reembolso masivo), `pages/buyer/CheckoutPage.tsx` y `lib/pago.ts` (abre el checkout y espera el resultado), `pages/buyer/PagoResultadoPage.tsx`.

## 3. Los flujos

**Vincular (8.4).** Mi perfil → "Vincular" → `POST /organizador/mercadopago/vincular` devuelve la URL de autorización (con `state` y PKCE) → Mercado Pago → vuelve a `GET /mercadopago/oauth/callback` (público: lo abre el navegador sin JWT) → se cambia el código por tokens, que se guardan **cifrados** → redirige a Mi perfil con `?mp=ok|cancelado|error`. Un job cada 6 h renueva los tokens que vencen en menos de 30 días; si Mercado Pago rechaza la renovación (`invalid_grant`) la cuenta queda **Revocada** y se avisa al Organizador.

**Comprar una entrada (8.5).** `POST /tickets/comprar-online` (exige `aceptaTerminos: true`) valida topes y cupo, crea **una orden** `Pendiente` y una preferencia **con el token del Organizador del evento**. El comprador paga en Mercado Pago. Mercado Pago avisa al webhook con `?ref=<orden>` y `user_id` del vendedor; con eso se elige el token, se **consulta el pago a la API** (el contenido del aviso no decide nada) y se confirma la orden por su `external_reference`. Si el webhook no llega, la pantalla de resultado y un job **reconcilian** buscando el pago por `external_reference`. Es idempotente: el segundo aviso responde `YA_PROCESADA`.

**Anular y reembolsar (8.6).** `POST /tickets/{id}/anular` deja la entrada sin validez en el escáner y **devuelve el crédito al Organizador una sola vez**; **el cupo de la tanda no se libera**. Con `reembolsar:true` (compras online) también devuelve el dinero: reembolso **parcial por entrada** (precio de la tanda). Un "turno" atómico (`reembolsoEnCurso`) evita devolver dos veces; las llamadas a Mercado Pago van **fuera de transacción**. `POST /tickets/evento/{id}/reembolsos` reembolsa todo en un evento **Cancelado**; lo que falla (p. ej. saldo insuficiente) queda pendiente y se reintenta con la misma llamada. Las entradas manuales o emitidas por el Organizador no tienen pago: 409.

**Créditos.** La compra de créditos usa la cuenta de la plataforma, no la del Organizador.

## 4. Modos de entorno

| Modo | Cómo se activa | Qué cobra y con qué | Para qué sirve |
|---|---|---|---|
| **Desarrollo, sin cuenta real** | `MP_EXIGIR_CUENTA_VINCULADA=false` y `MP_ACCESS_TOKEN` de **prueba** | Un Organizador **sin** cuenta vinculada publica igual y su evento se cobra con la cuenta de la plataforma, en sandbox. **Si ya vinculó una, se usa la suya** (la exigencia apagada solo permite no tenerla) | Desarrollar y probar compra, webhook, escáner, anulación **sin** reembolso real. Es lo que usa la suite e2e |
| **Cuenta real vinculada** | `MP_EXIGIR_CUENTA_VINCULADA=true` (el valor por defecto) y las `MP_OAUTH_*` de producción | Las entradas se cobran con el token OAuth del Organizador, con dinero real | Probar el cobro y el reembolso reales. **Es el único modo que se probó de punta a punta con OAuth** |
| **Producción** | `SPRING_PROFILES_ACTIVE=prod`, todas las variables ⚠️ | Igual que "cuenta real" | Ver sección 9 |

En el modo de desarrollo, **el reembolso a través de Mercado Pago no es representativo**: para un Organizador sin cuenta vinculada se hace con el token de la plataforma. **Para probar el modo de desarrollo con un Organizador que ya vinculó su cuenta real, desvinculala antes** (Mi perfil), o los pagos de entradas irán por su cuenta. Los flujos de anulación y de reembolso se verifican con tests automáticos y, para el dinero real, con el modo de cuenta real.

## 5. Preparar el entorno (cada desarrollador)

1. **Base y arranque:** ver `backend/README.md` ("Levantar en local"). Con una base vacía no hace falta aplicar migraciones; con una base existente, aplicalas todas (sección "Migraciones" de `backend/db/migraciones/README.md`; hay un script).
2. **Variables:** copiar `backend/.env.example` a `backend/.env` y completarlo. El `.env` no se commitea. **Nunca** pegar credenciales en el chat, en los `.md` ni en commits. Las credenciales de la aplicación (OAuth, webhook, access token de prueba) **se las pasa por un canal privado quien administre la aplicación en Mercado Pago**; no están en el repo.
3. **Modo de desarrollo (lo recomendado si no vas a tocar Mercado Pago):** en el `.env`, `MP_EXIGIR_CUENTA_VINCULADA=false` y `MP_ACCESS_TOKEN` con el token de **prueba**. Alcanza para pagar en sandbox (sección 6, caso A) sin túnel.
4. **Túnel (solo para probar el webhook o la vinculación OAuth):**
   - El plan gratuito de ngrok da **un** dominio estático y **un** túnel por cuenta. `ngrok http --url=<tu-dominio>.ngrok-free.dev 8080`. **Cada desarrollador usa su propia cuenta y su propio dominio.**
   - `BACKEND_PUBLIC_URL=https://<tu-dominio>.ngrok-free.dev`.
   - Para la **vinculación OAuth**, `MP_OAUTH_REDIRECT_URI=https://<tu-dominio>.ngrok-free.dev/mercadopago/oauth/callback` y **esa misma URL tiene que estar cargada en la aplicación OAuth** (panel de Mercado Pago → la aplicación → Redirect URLs). Hay que verificar en el panel si la aplicación admite varias URLs; si solo admite una, **solo un desarrollador a la vez puede probar la vinculación**.
5. **Reiniciar el backend desde PowerShell** si cambiaste variables de entorno de Windows: una Bash que ya estaba abierta no las ve y el backend arranca "sin configurar".
6. **Probar que anda:** `cd backend && mvn clean test` (534 tests) y `cd frontend && npx tsc -b && npx vitest run` (desde PowerShell). Los tests **no** necesitan Mercado Pago ni base real.

## 6. Cómo probar el cobro

**A. Sandbox, modo de desarrollo (sin dinero real).**
1. `MP_EXIGIR_CUENTA_VINCULADA=false`, token de prueba, backend reiniciado.
2. Comprá una entrada en el sitio. El checkout se abre en una pestaña nueva (el sitio corre en `http`).
3. En Mercado Pago, **en una ventana de incógnito**, tocá **"Ingresar con mi cuenta"**, entrá con el **usuario comprador de prueba** (panel de la aplicación → *Cuentas de prueba*) y pagá con **dinero disponible**. El usuario de prueba **no es un email**: el email es `test_user_<números>@testuser.com` (con los mismos números del nombre de usuario).
4. Si el navegador abre una pantalla de "Oh, no, algo anduvo mal", usá **dinero disponible** (no tarjeta) y otro navegador sin sesión de Mercado Pago.

**B. Dinero real, con cuenta vinculada (probó 8.5 y 8.6).**
1. En un navegador con tu sesión real: con el Organizador, Mi perfil → **Vincular** (usá el navegador donde tenés tu cuenta real; Mercado Pago autoriza con la sesión abierta y no deja elegir otra).
2. Publicá un evento con una tanda de **$10 o menos**.
3. **Compra con una cuenta de Mercado Pago distinta del vendedor** (Mercado Pago no deja pagarse a uno mismo), en ventana de incógnito, con dinero disponible.
4. Verificá: aviso del webhook en `http://127.0.0.1:4040` (panel de ngrok), orden confirmada en el log del backend, entrada **Pagada** en Detalle del evento, mail con el QR.
5. **Reembolso:** Detalle del evento → **Anular** → tildar "Devolverle el dinero" → debe quedar "Anulada · reembolsada", el crédito vuelve al saldo y llega un mail. Confirmá la devolución en la actividad de tu cuenta de Mercado Pago (el log del backend no imprime la respuesta de Mercado Pago).
6. **Reembolso masivo:** otra compra, cancelar el evento, en su Detalle → "Reembolsar todas". *(Probado con dinero real el 17/11: pago de $10 reembolsado, entrada reembolsada, mail al comprador; al cancelar el evento también volvieron los créditos de las entradas sin vender.)*

Costo de la prueba real del 17/11: comisión de Mercado Pago de $0,42 sobre $10. Mercado Pago puede no devolverla al reembolsar.

**Lo que se verifica sin Mercado Pago:** los 534 tests del backend y 304 del frontend cubren la lógica (reserva del turno de reembolso, crédito una sola vez, fallas parciales, tokens por operación). Un script de verificación contra la API real de la 8.6 dio 15/15.

## 7. Por qué el sandbox no sirve para el cobro con OAuth (investigación, 2026-11-17)

**Lo que se probó.** Con el vendedor vinculado por OAuth siendo una **cuenta de prueba** (`test_user`, país AR) y un **comprador de prueba**, el checkout abre y deja elegir medio de pago, pero **al pagar** (tarjeta o dinero en cuenta) falla con "Oh, no, algo anduvo mal" y **no se crea ningún pago** en Mercado Pago (la búsqueda de pagos del vendedor no muestra intentos). La consola del navegador muestra que se corta en el paso `Challenge … processing` (verificación de seguridad). Se probó con `sandbox_init_point`, con `init_point`, en Chrome (incógnito) y en Edge, con el email del comprador de prueba bien escrito. En cambio, **la compra de créditos (cuenta de la plataforma, credenciales de prueba, otra aplicación) se paga bien con el mismo comprador**.

**Diferencias entre las dos preferencias** (consultadas a la API con el token del vendedor de prueba): `client_id` distinto (aplicación de prueba de la plataforma vs aplicación OAuth), y la de OAuth lleva `marketplace: "MP-MKT-<client_id>"` y `marketplace_fee: 0`. El `payer.email` no es la causa (falló igual con un email real).

**Un hallazgo que sí era un bug nuestro, ya corregido:** con el token de un Organizador, Mercado Pago devuelve `init_point` **y** `sandbox_init_point`, y el código elegía siempre el de sandbox, que no puede cobrar dinero real. Ahora, con la cuenta de un Organizador, se usa **siempre `init_point`**; la cuenta de la plataforma mantiene la regla de preferir el de sandbox si viene. (Commit `e15ebb9`; test en `MercadoPagoServiceTest`.)

**Qué dicen las fuentes** (verificadas hoy; son en parte resúmenes, contrastar con el panel):
- [Cuentas de prueba (docs oficiales)](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-preferences/test-accounts): al crear la aplicación se genera sola una cuenta vendedora de prueba; se pueden crear hasta 15 cuentas; tipos **Vendedor, Comprador e Integrador** (este último "para modelos marketplace"); vendedor y comprador deben ser **del mismo país**; la tabla de cuentas muestra usuario, contraseña y un **código de 6 dígitos** que sirve de verificación por mail.
- [Cómo integrar el checkout en marketplace (docs oficiales)](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/how-tos/integrate-marketplace): exige el access token OAuth de cada vendedor y `marketplace_fee`. **No dice nada sobre probar con usuarios de prueba**, ni sobre los prefijos `TEST-`/`APP_USR-` de los tokens OAuth.
- [PR #13 de un proyecto de terceros](https://github.com/lucasfradus/Nailnet/pull/13) (no es documentación oficial): con una cuenta de prueba vinculada por OAuth el token es `APP_USR-` y el `sandbox_init_point` "solo funciona con credenciales TEST- de la aplicación"; su arreglo fue usar el checkout normal con tokens que no sean `TEST-`. **Ellos tampoco confirmaron un pago de punta a punta**.
- [Discusión #62 del SDK de Mercado Pago](https://github.com/mercadopago/sdk-js/discussions/62): reportes de que los vendedores obtenidos por OAuth fallan en el sandbox. Tiene unos 4 años y no hay solución confirmada.

**Conclusión.** No hay evidencia de que el marketplace por OAuth se pueda probar con usuarios de prueba, y nuestras pruebas dicen que no con esta aplicación. **No está resuelto.** Lo que sí funciona: el modo de desarrollo (sección 4) y la prueba con dinero real (sección 6.B).

**Experimentos que quedan por hacer** (en orden de costo; cualquiera que funcione destraba el sandbox para todos):
1. *Línea base:* con `MP_EXIGIR_CUENTA_VINCULADA=false`, comprar una **entrada** en sandbox (tiene que andar igual que los créditos). Si no anduviera, el problema no es OAuth sino el flujo de entradas.
2. *Panel de la aplicación OAuth:* ver si tiene "credenciales de prueba" propias y si el modelo de integración está marcado como **marketplace**. Probar la vinculación OAuth usando el `client_id`/`client_secret` **de prueba** de esa aplicación (hoy se usan los de producción). Es la hipótesis más prometedora: con credenciales de prueba el token del vendedor de prueba podría ser `TEST-` y el `sandbox_init_point` serviría.
3. *Cuenta Integrador:* crear una cuenta de prueba de tipo **Integrador** y ver si la aplicación OAuth debe crearse con ella.
4. *Soporte de Mercado Pago:* preguntar cómo se prueba un marketplace por OAuth con usuarios de prueba; adjuntar el `preference_id` de un intento fallido y que el checkout se corta en el paso `Challenge`.

## 8. Reglas para agentes y trampas conocidas

- **No leas ni uses tokens de Mercado Pago guardados en la base sin que la persona lo autorice explícitamente** (descifrarlos y llamar a la API con ellos es acceder a sus credenciales). En esta investigación se hizo solo con autorización expresa y de solo lectura.
- Credenciales: variables de entorno o `backend/.env`; nunca en el repo, en los `.md` ni en el chat. Si una pasó por un chat, se rota.
- **Cada llamada a Mercado Pago lleva su token** (`MPRequestOptions`): nunca cambies el token global del SDK. Una compra de entradas usa el del Organizador; la de créditos, el de la plataforma.
- **Las llamadas a Mercado Pago van fuera de transacción** (patrón: orquestador sin `@Transactional` + pasos transaccionales). No las metas dentro de una transacción de base.
- **Con la cuenta de un Organizador usá `init_point`**, no `sandbox_init_point` (ver sección 7).
- Cambiar el estado de una entrada con `@Modifying` (el turno de reembolso) exige `clearAutomatically/flushAutomatically`.
- Postgres **no** actualiza el CHECK de una columna enum con `ddl-auto: update`: un valor nuevo de enum necesita una migración en `backend/db/migraciones/`.
- En local el sitio corre en `http`: Mercado Pago no pone botón "Volver al sitio". La pantalla de espera sigue sola; si se pierde, `http://localhost:5173/pago/resultado?ref=<externalReference>&tipo=entradas`.
- `MP_VALIDAR_FIRMA=false` es el valor seguro para empezar en local, pero **ya se puede dejar en `true`** si cargaste las dos claves de Webhooks (ver sección 9).
- Si algo falla con `ERR_NGROK_3200`, el túnel está caído: volver a levantarlo; el `code` de un callback OAuth es de un solo uso y no se puede reusar.

## 9. Pendiente antes de producción

- **Firma del webhook (resuelto el 20/11).** Mercado Pago tiene **una clave secreta de Webhooks por modo** de la aplicación (panel → Webhooks → pestañas *Modo de prueba* y *Modo productivo*) y firma cada aviso con la del modo en que ocurrió el pago. El backend acepta las dos: `MP_WEBHOOK_SECRET` (prueba) y `MP_WEBHOOK_SECRET_PRODUCCION` (productiva); en producción alcanza con la productiva, que es la obligatoria. Lo que parecía "la firma no coincide" eran los avisos en formato **IPN** (`?id=&topic=`), que Mercado Pago no firma con esa clave: ahora se responden 200 y se ignoran, porque el pago lo confirma el aviso en formato webhook (`?data.id=`), que en el pago real del 17/11 sí validó. Verificado el 20/11 con avisos firmados con cada clave. **Falta antes de producción:** `MP_VALIDAR_FIRMA=true` y comprobar con un pago real de bajo monto, ya deployado, que el aviso llega y valida con la clave productiva; y cargar la URL de producción en la pestaña *Modo productivo* del panel cuando haya dominio.
- `MP_TOKEN_ENCRYPTION_KEY` real y secreta (`openssl rand -base64 32`); la de desarrollo es pública.
- Rotar las credenciales del sandbox que pasaron por chats; dominio propio con SPF/DKIM/DMARC; aplicar las migraciones en las bases que no sean la local.
- Probar con dinero real la **revocación de la cuenta** (hoy cubierta solo por tests) y un reembolso masivo con **varias** compras y una que falle (por ejemplo, por saldo insuficiente).
- Términos y privacidad: **definitivos y revisados por un abogado** (versión `2026-11-20`). Falta solo lo fiscal (AAIP, contador).
