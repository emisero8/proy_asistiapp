# AsistíAPP — Backend: arquitectura, datos y API

Referencia técnica del backend (`backend/`): cómo está armado, qué datos guarda, qué endpoints expone y qué reglas de negocio aplica. Para levantarlo y configurarlo, ver [`backend/README.md`](../../backend/README.md). Con el backend corriendo, la documentación interactiva de la API está en `http://localhost:8080/swagger-ui/index.html`.

## 1. Stack y arquitectura

- **Java 17 + Spring Boot 3.3**, Maven.
- **PostgreSQL** con Spring Data JPA (Hibernate). El esquema lo crea/actualiza Hibernate (`ddl-auto: update`); los cambios que Hibernate no hace solo están en `backend/db/migraciones/`.
- **Spring Security con JWT sin estado** (24 horas de vigencia por defecto).
- **Integraciones:** MercadoPago Checkout Pro (pagos, webhook firmado, reembolsos), SMTP (mails), Cloudinary (imágenes de portada y fotos de perfil).
- **Capas:** controladores → servicios → repositorios. Los controladores reciben y devuelven DTOs (nunca entidades JPA); las reglas de negocio viven en los servicios, con `@Transactional` en todo lo que modifica datos.
- **Errores:** un `@ControllerAdvice` global devuelve siempre el mismo JSON (`status`, `error`, `path`, `timestamp`). Los errores 5xx no exponen detalles internos.
- **Zona horaria:** fija en `America/Argentina/Buenos_Aires` (variable `APP_TIMEZONE`), sin importar la del servidor.
- **Perfiles:** el perfil `prod` exige las variables de entorno críticas y se niega a arrancar si faltan (ver `backend/README.md`).

## 2. Roles y seguridad

Todo endpoint protegido valida el JWT y el rol. Los roles (`RolUsuario`):

| Rol | Qué hace |
|---|---|
| `Administrador` | Gestión global: usuarios, eventos, paquetes de créditos, configuración, anuncios, auditoría. |
| `Organizador` | Crea y publica eventos, administra tandas y staff, compra créditos, ve sus métricas. |
| `Staff_QR` | Valida entradas en la puerta (queda asignado a un evento). |
| `Staff_Vendedor` | Vende entradas en la puerta (POS) para el evento que tiene asignado. |

El **Comprador** no tiene cuenta: compra y consulta su entrada con endpoints públicos.

Cada recurso se valida contra su dueño: un Organizador solo ve y modifica sus eventos, y un Staff solo opera sobre el evento (u organizador) al que pertenece. Los criterios de seguridad completos están en [`SECURITY.md`](SECURITY.md).

**Límite de peticiones** (por IP, en memoria): login 5 por minuto, recuperar contraseña 3 cada 5 minutos, consulta del estado de una orden 120 por minuto y webhook de MercadoPago 300 por minuto.

## 3. Modelo de datos

Todos los `id` son `Long`. Las fechas sin zona son hora de Argentina.

### Usuarios

- **`usuarios`:** `nombre`, `email` (único), `password_hash`, `rol`, `estado` (`Activo`, `Suspendido`, `Inactivo`), `fecha_creacion`, `creado_por`. Es la base de la herencia.
- **`organizadores`** (`id_usuario`): `saldo_creditos`.
- **`staff_qr`** (`id_usuario`): `id_evento`.
- **`staff_vendedores`** (`id_usuario`): `id_organizador`, `id_evento`.
- **`tokens_recuperacion`:** `token`, `id_usuario`, `fecha_expiracion`, `usado` (recuperar contraseña).

### Eventos y entradas

- **`eventos`:** `id_organizador`, `nombre`, `descripcion`, `fecha_evento`, `hora_evento`, `lugar`, `latitud`, `longitud`, `imagen_portada_url`, `estado` (`Borrador`, `Publicado`, `Cancelado`), `url_publica`, `fecha_creacion`, `fecha_publicacion`, `fecha_cancelacion`.
- **`tandas`:** `id_evento`, `nombre`, `precio`, `cupo_maximo`, `cupo_disponible`, `fecha_inicio_vigencia`, `fecha_fin_vigencia`.
- **`entradas`:** `id_tanda`, `codigo_qr` (único), `nombre_comprador`, `email_comprador`, `estado` (`Pagada`, `Usada`), `canal_venta` (`Online`, `Manual`), `id_transaccion_pago`, `id_staff_vendedor`, `id_staff_qr_validador`, `fecha_compra`, `fecha_uso`.

### Pagos y créditos

- **`transacciones_pago`** (órdenes de entradas): `id_tanda`, `cantidad`, `monto_total`, `external_reference` (UUID de la orden), `metodo_pago`, `estado` (`Pendiente`, `Aprobada`, `Rechazada`, `Expirada`, `Reembolsada`), `mercadopago_payment_id`, `nombre_comprador`, `email_comprador`, `fecha_vencimiento`, `fecha_transaccion`.
- **`paquetes_credito`:** `nombre`, `cantidad_creditos`, `precio`, `estado` (`Activo`, `Deshabilitado`).
- **`transacciones_credito`** (órdenes de compra de créditos): `id_organizador`, `id_paquete`, `monto`, `external_reference`, `estado` (mismos valores), `mercadopago_payment_id`, `fecha_vencimiento`, `fecha_transaccion`.
- **`movimientos_credito`** (libro de créditos): `id_organizador`, `tipo_movimiento` (`Bienvenida`, `Recarga`, `Consumo_Publicacion`, `Consumo_Tanda`, `Devolucion_Tanda`), `monto`, `saldo_resultante`, `id_evento`, `id_transaccion_credito`, `fecha_movimiento`.

### Sistema

- **`notificaciones`:** `id_usuario_destino`, `origen` (`Admin`, `Sistema`), `titulo`, `mensaje`, `leida`, `tipo_entidad_relacionada`, `id_entidad_relacionada`, `fecha_creacion`.
- **`configuraciones_sistema`:** `clave`, `valor`, `descripcion`. Claves usadas: `creditos_bienvenida`, `creditos_por_publicacion`, `max_entradas_por_comprador`, `email_soporte`, `whatsapp_soporte`.
- **`log_auditoria`:** `id_emisor`, `emisor_nombre`, `emisor_rol`, `accion`, `entidad_afectada`, `id_entidad_afectada`, `entidad_nombre`, `detalle`, `fecha_hora`. Registra las acciones que cambian datos del Admin, del Organizador y de su Staff (`emisor_rol` es texto, no un CHECK de enum). `emisor_nombre` y `entidad_nombre` son una foto del momento (siguen legibles aunque después se borre el usuario o el evento); `detalle` es texto legible, una línea por dato o cambio (`Precio: $1.000 → $1.500`). Los datos sensibles (contraseñas) nunca se escriben.

> Hoy varias relaciones son un `Long` suelto y no una clave foránea real (por ejemplo `id_organizador` en `eventos`). Está anotado como mejora para cuando se defina el despliegue (ver `docs/proyecto/PLAN_MEJORAS.md`, ítem 4.2).

## 4. Endpoints

Convenciones: **Público** = sin login. Un endpoint sin rol aclarado exige estar autenticado. El detalle de cada cuerpo y respuesta está en Swagger.

### Autenticación (públicos)

| Método y ruta | Qué hace |
|---|---|
| `POST /auth/register` | Registra un Organizador y lo deja con sesión iniciada; recibe los créditos de bienvenida. Exige `aceptaTerminos: true` (400 si falta o es `false`) y guarda cuándo y con qué versión de los términos se registró. |
| `POST /auth/login` | Inicia sesión (cualquier rol) y devuelve el JWT. |
| `POST /auth/recuperar-password` | Envía por mail un enlace para restablecer la contraseña (responde igual exista o no el email). |
| `POST /auth/restablecer-password` | Fija la contraseña nueva con el token recibido por mail. |

### Catálogo y compra (públicos, para el Comprador)

| Método y ruta | Qué hace |
|---|---|
| `GET /public/eventos` | Lista los eventos publicados y vigentes. |
| `GET /public/eventos/{urlPublica}` | Detalle de un evento con sus tandas. |
| `GET /public/estadisticas` | Cifras generales para la portada. |
| `GET /public/paquetes-credito` | Paquetes de créditos activos (se muestran en la portada). |
| `GET /public/soporte` | Contacto de soporte configurado por el Admin. |
| `POST /tickets/comprar-online` | Crea la orden y la preferencia de pago de MercadoPago; devuelve `urlPago` y `ordenId`. Exige `aceptaTerminos: true` (400 si falta o es `false`). |
| `GET /tickets/orden/{externalReference}` | Estado de una orden de entradas (y las entradas, si ya se pagó). |
| `GET /tickets/by-codigo` | Datos de una entrada a partir de su código. |
| `GET /tickets/{id}/qr-image` | Imagen PNG del QR de una entrada. |
| `POST /organizador/mercadopago/vincular` | `Organizador`. Devuelve `{ urlAutorizacion }`: la URL de Mercado Pago a la que el frontend redirige para que el Organizador autorice la aplicación. |
| `GET /mercadopago/oauth/callback` | Público (lo abre el navegador al volver de Mercado Pago). Cambia el código por tokens y redirige a `/organizador/perfil?mp=ok`, `cancelado` o `error`. |
| `GET /organizador/mercadopago/estado`, `DELETE /organizador/mercadopago` | `Organizador`. Estado de su cuenta (`vinculada`, `estado`, `mpUserId`, nunca tokens) y desvinculación. |
| `POST /payments/mercadopago/webhook` | Aviso de pago de MercadoPago (autenticado por la firma, no por JWT). Parámetro opcional `ref` (la referencia de la orden, que va en la URL de notificación): con él y el `user_id` del aviso se elige la cuenta de Mercado Pago con la que se consulta el pago. |

### Organizador (`Organizador`)

| Método y ruta | Qué hace |
|---|---|
| `GET /eventos`, `GET /eventos/{id}` | Sus eventos. |
| `POST /eventos`, `PUT /eventos/{id}` | Crea/edita un evento (queda en borrador). |
| `POST /eventos/imagenes` | Sube la portada a Cloudinary. |
| `PATCH /eventos/{id}/publicar` | Publica el evento (consume créditos). 409 si el Organizador no tiene la cuenta de Mercado Pago vinculada (8.5) ni un contacto de arrepentimiento cargado (8.8). |
| `PATCH /eventos/{id}/cancelar` | Cancela el evento y avisa a los compradores. |
| `DELETE /eventos/{id}` | Borra un evento en borrador. |
| `GET /eventos/resumen`, `GET /eventos/{id}/metricas` | Resumen del panel y métricas de un evento. |
| `GET/POST/PUT/DELETE /eventos/{eventoId}/tandas[/{id}]` | Administra las tandas de un evento. |
| `GET /tickets/evento/{eventoId}` | Entradas de un evento, con su tipo y el motivo si las emitió el Organizador. Solo el dueño del evento (otro Organizador recibe 403). |
| `POST /tickets/{id}/anular` | Anula una entrada propia (`{motivo?, reembolsar}`): deja de valer en el escáner y el crédito vuelve al Organizador (una sola vez); el cupo de la tanda no se libera. Con `reembolsar` y compra online también devuelve el dinero; si eso falla la entrada queda anulada y la respuesta trae `avisoReembolso`. 409 si ya se usó o ya estaba anulada. Solo `Organizador` dueño. |
| `POST /tickets/{id}/reembolsar` | Devuelve el dinero (precio de la tanda) de una entrada anulada —o de cualquier compra online de un evento `Cancelado`— desde la cuenta de Mercado Pago del Organizador. 409 si no se pagó por Mercado Pago, ya se reembolsó o no hay cuenta vinculada; 502 si Mercado Pago lo rechaza (p. ej. saldo insuficiente). |
| `GET /tickets/evento/{eventoId}/reembolsos` | Compras online pendientes de reembolso del evento. |
| `POST /tickets/evento/{eventoId}/reembolsos` | Reembolso masivo; solo evento `Cancelado`. Devuelve `{reembolsadas, montoReembolsado, fallidas[]}`; las fallidas siguen pendientes y se reintentan con la misma llamada. |
| `POST /tickets/emision-organizador` | Emite entradas de una de sus tandas: `Cortesia` (se regala) o `Pago_Externo` (cobrada por fuera de la plataforma), de 1 a 100 en una sola operación. Salen del cupo de la tanda, que ya está paga en créditos: no cuestan nada más. Sin tope por comprador ni ventana de venta; el límite es el cupo. Motivo opcional y mail al destinatario opcional (`enviarMail`). |
| `POST /creditos/comprar` | Inicia la compra de un paquete de créditos (MercadoPago). |
| `GET /creditos/paquetes`, `/resumen`, `/historial`, `/compras`, `/orden/{externalReference}` | Paquetes disponibles, saldo, movimientos, compras y estado de una orden. |
| `POST /organizador/staff/qr`, `POST /organizador/staff/vendedor` | Crea un Staff QR o Vendedor asignado a un evento; la contraseña inicial le llega por mail. **El vendedor exige `topeEntradas` (entero ≥ 1)**: lo máximo que puede vender en total. |
| `GET /organizador/staff` | Lista su staff. Cada vendedor trae `topeEntradas` (null = anterior a la regla, sin tope), `entradasVendidas` y `totalRecaudado`. |
| `PATCH /organizador/staff/{id}/tope` | Cambia el tope de un vendedor propio (`{ "topeEntradas": n }`). 409 si `n` es menor a lo que ya vendió; 403 si no es suyo. |
| `PATCH /organizador/staff/{id}/desactivar`, `/reactivar`, `POST /organizador/staff/{id}/resetear-password` | Gestiona la cuenta de un staff. |
| `GET/PUT /organizador/perfil`, `POST /organizador/perfil/foto`, `PUT /organizador/perfil/password` | Perfil, foto y cambio de contraseña. El perfil trae `maxEntradasPorComprador` (null = rige el de la plataforma) y `maxEntradasPorCompradorPlataforma`. |
| `PUT /organizador/perfil/contacto` | Contacto del botón de arrepentimiento (`{ "contactoWhatsapp", "contactoEmail" }`, al menos uno para poder publicar; el WhatsApp con código de país, se guarda solo con dígitos; ambos vacíos lo borran). 409 si alguno no es válido. El detalle público del evento (`GET /public/eventos/{urlPublica}`) devuelve ambos. |
| `PUT /organizador/perfil/tope-comprador` | Fija cuántas entradas puede tener una misma persona (mismo mail) para sus eventos (`{ "maxEntradasPorComprador": n }`, 1 a 100; `null` vuelve al valor de la plataforma). |

### Staff

| Método y ruta | Rol | Qué hace |
|---|---|---|
| `GET /eventos/vendedor` | `Staff_Vendedor` | El evento publicado que puede vender. |
| `POST /tickets/venta-manual` | `Staff_Vendedor` | Vende 1 a 20 entradas en una sola operación y manda el mail al comprador. Si se pasa del tope de entradas que le fijó el Organizador, rechaza la venta entera (409). |
| `GET /tickets/disponibilidad-comprador` | `Staff_Vendedor` | Cuántas entradas más se le pueden vender a ese comprador. |
| `POST /tickets/validate`, `GET /tickets/validate/{codigo}` | `Staff_QR` | Valida una entrada (la marca como usada) o solo la consulta. |

### Notificaciones (cualquier usuario autenticado)

`GET /notificaciones`, `GET /notificaciones/no-leidas/cantidad`, `PATCH /notificaciones/{id}/leer` y `PATCH /notificaciones/leer-todas`.

### Administrador (`Administrador`)

| Ruta | Qué hace |
|---|---|
| `GET /admin/usuarios`, `PATCH …/{id}/suspender`, `…/activar`, `…/password`, `DELETE …/{id}` | Gestiona usuarios. |
| `GET/PUT/DELETE /admin/eventos[/{id}]`, `PATCH …/{id}/cancelar`, `POST/PUT/DELETE …/{id}/tandas[/{idTanda}]` | Gestiona cualquier evento y sus tandas. |
| `GET/POST/PUT /admin/paquetes-credito`, `PATCH …/{id}/habilitar`, `…/deshabilitar` | Paquetes de créditos. |
| `GET /admin/configuraciones`, `PUT /admin/configuraciones/{clave}` | Parámetros del sistema. |
| `POST /admin/notificaciones` | Anuncio global a todos los usuarios activos. |
| `GET /admin/metricas` | Métricas globales. |
| `GET /admin/auditoria` | Registro de auditoría de todos los roles, paginado (`PaginaAuditoriaResponseDTO`). Parámetros opcionales: `rol` (rol del emisor, se puede repetir), `idEmisor`, `accion`, `entidad` + `idEntidad` (un registro puntual), `desde`/`hasta` (`yyyy-MM-dd`, inclusive), `q` (nombre del emisor o de la entidad, detalle, código de acción o entidad; un número o `#12` busca por id), `pagina` (desde 0) y `tamano` (20 por defecto, máximo 100). |

## 5. Reglas de negocio

### Compra online de entradas (CU-017)

1. `POST /tickets/comprar-online` valida la tanda y la cantidad (1 a 20, y no más que el tope por comprador: el que fijó el Organizador del evento o, si no fijó uno, `max_entradas_por_comprador` del Admin, 6 por defecto), crea **una** orden `Pendiente` por todo el pedido y una preferencia real de MercadoPago. **No descuenta cupo todavía.** La orden vence a los 30 minutos (`MP_MINUTOS_VENCIMIENTO`).
2. La confirmación llega **solo** por el webhook firmado. El contenido del aviso no se confía: el pago se vuelve a pedir a la API de MercadoPago (estado, monto, moneda y referencia) antes de entregar nada. El monto y la moneda deben coincidir exactamente con la orden. Además, cuando el comprador mira el estado de su orden, el backend la reconcilia contra MercadoPago (como mucho una vez cada 10 segundos por orden), así que no depende de que el webhook llegue.
3. Con el pago aprobado: se bloquea la tanda, se descuenta el cupo completo (todo o nada), se genera un código QR único por entrada y se manda **un solo mail** con todos los QR (después de confirmar la transacción).
4. Si un pago aprobado ya no se puede honrar (tanda agotada, evento que ya no está publicado, tope por comprador), se **reembolsa automáticamente** y la orden queda `Reembolsada`. Un segundo pago aprobado para una orden ya resuelta también se reembolsa.
5. Todo es **idempotente**: avisos repetidos o simultáneos del mismo pago no entregan dos veces.
6. Un trabajo programado (cada 10 minutos) marca como `Expirada` las órdenes vencidas que nunca se pagaron, después de reconciliarlas.
7. Un evento ya finalizado o dado de baja no se puede comprar.

### Eventos, tandas y créditos (CU-007, CU-010, CU-014)

- Publicar un evento cuesta créditos (`creditos_por_publicacion`, 1 por defecto); sin saldo suficiente no se publica.
- **Cada entrada consume 1 crédito.** La suma de cupos de las tandas no puede superar los créditos disponibles (saldo menos el costo reservado de publicar). Al cancelar un evento o borrar una tanda se devuelven los créditos de las entradas sin vender.
- Al registrarse, el Organizador recibe `creditos_bienvenida` créditos (5 por defecto).
- La compra de créditos usa el mismo mecanismo de MercadoPago que las entradas (misma preferencia y webhook firmado; las órdenes se distinguen por su `external_reference`). Con el pago verificado se registran la transacción y el movimiento y se actualiza el saldo, exactamente una vez.
- Un evento con compras en curso no se puede borrar.

### Validación de QR (CU-018)

El `Staff_QR` valida un código: debe existir, pertenecer al evento asignado a ese staff y no estar usado. Si es válido, la entrada pasa a `Usada` con su fecha y el staff que la validó; escanearla de nuevo se rechaza.

### Venta manual (CU-019)

**Entradas que emite el Organizador** (`POST /tickets/emision-organizador`): cortesía o pago por fuera de la plataforma. Salen del cupo de una tanda **propia** (otro Organizador recibe 403) de un evento publicado que no terminó, con el mismo bloqueo pesimista que las ventas, y son todo o nada. No cobran créditos aparte porque los créditos se consumen al crear la tanda. No tienen tope por comprador ni dependen de la ventana de venta de la tanda. Quedan con canal `Manual`, `tipoEmision`, `motivoEmision` (nota interna, solo la ve el Organizador) e `idOrganizadorEmisor`. **Una cortesía no suma a los ingresos** (organizador, evento, tanda y total del Admin); el pago externo sí. No genera avisos en la campanita del Organizador.

El `Staff_Vendedor` evita MercadoPago: descuenta el cupo, genera los QR y deja las entradas `Pagada`. Solo puede vender el evento que tiene asignado, respeta el tope por comprador y manda el mail con las entradas (un fallo del mail no deshace la venta).

### Avisos automáticos al Organizador

Aparecen en su campanita: primera venta de un evento, tanda agotada, reembolso de entradas, créditos acreditados, y evento cancelado por el Admin o reembolso de una compra de créditos. Además, el Admin puede mandar anuncios a todos.

### Auditoría

Las acciones que cambian datos quedan en `log_auditoria` con quién las hizo (id, nombre y rol), la acción, la entidad afectada (id y nombre) y qué cambió: las del **Admin** (usuarios, eventos, tandas, paquetes, configuración, anuncios), las del **Organizador** (eventos, tandas, staff, perfil, entradas emitidas/anuladas/reembolsadas, cuenta de Mercado Pago), las del **Staff Vendedor** (venta en puerta) y las del **Staff QR** (ingreso validado o rechazado). Cada servicio anotado con `@Auditable` describe su acción con `AuditoriaContexto` (`objetivo`, `detalle`, `cambio`/`cambios`, y si hace falta `accion` o `emisor`); `AuditoriaAspect` escribe la fila solo si el método terminó bien, una sola vez aunque un método auditado llame a otro. Lo ve solo el Admin. Las contraseñas no se escriben, y una configuración cuya clave parece un secreto registra "modificado" en vez del valor.

## 6. Pautas de desarrollo

- Anotaciones estándar de Spring (`@RestController`, `@Service`, `@Repository`, `@Entity`).
- DTOs siempre en las entradas y salidas de la API.
- Errores de negocio con las excepciones propias (`BusinessRuleException`, `ResourceNotFoundException`, `ForbiddenActionException`), que el manejador global traduce a la respuesta estándar.
- `@Transactional` en todo servicio que modifique datos; bloqueo pesimista de la tanda al descontar cupo (la prueba de concurrencia está en `VentaServiceConcurrencyTest`).
- Cuando cambia un DTO o un endpoint hay que regenerar los tipos del frontend (ver `frontend/README.md`, "Contrato con el backend").
