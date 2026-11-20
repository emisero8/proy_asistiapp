# Deploy de demostración (gratis)

Frontend en Vercel, backend en Render (Docker, plan free), base en Neon (Postgres free).
El backend se duerme sin tráfico: la primera visita tarda 30–60 s.

## 1. Base de datos (Neon)
Crear un proyecto y copiar la cadena de conexión. Para Spring hay que convertirla a JDBC:
`postgresql://usuario:clave@host/db?sslmode=require` → `DB_URL=jdbc:postgresql://host/db?sslmode=require`,
con `DB_USERNAME` y `DB_PASSWORD` aparte.
Las tablas las crea el backend solo (`ddl-auto: update`).

## 2. Backend (Render)
New → Web Service → repo → Root Directory `backend`, Runtime Docker, plan Free.
Variables de entorno (el perfil `prod` ya viene en el Dockerfile; si falta alguna obligatoria el backend no arranca y nombra las que faltan):

| Variable | Valor para la demo |
|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | de Neon (ver arriba) |
| `JWT_SECRET` | cadena aleatoria larga (`openssl rand -base64 48`) |
| `ADMIN_INICIAL_EMAIL`, `ADMIN_INICIAL_PASSWORD` | cuenta de administrador inicial |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_AUTH`, `SMTP_STARTTLS` | Gmail con contraseña de aplicación: `smtp.gmail.com`, `587`, `true`, `true` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | los de siempre |
| `MP_ACCESS_TOKEN` | token de **prueba** (la demo no mueve dinero real) |
| `MP_WEBHOOK_SECRET` | clave del webhook, modo de prueba |
| `MP_WEBHOOK_SECRET_PRODUCCION` | clave del webhook, modo productivo (el perfil `prod` la exige) |
| `MP_EXIGIR_CUENTA_VINCULADA` | `false` (cobra con la cuenta de la plataforma) |
| `MP_TOKEN_ENCRYPTION_KEY`, `MP_OAUTH_CLIENT_ID`, `MP_OAUTH_CLIENT_SECRET`, `MP_OAUTH_REDIRECT_URI` | los de la aplicación de Mercado Pago |
| `BACKEND_PUBLIC_URL` | `https://<servicio>.onrender.com` |
| `FRONTEND_BASE_URL`, `CORS_ALLOWED_ORIGINS` | `https://<proyecto>.vercel.app` (sin barra final) |

Después del primer deploy: cargar en el panel de Mercado Pago la URL del webhook
`https://<servicio>.onrender.com/...` (la misma ruta que hoy, en modo de prueba y en productivo).

## 3. Frontend (Vercel)
Root Directory `frontend`, Framework Vite. Variable `VITE_API_BASE_URL=https://<servicio>.onrender.com`.
El sitio necesita reescribir todas las rutas a `index.html` (SPA): ver `frontend/vercel.json`.

## 4. Datos de demo
Crear el organizador, el evento y el staff desde la propia app (o con el admin inicial).
