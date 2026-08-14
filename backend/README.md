# AsistíAPP — Backend

API REST del sistema de venta de entradas y control de acceso. Java 17 + Spring Boot 3 + PostgreSQL.

## Requisitos

- Java 17
- Maven (o usar el wrapper si se agrega más adelante)
- PostgreSQL corriendo localmente (o accesible por red)

## Levantar en local

1. Crear la base de datos:
   ```sql
   CREATE DATABASE asistiapp_db;
   ```
2. Variables de entorno (todas tienen default de desarrollo si no se setean — ver `application.yml`):

   | Variable         | Default (dev)                                   |
   |------------------|--------------------------------------------------|
   | `DB_URL`         | `jdbc:postgresql://localhost:5432/asistiapp_db`  |
   | `DB_USERNAME`    | `postgres`                                       |
   | `DB_PASSWORD`    | `1234`                                           |
   | `SMTP_HOST/PORT/USERNAME/PASSWORD` | ver `application.yml`, opcional en dev (el envío de mail solo loguea error si falla, nunca revierte una operación) |
   | `JWT_SECRET`     | valor de desarrollo hardcodeado — **nunca reusar en producción** |
   | `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:3000` |

3. Correr:
   ```
   mvn spring-boot:run
   ```
   Hibernate crea/actualiza el schema solo (`ddl-auto: update`) — no hace falta correr migraciones a mano en dev.

4. La API queda en `http://localhost:8080`.

## Primer usuario Administrador

No existe auto-registro para el rol Administrador (solo Organizador puede registrarse solo — `POST /auth/register`; Admin y Staff los da de alta un Administrador existente). Para no depender de insertar filas a mano, al arrancar fuera del perfil `prod` (`DevDataSeeder`) el backend crea automáticamente un Administrador si todavía no hay ninguno:

```
email:    admin@asistiapp.com
password: Admin123!
```

Cambiar esta contraseña (o eliminar ese usuario) antes de ir a producción — el seeder no corre si `SPRING_PROFILES_ACTIVE=prod`.

## Documentación de la API (Swagger / OpenAPI)

Con la app corriendo:

- Swagger UI (explorable, con botón "Authorize" para pegar el JWT): `http://localhost:8080/swagger-ui/index.html`
- Spec cruda OpenAPI: `http://localhost:8080/v3/api-docs`

Flujo típico para probar un endpoint protegido desde Swagger:
1. `POST /auth/login` (o `/auth/register` si es la primera vez) → copiar el `token` de la respuesta.
2. Botón **Authorize** (arriba a la derecha) → pegar el token (sin `Bearer `, Swagger lo agrega solo).
3. Probar cualquier endpoint protegido desde la UI.

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
