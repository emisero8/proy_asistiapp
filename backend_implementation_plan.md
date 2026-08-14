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
