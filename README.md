# AsistíAPP

Plataforma de **venta de entradas y control de acceso** para organizadores independientes de eventos en Argentina. Los compradores sacan su entrada digital con un QR (pagando con MercadoPago), y el personal del evento la valida en la puerta con el celular.

## Qué hace, por rol

| Rol | Qué puede hacer |
|---|---|
| **Comprador** | Ver los eventos publicados, comprar entradas por MercadoPago (sin crear cuenta), recibir un mail con el QR y ver su entrada. |
| **Organizador** | Registrarse, crear y publicar eventos con tandas de entradas (usa créditos), comprar créditos, administrar a su staff, ver métricas de ventas y recibir avisos en la campanita. |
| **Staff Vendedor** | Vender entradas en la puerta desde el punto de venta (POS); el comprador recibe el mail con sus entradas. |
| **Staff QR** | Validar entradas escaneando el QR (o ingresando el código a mano). |
| **Administrador** | Gestionar usuarios y eventos, configurar el sistema (precios en créditos, paquetes, soporte), publicar anuncios y consultar la auditoría. |

## Tecnologías

- **Backend:** Java 17, Spring Boot 3.3, Spring Security con JWT, PostgreSQL, Hibernate/JPA. Mails por SMTP, imágenes en Cloudinary, pagos con MercadoPago Checkout Pro.
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, react-router. Tema claro y oscuro.
- **Pruebas:** JUnit y Mockito en el backend (más tests de integración con H2 y GreenMail); Vitest y Testing Library en el frontend; Playwright para las pruebas de punta a punta.

## Estructura del repositorio

```
backend/     API REST (Spring Boot). Ver backend/README.md
frontend/    Aplicación web (React). Ver frontend/README.md
docs/        Documentación (entrega, técnica y de proyecto). Ver docs/README.md
docker-compose.yml   MailHog, un servidor de mail local para desarrollo
.github/     Pruebas automáticas en cada push
```

## Cómo levantarlo en local

Necesitás Java 17, Maven, Node.js 22+ y PostgreSQL.

1. **Base de datos:** crear una base vacía llamada `asistiapp_db`.
2. **Backend:** `cd backend` y `mvn spring-boot:run`. Queda en `http://localhost:8080`. Las variables de entorno (base, mails, MercadoPago, Cloudinary) tienen valores por defecto de desarrollo; el detalle está en [`backend/README.md`](backend/README.md). Con una base vacía crea solo un Administrador de desarrollo.
3. **Frontend:** `cd frontend`, `npm install` y `npm run dev`. Queda en `http://localhost:5173`. Ver [`frontend/README.md`](frontend/README.md).
4. **Mails en desarrollo** (opcional): `docker compose up -d` levanta MailHog; los mails se ven en `http://localhost:8025`.

> Los valores por defecto (contraseñas, claves) son **públicos y solo sirven para desarrollo**. No usarlos en un entorno real.

## Pruebas

| Qué | Comando | Dónde |
|---|---|---|
| Backend | `mvn test` | `backend/` |
| Frontend (unitarias y de pantallas) | `npx vitest run` | `frontend/` |
| Tipos y estilo | `npx tsc -b` y `npm run lint` | `frontend/` |
| Punta a punta (navegador real) | `npm run e2e` | `frontend/` — antes leer [`frontend/e2e/README.md`](frontend/e2e/README.md) |

## Documentación

Todo está en [`docs/`](docs/README.md): los entregables de la materia, la documentación técnica (API, diseño, seguridad, guía de demo) y el registro del proyecto (decisiones, plan de mejoras y estado actual).
