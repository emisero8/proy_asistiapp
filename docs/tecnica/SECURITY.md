# AsistíAPP — Security & Audit Guidelines

Este documento define las reglas de seguridad críticas para el stack de AsistíAPP (React + Spring Boot + PostgreSQL). Al solicitar una auditoría de código, evalúa el cumplimiento estricto de estos puntos.

## 1. Inyección SQL (SQLi)
- En Spring Boot, utiliza exclusivamente Spring Data JPA (métodos de repositorio) o `PreparedStatement`.
- Evita la concatenación de cadenas de texto para construir consultas SQL o JPQL de forma dinámica.

## 2. Autenticación y Autorización
- **JWT Stateless:** Todo endpoint protegido debe validar correctamente la firma y expiración del token JWT.
- **Control de Privilegios:** Verifica que los controladores posean anotaciones de seguridad (ej. `@PreAuthorize`) validando los roles correspondientes: `Administrador`, `Organizador`, `Staff_QR`, o `Staff_Vendedor`[cite: 1, 2, 3].
- **IDOR (Insecure Direct Object Reference):** Al consultar o modificar recursos (como un evento o una entrada), el servicio backend debe validar explícitamente que el ID del recurso consultado pertenece al usuario autenticado en la sesión actual.

## 3. Cross-Site Scripting (XSS)
- **Frontend (React):** Confía en el escape automático de React para el renderizado de datos. Evita por completo el uso de la propiedad `dangerouslySetInnerHTML`.
- **Backend (Spring Boot):** Sanitiza las entradas de texto libre provenientes del cliente antes de persistirlas en PostgreSQL.

## 4. Cross-Site Request Forgery (CSRF)
- Si los tokens JWT se envían mediante el encabezado `Authorization: Bearer`, CSRF se mitiga en gran medida de forma nativa.
- Si decides almacenar el JWT en cookies, la cookie debe configurarse obligatoriamente con los atributos `HttpOnly`, `Secure` y `SameSite=Strict`.

## 5. Rate Limiting y Fuerza Bruta
- Endpoints públicos y críticos, como el inicio de sesión, recuperación de contraseñas[cite: 1], o transacciones de pago[cite: 2], deben implementar limitación de peticiones (Rate Limiting) a nivel de código (ej. biblioteca Bucket4j) o a nivel de infraestructura para mitigar abusos automatizados.

## 6. Lógica de Negocio y Fuga de Datos
- **Transacciones y Sobreventa:** Toda modificación que afecte el cupo de entradas o el saldo de créditos debe ejecutarse bajo `@Transactional` utilizando bloqueos adecuados en la base de datos (ACID)[cite: 3].
- **Manejo de Errores:** Las respuestas HTTP del backend no deben exponer trazas de error (*stack traces*), detalles internos del servidor ni consultas SQL en crudo.