# AsistíAPP — Backend Architecture & API Specs

## Overview
AsistíAPP is a ticketing and access-control platform for independent event organizers in Argentina. This document serves as the absolute truth for backend architecture, data modeling, and business logic.

## 1. Stack & Infrastructure
- **Framework:** Java with Spring Boot.
- **Database:** PostgreSQL.
- **ORM:** Spring Data JPA (Hibernate).
- **Security:** Spring Security with Stateless JWT (JSON Web Tokens).
- **Build Tool:** Maven or Gradle (Assume Maven unless stated otherwise).
- **Key Integrations:** 
  - MercadoPago SDK (Payment processing & Webhooks/IPN).
  - SMTP Provider (for email delivery).
- **Architecture Style:** Layered REST API (Controllers -> Services -> Repositories).

---

## 2. Security & Roles
The system uses stateless JWT authentication. Every secured endpoint MUST extract the user's role from the JWT to enforce authorization.

### Defined Roles (Enum `ROLES_USER`)
1. **Administrador:** Global system management.
2. **Organizador:** Creates events, manages tandas, and buys credits.
3. **Staff_QR:** Scans and validates QR tickets.
4. **Staff_Vendedor:** Performs manual ticket sales.

*Note: Roles are specialized from the base `USUARIO` entity.*

---

## 3. Data Model (Entity-Relationship)
This schema maps directly to the PostgreSQL database using JPA entities. 
*CRITICAL RULE:* Ensure ACID properties are strictly handled in services (using `@Transactional`), especially to prevent ticket overselling (sobreventa).

### Core Entities

**USUARIO** (Base entity)
- `id` (PK, INT)
- `nombre` (String)
- `email` (String, Unique)
- `password_hash` (String)
- `rol` (String - Enum `ROLES_USER`)
- `estado` (String - Enum `ESTADOS_USER`: Activo, Suspendido, Inactivo)
- `fecha_creacion` (Datetime)
- `creador_por` (INT, FK to Admin)

**ORGANIZADOR** (Extends USUARIO)
- `id_usuario` (PK/FK)
- `saldo_creditos` (INT)

**STAFF_QR** (Extends USUARIO)
- `id_usuario` (PK/FK)
- `id_evento` (INT, FK)

**STAFF_VENDEDOR** (Extends USUARIO)
- `id_usuario` (PK/FK)
- `id_organizador` (INT, FK)

**EVENTO**
- `id` (PK, INT)
- `id_organizador` (INT, FK)
- `nombre` (String)
- `descripcion` (String)
- `fecha_evento` (Date)
- `hora_evento` (Time)
- `lugar` (String)
- `imagen_portada_url` (String)
- `estado` (String - Enum `ESTADOS_EVENTO`: Borrador, Publicado, Cancelado)
- `url_publica` (String)

**TANDA**
- `id` (PK, INT)
- `id_evento` (INT, FK)
- `nombre` (String)
- `precio` (Double)
- `cupo_maximo` (INT)
- `cupo_disponible` (INT)
- `fecha_inicio_vigencia` (Datetime)
- `fecha_fin_vigencia` (Datetime)

**ENTRADA** (Ticket)
- `id` (PK, INT)
- `id_tanda` (INT, FK)
- `codigo_qr` (String, Unique)
- `nombre_comprador` (String)
- `email_comprador` (String)
- `estado` (String - Enum `ESTADOS_ENTRADA`: Pagada, Usada)
- `canal_venta` (String - Enum `CANALES_VENTA`: Online, Manual)
- `id_transaccion_pago` (INT, Nullable)
- `id_staff_vendedor` (INT, Nullable)
- `id_staff_qr_validador` (INT, Nullable)
- `fecha_compra` (Datetime)
- `fecha_uso` (Datetime)

**PAQUETE_CREDITO**
- `id` (PK, INT)
- `nombre` (String)
- `cantidad_creditos` (INT)
- `precio` (Double)
- `estado` (String - Enum `ESTADOS_PAQUETE`: Activo, Deshabilitado)

### Audit & Logs
**LOG_AUDITORIA**
- Must record administrative actions (Admin ID, action, affected entity, datetime).

---

## 4. Key Business Rules (Service Layer Rules)

1. **Ticket Purchase (Online) [CU-017]:**
   - Must verify `cupo_disponible` > 0 in the `TANDA`.
   - Must use pessimistic locking or database constraints to prevent overselling in high-concurrency scenarios.
   - Upon successful MercadoPago IPN webhook, generate a unique `codigo_qr`, change `ENTRADA` status to `Pagada`, and send email via SMTP.
2. **Event Creation/Publishing [CU-007, CU-010]:**
   - Publishing an event consumes credits. The service must verify `saldo_creditos` > required amount.
   - If insufficient credits, abort publishing and prompt credit purchase.
3. **Credit Purchases [CU-014]:**
   - Integrates with MercadoPago. Upon success, register in `TRANSACCION_CREDITO` and `MOVIMIENTO_CREDITO`, then update `saldo_creditos` in `ORGANIZADOR`.
4. **QR Validation (Staff_QR) [CU-018]:**
   - Must verify the `codigo_qr` exists and belongs to the correct `EVENTO`.
   - Must verify `estado` is NOT `Usada` (prevent duplicates).
   - If valid, update `estado` to `Usada`, set `fecha_uso`, and link `id_staff_qr_validador`.
5. **Manual Sales (Staff_Vendedor) [CU-019]:**
   - Bypasses MercadoPago. Direct deduction of `cupo_disponible`. Generates QR and marks as `Pagada`.

---

## 5. Development Guidelines (Claude Instructions)
- **Annotations:** Use standard Spring Boot annotations (`@RestController`, `@Service`, `@Repository`, `@Entity`).
- **DTOs:** Always use DTOs (Data Transfer Objects) for Requests and Responses to avoid exposing raw JPA entities.
- **Error Handling:** Implement a global `@ControllerAdvice` to return standardized JSON error responses (e.g., `{"error": "Tanda agotada", "status": 409}`).
- **Transactions:** Use `@Transactional` on service methods that modify data.