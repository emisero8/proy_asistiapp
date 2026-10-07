# Plan de Implementación Backend - AsistíAPP

Este plan detalla el enfoque paso a paso para construir el backend del sistema de venta de entradas y control de acceso utilizando **Java, Spring Boot y PostgreSQL**, siguiendo estrictamente las arquitecturas y reglas de negocio documentadas en `API.md` y `CLAUDE.md`.

> **Estado:** Fases 1 a 7 completadas e implementadas en `backend/`. Las Fases 8 en adelante surgen de contrastar lo construido contra la documentación completa del proyecto (`docs/Trabajo_PP2...pdf`, los diagramas DCU, el DER y el diagrama de tablas) — cubren entidades y casos de uso (CU-003, CU-005, CU-006, CU-012 a CU-016, CU-021 a CU-028) que no estaban implementados, y corrigen comportamiento existente que no coincide con el modelo de datos oficial.

## Fase 1: Inicialización del Proyecto y Configuración Base ✅
**Objetivo:** Establecer la fundación del proyecto y las configuraciones transversales.

1.  **Generar el Proyecto Spring Boot:**
    *   Dependencias: Spring Web, Spring Data JPA, PostgreSQL Driver, Spring Security, Spring Boot Validation, Lombok, JWT (jjwt).
2.  **Configuración de Base de Datos:**
    *   Configurar `application.yml` con las credenciales de PostgreSQL y configuraciones de Hibernate (ej. `update` para desarrollo inicial).
3.  **Estructura de Paquetes:**
    *   Crear paquetes: `config`, `controllers`, `services`, `repositories`, `models.entities`, `models.dtos`, `models.enums`, `security`, `exceptions`.
4.  **Manejo Global de Errores (`@ControllerAdvice`):**
    *   Crear `GlobalExceptionHandler` para atrapar excepciones comunes y personalizadas, devolviendo siempre un JSON estructurado (ej. `{"error": "Mensaje", "status": 409}`).

## Fase 2: Modelo de Datos (Entidades y Repositorios) ✅
**Objetivo:** Mapear el modelo relacional a entidades JPA y preparar la capa de acceso a datos.

1.  **Crear Enums:** `ROLES_USER`, `ESTADOS_USER`, `ESTADOS_EVENTO`, `ESTADOS_ENTRADA`, `CANALES_VENTA`, `ESTADOS_PAQUETE`.
2.  **Mapeo de Usuarios (Herencia JPA):**
    *   Entidad base `Usuario` con estrategia de herencia (ej. `InheritanceType.JOINED` o `SINGLE_TABLE`).
    *   Entidades hijas: `Organizador`, `StaffQR`, `StaffVendedor`.
3.  **Mapeo de Negocio:**
    *   Entidades: `Evento`, `Tanda`, `Entrada`, `PaqueteCredito`, `LogAuditoria`.
4.  **Repositorios:**
    *   Crear interfaces que extiendan de `JpaRepository` para cada entidad creada.

## Fase 3: Seguridad y Autenticación (JWT) ✅
**Objetivo:** Proteger la API y gestionar el inicio de sesión.

1.  **Utilidades JWT (`JwtUtils`):**
    *   Lógica para generar, validar y extraer claims (incluyendo el rol) del token.
2.  **Filtro de Seguridad (`JwtAuthenticationFilter`):**
    *   Interceptar peticiones, extraer el token del header `Authorization`, validarlo y establecer el contexto de seguridad en Spring.
3.  **Configuración de Spring Security (`SecurityConfig`):**
    *   Deshabilitar CSRF y sesiones (Stateless).
    *   Configurar `PasswordEncoder` (BCrypt).
    *   Definir reglas de autorización básicas por rutas (ej. `/auth/**` público, `/admin/**` requiere rol Administrador).
4.  **Controlador de Autenticación (`AuthController`):**
    *   Endpoints: `POST /auth/login` y `POST /auth/register` (para Organizadores).

## Fase 4: Gestión de Eventos y Tandas (Organizador) ✅
**Objetivo:** Permitir a los organizadores crear y configurar sus eventos.

1.  **DTOs de Eventos y Tandas:**
    *   Crear request/response DTOs para evitar exponer entidades completas.
2.  **Servicio de Eventos (`EventoService`):**
    *   Lógica para crear eventos, actualizar información básica (en estado `Borrador`).
    *   Lógica de Publicación (`CU-010`): Verificar saldo de créditos del organizador y descontarlo al publicar.
    *   Uso estricto de `@Transactional`.
3.  **Servicio de Tandas (`TandaService`):**
    *   Crear tandas asociadas a un evento, definir precio, fechas de vigencia y, muy importante, el `cupo_maximo` y `cupo_disponible`.
4.  **Controladores (`EventoController`, `TandaController`):**
    *   Exponer endpoints protegidos para que el Organizador gestione su contenido.

## Fase 5: Motor de Ventas e Inventario (Concurrencia Crítica) ✅
**Objetivo:** Manejar la compra de entradas previniendo la sobreventa.

1.  **Gestión de Inventario Seguro:**
    *   Implementar bloqueos en BD (ej. *Pessimistic Locking* vía `@Lock` en el Repositorio de Tanda) o consultas de actualización atómicas para decrementar el `cupo_disponible`.
2.  **Venta Online (Simulación MercadoPago):**
    *   Endpoint para iniciar compra.
    *   Webhook simulado (IPN) que al confirmar pago: genera `codigo_qr` único, cambia estado de `ENTRADA` a `Pagada` y simula envío de correo (SMTP).
3.  **Venta Manual (`CU-019`):**
    *   Endpoint exclusivo para rol `Staff_Vendedor`.
    *   Descuenta cupo, genera QR instantáneamente y marca como `Pagada`.

## Fase 6: Sistema de Control de Acceso (Validación QR) ✅
**Objetivo:** Permitir al staff validar entradas en puerta.

1.  **Servicio de Validación (`StaffQRService`):**
    *   Endpoint `POST /tickets/validate`.
    *   Lógica (`CU-018`): Buscar entrada por QR, verificar si corresponde al evento activo del Staff, comprobar que NO esté en estado `Usada`.
    *   Si es válida: actualizar a `Usada`, registrar fecha/hora y el ID del Staff que validó. Todo bajo `@Transactional`.
2.  **Controlador (`StaffQRController`):**
    *   Exponer el endpoint asegurando que solo usuarios con rol `Staff_QR` puedan acceder.

## Fase 7: Administración Global y Auditoría ✅
**Objetivo:** Herramientas para los administradores del sistema.

1.  **Gestión de Usuarios:**
    *   Endpoints para suspender organizadores, promover usuarios a administradores, etc.
2.  **Gestión de Paquetes de Crédito:**
    *   Endpoints para crear/editar `PaqueteCredito`.
3.  **Auditoría:**
    *   Implementar un interceptor o aspecto (AOP) que registre automáticamente acciones administrativas en `LOG_AUDITORIA`.

---

## Fase 8: Modelo de Créditos Completo (Ledger + Compra) ✅
**Objetivo:** Cerrar el ciclo de créditos del Organizador tal como lo define el diagrama de tablas — hoy `saldo_creditos` se muta directamente sin dejar rastro, y no existe forma de comprar créditos ni de auditar de dónde salió cada movimiento.

1.  **Nuevas Entidades:**
    *   `TransaccionCredito`: `id`, `idOrganizador` (FK), `idPaquete` (FK), `monto`, `estado` (enum `EstadoTransaccion`: Pendiente/Aprobada/Rechazada), `mercadopagoPaymentId` (nullable), `fechaTransaccion`.
    *   `MovimientoCredito`: `id`, `idOrganizador` (FK), `tipoMovimiento` (enum `TipoMovimiento`: Bienvenida/Recarga/Consumo_Publicacion), `monto`, `saldoResultante`, `fechaMovimiento`, `idTransaccionCredito` (FK nullable), `idEvento` (FK nullable).
    *   Repositorios correspondientes (`TransaccionCreditoRepository`, `MovimientoCreditoRepository`).
2.  **Servicio de Créditos (`CreditoService`):**
    *   `iniciarCompraCredito(idPaquete)` / `confirmarPagoWebhook(ordenId, paymentId)` — mismo patrón que `VentaService` (orden pendiente → IPN simulado → acredita).
    *   Al confirmar: crea `TransaccionCredito` (Aprobada), suma `saldo_creditos` del Organizador, y registra un `MovimientoCredito` (tipo `Recarga`) con el `saldoResultante` post-operación.
    *   `listarHistorial(idOrganizador)` → devuelve `MovimientoCredito` ordenados por fecha (CU-013).
3.  **Corrección — `AuthService.register()`:**
    *   Reemplazar `saldoCreditos = 0` por un monto de bienvenida configurable (constante de servicio), y registrar el `MovimientoCredito` tipo `Bienvenida` correspondiente.
4.  **Corrección — `EventoService.publicarEvento()`:**
    *   Además de descontar `saldo_creditos`, registrar un `MovimientoCredito` tipo `Consumo_Publicacion` vinculado al evento publicado.
5.  **Controlador (`CreditoController`):**
    *   `GET /creditos/historial` (CU-013), `POST /creditos/comprar` y `POST /creditos/webhook/pago` (CU-014) — todos exclusivos de rol `Organizador`.

## Fase 9: Comprador Anónimo y Catálogo Público ✅
**Objetivo:** Habilitar el flujo real de CU-015/016/017 — el sistema debe garantizar que el comprador **nunca** necesite iniciar sesión, requisito explícito del documento de PP2.

1.  **Corrección de seguridad crítica (`SecurityConfig`):**
    *   Agregar a `permitAll()`: listado/detalle público de eventos, `POST /tickets/comprar-online` y `POST /tickets/webhook/pago`. Hoy `anyRequest().authenticated()` bloquea estas rutas y el comprador no tiene ni puede tener JWT.
2.  **Catálogo Público (`EventoPublicoController`):**
    *   `GET /public/eventos` (CU-015) → lista solo eventos en estado `Publicado`.
    *   `GET /public/eventos/{urlPublica}` (CU-016) → detalle con tandas y cupo disponible, usando `EventoRepository.findByUrlPublica`.
    *   Reutilizar `EventoService.toResponseDTO()` o un DTO público reducido (sin exponer `idOrganizador` innecesariamente).
3.  **Corrección — Persistencia de `TRANSACCION_PAGO`:**
    *   Reemplazar el `Map<String, CompraOnlineRequestDTO> ordenesPendientes` en memoria de `VentaService` por una entidad `TransaccionPago` real (`id`, `montoTotal`, `metodoPago`, `estado`, `mercadopagoPaymentId` nullable, `nombreComprador`, `emailComprador`, `fechaTransaccion`), y vincular `Entrada.idTransaccionPago` a un FK real en vez de un `Long` suelto.
4.  **Corrección — timestamps de `Evento`:**
    *   Agregar `fechaCreacion`, `fechaPublicacion`, `fechaCancelacion` (nullable) a la entidad `Evento`, poblados en `crearEvento`, `publicarEvento` y `cancelarEvento` respectivamente — necesarios para las métricas de Fase 13 y para el admin de Fase 12.

## Fase 10: Gestión de Staff (Organizador) ✅
**Objetivo:** Permitir que el Organizador dé de alta a su propio equipo — hoy `StaffQRRepository`/`StaffVendedorRepository` solo se usan para login, nunca para creación.

1.  **DTOs:** `CrearStaffQRRequestDTO` (nombre, email, idEvento), `CrearStaffVendedorRequestDTO` (nombre, email), `StaffResponseDTO`.
2.  **Servicio (`GestionStaffService`):**
    *   `crearStaffQR(dto, idOrganizador)` (CU-005): valida email no duplicado (`UsuarioRepository.existsByEmail`), genera contraseña temporal, crea `StaffQR` con `rol=Staff_QR`, `creadoPor=idOrganizador`.
    *   `crearStaffVendedor(dto, idOrganizador)` (CU-006): análogo, con `idOrganizador` seteado en la entidad.
    *   Reutilizar `EmailService` para enviar las credenciales generadas; si falla el envío, no revertir la creación — devolver aviso ("informar error envío manual") tal como indica el DCU de Autenticación.
    *   `listarMiStaff(idOrganizador)` — para la pantalla "Staff Mgmt" ya prevista en `DESIGN.md`.
3.  **Controlador (`GestionStaffController`):** `/organizador/staff`, exclusivo rol `Organizador`, verificando siempre pertenencia (IDOR) cuando se liste/edite.

## Fase 11: Recuperación de Contraseña ✅
**Objetivo:** Cerrar el módulo de Autenticación (CU-003), pendiente desde la Fase 3.

1.  **Entidad `TokenRecuperacion`:** `id`, `token` (UUID), `idUsuario` (FK), `fechaCreacion`, `fechaExpiracion`, `usado` (boolean). Repositorio con `findByToken`.
2.  **Servicio (`PasswordRecoveryService`):**
    *   `solicitarRecuperacion(email)`: genera token con expiración corta (ej. 30 min), lo persiste, envía email con `EmailService` (nunca revela si el email existe o no, para no filtrar usuarios registrados).
    *   `restablecerPassword(token, nuevaPassword)`: valida token no usado y no expirado, actualiza `passwordHash` (BCrypt), marca token `usado=true`.
3.  **Controlador (`AuthController`, ampliar):** `POST /auth/recuperar-password` y `POST /auth/restablecer-password`, ambos públicos.
4.  **Rate limiting (nota de `SECURITY.md`)** ✅ **— implementado:** `RateLimitFilter` (Bucket4j, en memoria) limita `/auth/login` (5/min), `/auth/recuperar-password` (3/5min) y los webhooks de pago (`/tickets/webhook/pago`, `/creditos/webhook/pago`, 30/min), todo por IP.

## Fase 12: Administración Completa (Usuarios, Eventos, Configuración) ✅
**Objetivo:** Terminar el módulo Administrador según la numeración final del PP2 (CU-021 a CU-025, CU-028), que es más granular que lo cubierto en la Fase 7.

1.  **Corrección — `AdminUsuarioService`:**
    *   Agregar `eliminarUsuario(id)` (CU-021, `@Auditable`) — borrado lógico (`estado=Inactivo`) o físico según se defina, verificando que no tenga recursos dependientes (eventos publicados, entradas emitidas).
    *   Generalizar `promoverAAdministrador` a `reasignarRol(id, nuevoRol)` (CU-022) — acepta cualquier `RolUsuario`, no solo `Administrador`.
2.  **Gestión de Eventos del Admin (`AdminEventoService` + `AdminEventoController`):**
    *   `GET /admin/eventos` — todos los eventos de todos los organizadores.
    *   `PUT /admin/eventos/{id}` (CU-023), `PATCH /admin/eventos/{id}/cancelar` (CU-024), `DELETE /admin/eventos/{id}` (CU-025) — todos `@Auditable`, sin la verificación de propiedad que sí aplica `EventoService` (el Admin puede tocar eventos de cualquiera).
3.  **Configuración del Sistema (CU-028):**
    *   Entidad `ConfiguracionSistema`: `id`, `clave` (unique), `valor`, `descripcion`, `fechaActualizacion`, `idAdministrador` (FK).
    *   `AdminConfiguracionService` + `AdminConfiguracionController`: `GET /admin/configuraciones`, `PUT /admin/configuraciones/{clave}` (`@Auditable`).
    *   Primer uso real: mover `CREDITOS_POR_PUBLICACION` (hoy constante fija en `EventoService`) y el monto de créditos de bienvenida (Fase 8) a esta tabla, para que el Admin los pueda ajustar sin recompilar.

**Corrección posterior — `eliminarUsuario` dejaba filas huérfanas** (encontrada al verificar la Fase 9.4 del frontend, ver `frontend_implementation_plan.md`): `movimientos_credito` (`idOrganizador`), `transacciones_credito` (`idOrganizador`) y `tokens_recuperacion` (`idUsuario`) guardan el id del usuario como un `Long` suelto, sin clave foránea, así que la base no los limpiaba al borrar la cuenta. El servicio ya bloqueaba borrar un Organizador con eventos o staff justamente para no dejar referencias huérfanas, pero se le había escapado el historial de créditos. Política aplicada en `AdminUsuarioService.eliminarUsuario`:
*   **Cualquier rol:** se borran sus `tokens_recuperacion` (secretos de corta vida, sin valor sin la cuenta).
*   **Organizador con compras de créditos `Aprobada`:** se bloquea la eliminación con 409 ("suspendé la cuenta en su lugar"), igual que con eventos o staff. Son registros de pago; borrarlos en silencio habría sido peor que el problema original.
*   **Organizador sin pagos completados:** se borran su historial de créditos (incluido el movimiento de bienvenida) y sus transacciones sin completar (`Pendiente`/`Rechazada`) junto con la cuenta.
*   Tests: 3 nuevos en `AdminUsuarioServiceTest` (bloqueo por compra aprobada sin tocar nada, limpieza completa de un Organizador sin pagos, y solo tokens para un rol que no es Organizador); suite completa 99/99. Verificado contra Postgres real: un Organizador con token de recuperación pendiente se elimina sin dejar ninguna fila en las 5 tablas involucradas, y uno con una compra aprobada devuelve 409 y conserva intactos su cuenta, su historial y su transacción.
*   Reparación de datos: se borraron 7 `movimientos_credito` huérfanos que había dejado el bug antes del arreglo (de cuentas de prueba ya eliminadas).

## Fase 13: Métricas (Organizador y Admin) ✅
**Objetivo:** Cubrir CU-012 (dashboard del Organizador) y CU-027 (métricas globales), ambos ausentes hoy.

1.  **`MetricasOrganizadorService` + Controlador (`GET /eventos/{id}/metricas`):**
    *   Agregados sobre `EntradaRepository`/`TandaRepository`: entradas vendidas por tanda, ingresos totales, aforo disponible vs. vendido — pensado para alimentar el `BarChart` que ya describe `DESIGN.md` en el dashboard del Organizador (CU-012).
2.  **`AdminMetricasService` + Controlador (`GET /admin/metricas`):**
    *   KPIs globales: total de eventos activos, entradas vendidas en el período, ingresos totales, organizadores activos — para los 4 KPI cards de la pantalla "K. Dashboard" de `DESIGN.md` (CU-027).
3.  Ambos son endpoints de solo lectura (`@Transactional(readOnly = true)`), sin necesidad de nuevas entidades — se calculan sobre las tablas existentes (y las de la Fase 8/9 una vez creadas).

---

**Orden de ejecución Fases 8-13:** 8 → 9 → 10 → 11 → 12 → 13. Las Fases 8 y 9 se priorizaron primero porque tocaban correcciones sobre lógica ya en producción (créditos y flujo de compra) — dejarlas para el final hubiera arrastrado el bug de seguridad del comprador y el problema del historial de créditos incompleto por más tiempo.

---

# Fases de Cierre — Preparación para el Frontend

Contraste final antes de arrancar el desarrollo del Frontend: qué falta para que un cliente HTTP en otro origen (el Frontend real, no Postman/curl desde el mismo host) pueda integrarse sin sorpresas, y qué gaps de los "Servicios Externos" del `Diagrama de Arquitectura` (`MercadoPago`, `SMTP`, `html5-qrcode`) siguen abiertos.

**Aclaración sobre `html5-qrcode`:** en el diagrama aparece tanto en el Frontend ("scanner cliente") como en "Servicios Externos" — es la MISMA librería, una librería JS que lee la cámara del navegador y decodifica el QR. **Es 100% trabajo de Frontend, cero cambios de backend** — el backend ya expone `POST /tickets/validate` para que el frontend le mande el código decodificado. Lo que sí es un gap real de backend es la mitad que falta: hoy `codigo_qr` es un string único (`QR-XXXX...`), pero en ningún lado se genera la **imagen** de código de barras QR que una cámara pueda escanear — eso se resuelve en la Fase 16 de abajo.

Cada fase está marcada con su prioridad:
- 🔴 **Bloqueante** — sin esto, el Frontend no puede integrarse o hay un agujero de seguridad activo.
- 🟡 **Recomendado** — no bloquea la integración, pero conviene cerrarlo antes de tener usuarios reales.
- 🟢 **Puede esperar** — mejora la calidad/mantenibilidad, no urge.

## Fase 14: CORS y Externalización de Secretos 🔴 ✅
**Objetivo:** Que un Frontend corriendo en otro origen (`localhost:5173`, un dominio propio, etc.) pueda pegarle a la API sin que el navegador bloquee las requests, y que ningún secreto quede hardcodeado en el repo.

1.  **CORS:**
    *   Agregar un bean `CorsConfigurationSource` en `SecurityConfig` (orígenes permitidos, métodos, headers, `allowCredentials` si el Frontend manda el JWT en header `Authorization` — no hace falta `credentials` para eso, pero si en algún momento se usa cookie, sí).
    *   Habilitar `.cors(Customizer.withDefaults())` en la `SecurityFilterChain` (hoy no está — el `CorsFilter` que aparece en el chain de logs es el default de Spring Security, que sin una `CorsConfigurationSource` registrada no agrega ningún header, así que las requests cross-origin se bloquean igual).
    *   Orígenes permitidos configurables vía `application.yml` (`app.cors.allowed-origins`), no hardcodeados, para poder tener un valor distinto en dev/prod.
2.  **Externalización de secretos:**
    *   `app.jwt.secret`, `spring.datasource.password`, `spring.mail.password` → reemplazar los valores literales en `application.yml` por placeholders `${VAR_DE_ENTORNO:valor-default-solo-para-dev}`.
    *   Crear `application-prod.yml` (ya está en `.gitignore`, así que no se commitea) con instrucciones en un comentario de qué variables de entorno espera.

## Fase 15: Endurecimiento de Pagos y Notificaciones 🔴 / 🟡 ✅
**Objetivo:** Cerrar los dos huecos de seguridad/UX más importantes que quedaron documentados como "simulación" durante el desarrollo.

1.  🔴 **Corrección — `GlobalExceptionHandler.handleGenericException`:** hoy usa `ex.printStackTrace()` (va a consola cruda, no a los logs estructurados de la app, y en prod puede terminar en la salida estándar de un contenedor sin control). Cambiar a `log.error("Error inesperado", ex)`.
2.  🟡 **Validación de firma del webhook de MercadoPago:** dejar preparado el punto de extensión — hoy `VentaController.confirmarPago`/`CreditoController.confirmarPago` aceptan el webhook sin verificar que realmente venga de MercadoPago (documentado como simulación desde la Fase 5). Si en el corto plazo van a conectar el SDK real, validar el header `X-Signature` acá; si sigue siendo simulado para la demo con el Frontend, dejarlo documentado como deuda técnica explícita en el propio código (ya lo está parcialmente).
3.  🟡 **Notificación de cancelación de evento:** cuando `EventoService.cancelarEvento` o `AdminEventoService.cancelarEvento` cancelan un evento con entradas ya vendidas, hoy los compradores no se enteran. Agregar `EmailService.enviarNotificacionCancelacion(email, nombreComprador, nombreEvento)` y llamarlo desde ambos servicios para cada `Entrada` asociada. (El reembolso real de plata queda fuera de alcance — requeriría integrar la API de reembolsos de MercadoPago; se documenta como pendiente, no se implementa acá.)

## Fase 16: Imagen QR Real 🟡 ✅
**Objetivo:** Que el código QR generado en la compra (`codigo_qr`) se pueda escanear de verdad — hoy es solo un string único, no una imagen de código de barras.

1.  Agregar dependencia `com.google.zxing:core` + `com.google.zxing:javase` (liviana, sin servicios externos).
2.  `QrImageService.generarPng(String contenido, int tamaño)` → devuelve los bytes PNG del QR codificando `codigo_qr`.
3.  Embeber la imagen en el email de confirmación de compra (`EmailService.enviarConfirmacionCompra`, hoy es texto plano) como adjunto o imagen inline (`MimeMessage` en vez de `SimpleMailMessage`).
4.  Opcional: exponer `GET /tickets/{id}/qr-image` (autenticable solo por quien tiene el `codigoQr` o el dueño del evento) para que el Frontend pueda mostrarla en la pantalla de "mi entrada" sin tener que regenerarla client-side.
5.  **Nota de alcance:** esto es una alternativa a que el Frontend renderice el QR client-side con una librería JS (`qrcode.react` o similar) a partir del string `codigo_qr` — mismo resultado, pero generarlo en el backend garantiza que el email (que puede llegar sin que el usuario nunca abra el Frontend) tenga una imagen real y escaneable, no solo el código en texto.

## Fase 17: Tests de Controllers/Seguridad + CI 🟢 ✅
**Objetivo:** Cerrar la brecha de tests que quedó pendiente — hoy la suite cubre servicios (lógica de negocio) pero no el enforcement de roles a nivel HTTP.

1.  Tests `@WebMvcTest` + `MockMvc` sobre un controller representativo de cada nivel de acceso (público, Organizador, Staff, Admin) verificando que el rol incorrecto devuelve `403` y el correcto `200`.
2.  Test unitario de `JwtAuthenticationFilter` (token válido, expirado, malformado, ausente).
3.  Test unitario de `RateLimitFilter` (bucket se agota, se resetea con el tiempo).
4.  GitHub Actions (`.github/workflows/backend-tests.yml`): corre `mvn test` en cada push/PR — hoy no hay ningún pipeline automático, todo se corrió a mano en esta sesión.

---

**Orden de ejecución sugerido:** Fase 14 → 15 → 16 → 17. La 14 es la única genuinamente bloqueante para arrancar el Frontend (sin CORS, ninguna request cross-origin va a funcionar apenas conecten algo real). Las Fases 15-17 se pueden hacer en paralelo con el arranque del Frontend si el tiempo aprieta, pero conviene tenerlas resueltas antes de mostrarle el sistema a un usuario real.

---

## Fase 18: Pedidos del cliente para el jueves (backend) ✅
**Objetivo:** Soporte backend de los pedidos de la Fase 10 del frontend. Cada punto se marca ✅ recién cuando queda verificado contra Postgres y, si corresponde, commiteado. Orden de ejecución: 18.2 → 18.4 → 18.5 → 18.3 → 18.6 → 18.7 → 18.8.

### 18.1 — Subida de imágenes a Cloudinary ✅
1.  Dependencia `com.cloudinary:cloudinary-http5` 2.5.0. (La 2.3.1 no resuelve en Maven Central; se usa la 2.5.0.)
2.  `CloudinaryConfig`: bean `Cloudinary` con credenciales de `app.cloudinary.*`, que vienen de las variables `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET`. Nunca van en el repo.
3.  `ImagenService.subirImagenEvento(MultipartFile)`: valida tipo (JPG, PNG, WEBP), tamaño (5 MB máximo) y que no esté vacío. Sube a la carpeta `asistiapp/eventos` y devuelve `secure_url`.
4.  `POST /eventos/imagenes` (multipart, parámetro `archivo`, rol Organizador) → `201` con `ImagenSubidaResponseDTO { url }`.
5.  `application.yml`: `spring.servlet.multipart.max-file-size` y `max-request-size` en 5 MB (el default de Spring es 1 MB).
6.  **Verificación:** PNG → 201 con URL de Cloudinary que carga; TXT → 409 (`BusinessRuleException`, convención del proyecto); sin token → 403. Imágenes de prueba borradas de Cloudinary.
7.  Commiteado (`7b64cf4`), pusheado.

### 18.2 — Suspensión real de cuentas ✅ (commit `d9b3ca6`, pusheado)
- Causa: `UserDetailsServiceImpl` no reflejaba el estado, así que una cuenta suspendida seguía autenticando y su JWT seguía válido.
- `UserDetailsServiceImpl`: `enabled = estado == Activo`. Spring Security lanza `DisabledException` en el login, antes de comparar la contraseña.
- `JwtAuthenticationFilter`: no autentica si `userDetails.isEnabled()` es falso, así que una sesión ya abierta también queda bloqueada en cada request.
- `GlobalExceptionHandler`: `DisabledException` → `403` con `error: "Cuenta suspendida"`. Antes salía como "Credenciales inválidas" (401).
- **Verificado contra el backend real:** suspender (200) → login (403 "Cuenta suspendida") → token de sesión abierta sobre `/eventos` (403) → activar (200) → login normal (200). La cuenta de prueba se borró al final (204).
- El login del Organizador muestra `e.message`, así que el cartel nuevo aparece sin cambios de frontend. Verificado en el código, no visualmente.
- Test automático: `UserDetailsServiceImplTest` (cuenta activa, suspendida e inactiva).

### 18.3 — Quitar "Cambiar Rol" ✅
- Se borró el endpoint `PATCH /admin/usuarios/{id}/rol`, `ReasignarRolRequestDTO`, `AdminUsuarioService.reasignarRol` y sus 4 tests (`AdminUsuarioServiceTest`). No había caso de uso que lo necesitara.
- Verificado: `AdminUsuarioServiceTest` pasa, y contra el backend real con token de Admin el endpoint ya no responde como función (ver nota de 500 abajo).
- Nota: el catch-all de `GlobalExceptionHandler` convierte cualquier ruta inexistente en `500` en vez de `404` (`NoResourceFoundException` cae en `Exception`). Pre-existente, no bloquea nada; queda para revisar aparte.

### 18.4 — Mis eventos: orden por fecha de creación ✅
- `EventoRepository.findByIdOrganizadorOrderByFechaCreacionDesc` es la consulta de `listarMisEventos` (los demás usos de `findByIdOrganizador` no cambian).
- Test: `EventoServiceTest.listarMisEventos_devuelveElOrdenDelRepositorioSinReordenar`.
- Verificado contra el backend real: los 21 eventos de la cuenta demo vienen ordenados por `fechaCreacion` descendente.

### 18.5 — Perfil del organizador ✅
1.  `GET /organizador/perfil`, `PUT /organizador/perfil` (nombre y `fotoPerfilUrl`) y `PUT /organizador/perfil/password` (exige la actual). Rol Organizador; el ID sale del JWT.
2.  `POST /organizador/perfil/foto` sube a la carpeta `asistiapp/perfiles` (separada de `asistiapp/eventos`) y devuelve la URL.
3.  Campo nuevo `foto_perfil_url` en `usuarios`, que `ddl-auto: update` crea solo. `AuthResponseDTO` devuelve la foto para que la sidebar la muestre sin pedirla aparte.
4.  Reglas: la foto solo puede apuntar a nuestro Cloudinary (si no, 409); la contraseña actual debe coincidir (409); la nueva tiene 8 a 100 caracteres (400) y debe ser distinta de la actual (409).
5.  Tests: `PerfilServiceTest` (6 casos de las reglas anteriores).
6.  **Verificado contra el backend real** con cuenta de prueba: GET y PUT 200, foto externa 409, contraseña mal 409, igual a la actual 409, corta 400, cambio 204, login con la nueva 200 y con la vieja 401. La cuenta se borró.

### 18.6 — Mailhog para el envío de mails ✅
- Integrado desde la rama `feature-mailhog` de un compañero de equipo (commit `7ff345a`), que ya traía: SMTP a `localhost:1025` en vez de Gmail, emails en HTML (QR embebido en base64, botón "Ver mi entrada"), email de recuperación con botón al frontend, `GET /tickets/by-codigo` (público) y `docker-compose.yml`.
- La rama se creó sobre el último commit de `master` de esta sesión (cero divergencia), así que se trajo con fast-forward, sin conflictos.
- **Fix encontrado:** `enviarConfirmacionCompra` sumó el parámetro `entradaId`, pero `VentaServiceTest` no se había actualizado y rompía la suite. Se corrigió el matcher del mock (commit `6e05d33`).
- **Entorno de esta máquina:** Docker Desktop no arranca por falta de virtualización (BIOS) y de "Plataforma de máquina platform" en Windows — no es un bug del proyecto. Se usó el ejecutable standalone `MailHog_windows_amd64.exe` (mismo MailHog, sin Docker) para verificar. El `docker-compose.yml` del compañero queda como la opción normal para quien tenga Docker andando.
- **Verificado de punta a punta** con dos cuentas de prueba (borradas al final): registrar → pedir recuperación → el mail llega a MailHog → se lee el link real del cuerpo del mail → `POST /auth/restablecer-password` con el token → login con la contraseña vieja falla (401) y con la nueva funciona (200) → reusar el token da 409 ("ya fue utilizado"). La pantalla `/organizador/recuperar-password` se probó en el navegador con el link real, en desktop y mobile: valida 8 caracteres, bloquea el botón si no, y muestra el cartel de éxito.

### 18.7 — Créditos: consumo al crear, editar y eliminar tandas ✅
- **Regla:** cada entrada de una tanda consume 1 crédito. Crear descuenta el cupo; subir el cupo cobra la diferencia; bajarlo o eliminar la tanda (sin ventas) devuelve créditos.
- **Reserva del costo de publicar (decisión):** los créditos disponibles para entradas son `saldo − costo de publicar`. Sin reserva, una tanda podía agotar el saldo y después la publicación fallaba con las tandas ya creadas. Se puede cambiar, pero conviene decidirlo con el cliente.
- `CreditoService.obtenerCostoPublicacion()` y `creditosDisponiblesParaEntradas()`: fuente única de la regla (el costo lo configura el Admin en `creditos_por_publicacion`). `GET /creditos/resumen` la expone al frontend.
- `CreditoLedgerService`: `registrarConsumoTanda` y `registrarDevolucionTanda`. Nuevos tipos `Consumo_Tanda` y `Devolucion_Tanda` en `TipoMovimiento`.
- **Migración de base:** `ddl-auto: update` no actualiza el CHECK de la columna de enum. Se aplicó `backend/db/migraciones/2026-10-06-tipos-movimiento-tanda.sql`. Hay que correrlo en cualquier base que se levante desde ahora.
- **Tests:** `TandaServiceTest` (6 casos: crear con y sin saldo, subir cupo dentro y fuera del saldo, bajar cupo, eliminar con y sin ventas).
- **Verificado contra el backend real:** saldo 30 → crear tanda de 3 → saldo 27 → cupo 31 con 28 disponibles → 409 con el mensaje → eliminar tanda → 28 (devolución de 3). Cuenta de prueba borrada por SQL.
- **Decisión tomada y resuelta:** al cancelar un evento se devuelven los créditos de las entradas que no se habían vendido (`EventoService.devolverCreditosDeEntradasSinVender`, usado también por `AdminEventoService.cancelarEvento`). El costo de publicar nunca se devuelve. Beneficia al organizador (no pierde créditos por capacidad que nunca se usó) sin crear incentivo a publicar y cancelar gratis (siempre queda el costo de publicar).
  - Tests: `cancelarEvento_conEntradasSinVender_devuelveSusCreditos`, `cancelarEvento_conTodoVendido_noDevuelveCreditos`, `cancelarEvento_noDevuelveElCostoDePublicar`, `cancelarEvento_sinTandas_noHayNadaQueDevolver`.
  - Verificado contra el backend real, tres casos: todo sin vender (30 → 18 → 28), todo vendido (sin cambio) y parcial (18 → 22, simulando 6 de 10 vendidas). Cuentas de prueba borradas.

### 18.8 — Métricas del organizador ✅
- `GET /eventos/resumen` (rol Organizador) → `ResumenOrganizadorResponseDTO`: eventos publicados y en borrador, entradas vendidas y validadas, ingresos, créditos consumidos (neto: publicar y tandas suman, las devoluciones restan), saldo y próximo evento publicado que todavía no empezó.
- Ventas e ingresos reutilizan `obtenerMetricas` por evento publicado, así la regla no se duplica. El Dashboard dejó de pedir una métrica por evento y ahora usa una sola llamada.
- Test: `MetricasOrganizadorServiceTest` (4 casos: suma de publicados, neto de créditos, próximo evento, sin eventos).
- **Verificado contra el backend real** con la cuenta demo: 21 publicados, 50 créditos usados, próximo evento en 2 días.

### 19.1 — Ruta inexistente respondía 500 en vez de 404 ✅
- **Causa:** el catch-all de `GlobalExceptionHandler` atrapaba `NoResourceFoundException` de Spring.
- **Solución:** handler específico que devuelve `404 "Recurso no encontrado"`.
- **Verificado:** con token, `GET /ruta-que-no-existe` → 404. Sin token, Spring Security responde 403 antes de llegar al dispatcher (comportamiento esperado).

### 19.2 — `EventoControllerSecurityTest` roto por el commit de Cloudinary ✅
- **Causa:** `EventoController` ahora depende de `ImagenService`, y el test de `@WebMvcTest` no lo tenía como bean. Lo commiteé sin correr la suite completa.
- **Solución:** `@MockBean ImagenService` en el test.
- **Verificado:** `mvn test` completo pasa.
- **Aprendizaje:** correr `mvn test` completo antes de cada commit, no solo el test del cambio.

### 19.3 — Test automático de la suspensión ✅
- Pendiente detectado al cerrar 18.2. Se agregó `UserDetailsServiceImplTest` (activa, suspendida, inactiva).

### 19.4 — Dependencia de Cloudinary no resolvía ✅
- `cloudinary-http5` 2.3.1 no estaba en Maven Central. Se usa 2.5.0 (ver 18.1).

### 19.6 — Tests unitarios del frontend ✅
- Se agregaron: `ImagenPortadaField` (5 casos: subida, endpoint por defecto, límite de 5 MB, error del backend, quitar), `PerfilPage` (9 casos: carga, nombre vacío, guardado y actualización de la sesión, y las validaciones de contraseña) y `DashboardPage` (orden del backend, búsqueda por nombre y lugar, filtro por estado, aviso sin coincidencias, y una sola llamada de resumen).
- Suite del frontend: 120/120.

### 19.7 — Avatar flotante de mobile tapaba el título de cada página ✅
- **Causa:** al agregar el acceso al perfil en mobile, puse un botón fijo arriba a la izquierda. Se superponía con el título de las páginas del Organizador.
- **Solución:** se quitó el botón. En mobile el perfil es la quinta pestaña de la barra inferior (`MOBILE_TABS`). En desktop se accede desde el nombre de la sidebar.
- **Verificado:** en mobile, la barra tiene 5 pestañas y "Perfil" abre la página sin superposición.

### 19.8 — Textos del Wizard con el costo de publicar fijo en 1 ✅
- **Causa:** "Publicar consume 1 crédito" estaba escrito a mano, aunque el Admin lo había configurado en 2. El pie mostraba un costo distinto del que cobra el backend.
- **Solución:** los textos usan `costoPublicacion` de `/creditos/resumen`. También se corrigió el texto de Editar evento.

### 19.9 — VentaServiceTest roto al traer feature-mailhog ✅
- **Causa:** `enviarConfirmacionCompra` sumó el parámetro `entradaId` (para el botón "Ver mi entrada") pero el test del compañero no se actualizó.
- **Solución:** se agregó el matcher que faltaba en `verify(...)`.
- **Verificado:** suite completa en verde después del fix.

### 19.10 — `position: fixed` roto en TODA la app por la animación de transición de página ✅
- **Reportado por el usuario:** en el Dashboard del Organizador con 21 eventos, el nombre de la sidebar (y "Salir", y la barra inferior de mobile) solo aparecían al scrollear hasta el fondo de la página, en vez de quedar siempre visibles.
- **Causa real, más amplia de lo reportado:** `AnimatedRoutes` (`frontend/src/App.tsx`) envuelve TODA la app en un `<div className="page-transition">` con `animation: fade-in-up ... both`. El `both` deja aplicado para siempre el `transform: translateY(0)` del keyframe final. Cualquier `transform` distinto de `none` — aunque sea la matriz identidad — convierte a ese div en el "contenedor" de los elementos `position: fixed` de adentro, en vez del viewport. Como ese div mide lo mismo que toda la página (no el viewport), todo lo `fixed` de cualquier pantalla — sidebar y "Salir" de Organizador y Admin, barra inferior de mobile, el fondo de los tres logins — quedaba mal posicionado en cualquier página más alta que la ventana.
- **Solución:** al terminar la animación (`onAnimationEnd`, con un `setTimeout` de respaldo por si el hilo principal está ocupado cargando imágenes) se le saca la animación al div (`style.animation = "none"`), así el `transform` vuelve a `none` y `fixed` vuelve a ser `fixed` de verdad. El efecto visual de la transición no cambia.
- **Verificado en el navegador**, Organizador y Admin, desktop y mobile: la sidebar mide exactamente el alto del viewport (no el de toda la página), y la posición de "Salir", el nombre y la barra inferior no se mueven al scrollear.
- **Nota de timing:** en páginas con muchas imágenes (ej. el Dashboard con 21 eventos en mobile), el hilo principal puede tardar hasta ~1 segundo en procesar la limpieza mientras decodifica las imágenes. Durante esa ventana muy breve el `fixed` puede seguir roto; se corrige solo apenas el hilo se libera y queda corregido para siempre en esa carga de página. No se encontró una forma de eliminar esa ventana sin sacar la animación de transición de encima de los layouts con `fixed` (un cambio de arquitectura mayor) — se deja anotado por si en el futuro se vuelve molesto.

### 19.5 — Instancia vieja del backend ocupando el 8080 ⚠️ (operativo, no es código)
- Al levantar el backend con `mvn spring-boot:run`, si quedó otra instancia de una sesión anterior en el 8080, el nuevo arranque falla con "Port 8080 was already in use" y se sigue probando contra código viejo.
- **Cómo verificar:** `netstat -ano | findstr :8080` y cerrar ese proceso antes de levantar.

---

## Fase 20: Correcciones del testeo manual del cliente ✅
**Objetivo:** cuatro pedidos que surgieron al probar la app a mano: imágenes de eventos, limpieza de Cloudinary y un solo mail por compra múltiple.

### 20.1 — Imágenes de eventos: no estaban hardcodeadas, pero no eran de Cloudinary ✅
- No había ningún código que fijara una imagen. Los 21 eventos de la demo tenían una URL de Unsplash cargada directo en la base (dato de seed, no código).
- Se migraron los 21 a Cloudinary con un script puntual (`migrar_imagenes.py`, descartado al terminar): descarga cada imagen de Unsplash, la sube a `asistiapp/eventos` y actualiza `imagen_portada_url`. Verificado: `select ... where imagen_portada_url not like 'https://res.cloudinary.com/%'` da 0 filas, y una de las URLs nuevas responde 200.
- El SVG de respaldo para "sin imagen" o "la imagen no cargó" es un cambio de frontend — ver 20.1 en `frontend_implementation_plan.md`.

### 20.2 — Borrar la foto de perfil anterior al cambiarla o quitarla ✅
- `ImagenService.eliminarSiEsNuestra(url)`: valida que la URL sea de nuestra cuenta de Cloudinary (`esDeNuestroCloudinary`), extrae el `public_id` (con o sin segmento de versión) con una regex, y llama a `cloudinary.uploader().destroy(...)`. Nunca lanza: liberar espacio no es parte crítica del flujo que lo pide, solo loguea si falla.
- `PerfilService.actualizarPerfil`: si la foto anterior era nuestra y cambió (o se quitó), se borra después de guardar.
- Tests: `ImagenServiceTest` (7, incluye URL con y sin versión, URL ajena, y que una falla de Cloudinary no tira excepción) y `PerfilServiceTest` (+3 casos de borrado).
- **Verificado contra el backend y Cloudinary reales:** subir foto A, guardarla (200, existe), subir foto B y guardarla (A pasa a 404), quitarla (B pasa a 404).

### 20.3 — Borrar la portada anterior de un evento al cambiarla o quitarla ✅ (alcance: editar un evento existente)
- **Decisión de seguridad:** las URLs de portada son públicas (se ven en el código fuente de cualquier evento). Un endpoint genérico de "borrar por URL" habría dejado que un organizador le borre la portada a otro con solo copiar la URL. Por eso el borrado se resuelve *adentro* de `EventoService.actualizarEvento`, donde ya se verificó que el evento es del organizador que pide el cambio, comparando la URL vieja (la que tenía guardada ese evento) contra la nueva.
- **Fuera de alcance, a propósito:** el Wizard de Crear Evento (antes de guardar el evento por primera vez) no borra la imagen anterior al cambiarla, porque ahí todavía no hay un evento contra el cual verificar dueño — un endpoint de borrado ahí sería el mismo agujero de seguridad. Puede quedar alguna imagen huérfana de intentos descartados en el Wizard; no cuesta nada en el plan gratis de Cloudinary y se puede limpiar más adelante con un script como el de 20.1 si hiciera falta.
- Tests: `EventoServiceTest` (+4 casos: cambia, quita, misma imagen no borra nada, sin imagen previa no intenta nada).
- **Verificado contra el backend y Cloudinary reales:** mismo patrón que 20.2, con la portada de un evento de prueba.

### 20.4 — Un solo mail con todas las entradas de una compra múltiple ✅
- `confirmarPagoWebhook` ya no manda mail (antes mandaba uno por cada llamada: una compra de N entradas seguía siendo N compras por detrás, cada una con su propio mail).
- `EmailService.enviarConfirmacionCompra` pasó a recibir la lista de códigos QR de toda la compra (antes uno solo) y arma un mail con un bloque de QR + botón "Ver mi entrada" por cada código. Con una sola entrada, el asunto y el texto quedan en singular y no aparece el contador "Entrada N de M".
- `POST /tickets/confirmar-compra` (público, nuevo): recibe los códigos QR de la compra, el nombre y el email del comprador. Por cada código verifica que la entrada exista y que el email coincida con el de la entrada (403 si no) antes de armar el mail — el codigoQr ya es el token de acceso en el resto de la app (ver `GET /tickets/by-codigo`), así que no hace falta JWT.
- Tests: `VentaServiceTest` (+4: varias entradas en un mail, una sola entrada, código inexistente, email que no coincide).
- **Verificado de punta a punta** contra el backend real y MailHog: 3 compras seguidas al mismo email + 1 llamada a confirmar-compra → 1 solo mail recibido, con "Entrada 1/2/3 de 3", sus 3 códigos QR (imagen real, no placeholder) y sus 3 botones. Con 1 sola entrada, el mail sale en singular sin el contador. Con un email que no coincide con la entrada, 403 y no se manda nada. Las entradas y transacciones de prueba se borraron, y el cupo de la tanda real usada se restauró.
