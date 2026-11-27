# AsistíAPP — Seguridad

Criterios de seguridad para el stack de AsistíAPP (React + Spring Boot + PostgreSQL) y **cómo se cumple cada uno hoy**. Sirve de lista de control para revisar código: al auditar un cambio, verificar que respete estos puntos.

## 1. Inyección SQL
- **Criterio:** usar solo Spring Data JPA (métodos de repositorio y consultas JPQL con parámetros nombrados); nunca armar consultas concatenando texto.
- **Estado:** todas las consultas son métodos derivados o `@Query` con parámetros (`:nombre`). No hay SQL armado con texto de usuario.

## 2. Autenticación y autorización
- **Criterio:** todo endpoint protegido valida la firma y la expiración del JWT, y el rol con `@PreAuthorize`. Cada recurso se valida contra su dueño (evitar IDOR).
- **Estado:**
  - JWT sin estado, firmado con `JWT_SECRET`, 24 horas de vigencia. En el perfil `prod` el backend **no arranca** si el secreto es el de desarrollo.
  - `SecurityConfig` deja públicos solo `/auth/**`, `GET /public/**`, la compra online, la consulta de órdenes y entradas, el webhook de MercadoPago y Swagger; todo lo demás exige sesión. Los roles se exigen con `@PreAuthorize` (`Administrador`, `Organizador`, `Staff_QR`, `Staff_Vendedor`).
  - Contraseñas con BCrypt. Las cuentas suspendidas no pueden iniciar sesión.
  - **Propiedad de los recursos:** un Organizador solo opera sobre sus eventos, tandas y staff; un Staff Vendedor solo vende el evento asignado y un Staff QR solo valida entradas de su evento. Hay tests de esos rechazos.
  - La contraseña del primer Administrador se define por variable de entorno; en producción, sin ella no se crea ningún Admin.

## 3. Cross-Site Scripting (XSS)
- **Frontend:** se confía en el escape automático de React; **no se usa `dangerouslySetInnerHTML`** en ninguna pantalla.
- **Mails (backend):** todos los mails están armados en HTML con datos que escribe quien compra (nombre) o el organizador (evento, tanda, nombre del Staff). Esos textos se **escapan** antes de insertarlos (`PlantillaEmail.escapar`, usado por `EmailService`), y hay tests (`EmailServiceSmtpTest`) que verifican que un dato con HTML no llega como HTML. Todo texto de usuario nuevo que vaya a un mail HTML debe escaparse igual.
- **Entradas:** los DTO validan con `@Valid` (obligatorios, largos, formatos). El texto libre se guarda tal cual y se escapa al mostrarlo.

## 4. Cross-Site Request Forgery (CSRF)
- **Criterio:** si el JWT viaja en el encabezado `Authorization: Bearer`, CSRF no aplica; si se guardara en cookies, tendrían que ser `HttpOnly`, `Secure` y `SameSite=Strict`.
- **Estado:** el JWT viaja en `Authorization: Bearer` y **el frontend lo guarda en `localStorage`**, no en cookies, así que CSRF no aplica. El costo es que un XSS podría leer el token; por eso el punto 3 es crítico (no usar `dangerouslySetInnerHTML`, escapar lo que va a mails). Si se despliega con un dominio propio, evaluar pasarlo a cookie `HttpOnly`.
- CORS: solo los orígenes de `CORS_ALLOWED_ORIGINS` (obligatoria en producción).

## 5. Límite de peticiones y fuerza bruta
- **Estado:** `RateLimitFilter` (Bucket4j, en memoria, por IP): login 5 por minuto, recuperar contraseña 3 cada 5 minutos, consulta del estado de una orden 120 por minuto y webhook de MercadoPago 300 por minuto. Responde 429.
- La IP es la de la conexión; `X-Forwarded-For` solo se lee si hay proxies propios configurados (`RATE_LIMIT_PROXIES_CONFIABLES`), para que no se pueda saltear el límite cambiando ese encabezado.
- Limitación conocida: al ser en memoria se reinicia con el servidor y no se comparte entre instancias (ver `docs/proyecto/PLAN_MEJORAS.md`, 4.7). Alcanza para una sola instancia.
- La recuperación de contraseña **no revela** si un email existe.

## 6. Pagos, lógica de negocio y fuga de datos
- **Pagos:** el webhook de MercadoPago se autentica por la firma `x-signature` (`MP_VALIDAR_FIRMA=true` en producción; ver la nota sobre el sandbox en `backend/README.md`). El contenido del aviso nunca se confía: el pago se vuelve a consultar a la API de MercadoPago y se verifica monto, moneda y referencia antes de entregar nada. Todo es idempotente.
- **Sobreventa:** toda modificación de cupo o de saldo de créditos corre bajo `@Transactional`, con **bloqueo pesimista** de la tanda; hay una prueba de concurrencia real (`VentaServiceConcurrencyTest`).
- **Manejo de errores:** las respuestas no exponen trazas, consultas SQL ni detalles internos (`server.error.include-message: never` en producción y un manejador global que devuelve un formato fijo).
- **Logs:** en producción no se imprime SQL y el nivel es INFO/WARN. Las contraseñas **no se escriben** en ningún log ni en la auditoría (los argumentos sensibles se enmascaran; hay un script que limpió filas viejas).
- **Secretos:** claves y credenciales solo por variable de entorno o `backend/.env` (ignorado por git); el repo solo tiene `.env.example` con valores vacíos o de desarrollo. Los valores por defecto que figuran en los README son públicos y solo sirven en local.
- **El enlace de la entrada es la entrada:** quien tiene el enlace o el código QR puede mostrarla. Se avisa al comprador en la pantalla de resultado del pago y en el POS.

## 7. Pendiente antes de producción
- Comprobar `MP_VALIDAR_FIRMA=true` con un pago real de bajo monto (ver `docs/proyecto/PLAN_MEJORAS.md`, 2.4).
- Para que los mails no caigan en spam: dominio propio con SPF, DKIM y DMARC.
- Revisar el checklist de pase a producción de `docs/tecnica/backend_implementation_plan.md`.
