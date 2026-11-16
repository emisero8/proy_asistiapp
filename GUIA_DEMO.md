# Guía de demo — AsistíAPP

> ⚠️ Las credenciales de este archivo son de **cuentas demo del entorno local** (contraseña pública de desarrollo): no sirven fuera de una base de datos local. **Nunca agregar acá credenciales reales** (MercadoPago, Gmail, Cloudinary, etc.).
>
> 📌 **Parte de esta guía quedó desactualizada** (escrita antes de MercadoPago real): la compra ya no es simulada (hoy abre el checkout de MercadoPago; ver `CLAUDE.md`, "Integraciones externas"), los datos sembrados que menciona (evento "Recital Demo", entradas, QR) pueden no existir en tu base, y la cuenta `staffvendedor@demo.com` dio 401 con la contraseña de la tabla el 12/11. Para el estado real del proyecto, ver `CONTINUAR.md`.

## Usuarios de prueba

Todos con la misma contraseña para que sea fácil recordarla.

| Rol | URL de login | Email | Contraseña |
|---|---|---|---|
| **Comprador** | http://localhost:5173/ | *(no requiere login)* | — |
| **Organizador** | http://localhost:5173/organizador/login | `organizador@demo.com` | `Demo1234!` |
| **Staff QR** (escanea entradas) | http://localhost:5173/staff/login | `staffqr@demo.com` | `Demo1234!` |
| **Staff Vendedor** (POS) | http://localhost:5173/staff/login | `staffvendedor@demo.com` | `Demo1234!` |
| **Administrador** | http://localhost:5173/admin/login | `admin@demo.com` | `Demo1234!` |

## Datos ya sembrados

- **Evento publicado**: "Recital Demo AsistiAPP" — $5.000 la entrada General, 100 cupos. El Staff QR y el Staff Vendedor demo ya están asignados a este evento/organizador.
- **2 entradas reales compradas** (para que el Staff QR tenga algo para escanear):
  ```
  QR-FA7249E355A84DA6A1357BA08C15028B   (Comprador Demo 1)
  QR-3F6926BC41E94C729D7CE0A8D1D004DF   (Comprador Demo 2)
  ```

## Flujo end-to-end sugerido, por rol

### 1. Comprador (http://localhost:5173/) — sin login
Vas a ver "Recital Demo AsistiAPP" en el listado → entrá → elegí cantidad → completá nombre/email → "Confirmar compra" → te muestra el QR real de la entrada. Podés generar más entradas de prueba así.

### 2. Organizador (`organizador@demo.com` / `Demo1234!`)
- **Dashboard**: vas a ver el evento con las 2 entradas ya vendidas y $10.000 de ingresos.
- **Crear**: probá crear un evento nuevo desde cero (wizard de 2 pasos: datos → tandas → publicar).
- **Créditos**: historial (créditos de bienvenida, consumo por publicar) y compra de más créditos (simulado).
- **Staff**: ahí ya vas a ver a "Staff QR Demo" y "Staff Vendedor Demo" — probá agregar uno nuevo.

### 3. Staff Vendedor (`staffvendedor@demo.com` / `Demo1234!`) → lleva directo al POS
Elegí la tanda "General", cantidad, nombre y email de un comprador ficticio → "Generar entrada" → te muestra el QR real. Copiá ese código QR para usarlo en el paso siguiente.

### 4. Staff QR (`staffqr@demo.com` / `Demo1234!`) → lleva directo al scanner
- Si tu compu tiene cámara, el navegador pide permiso y podés intentar escanear un QR real (por ejemplo mostrando el QR de una entrada desde el celular).
- Más simple: tocá **"Ingresar código manualmente"** y pegá uno de los códigos de arriba (o el que generaste en el POS) → vas a ver el overlay verde "Ingreso válido" con el nombre real del comprador. Si lo volvés a escanear, te va a decir que ya fue usado (rechazo real, no simulado).

### 5. Administrador (`admin@demo.com` / `Demo1234!`)
- **Dashboard**: métricas globales reales de toda la plataforma.
- **Usuarios**: vas a ver a todos los usuarios de esta tabla — probá suspender/reactivar o cambiar el rol de alguno.
- **Eventos**: gestión global — probá editar el evento demo o cancelarlo.
- **Config**: paquetes de crédito y los 2 parámetros globales (créditos de bienvenida, costo de publicación).

## Cómo desplegarlo manualmente (local)

### 1. Backend
```bash
cd backend
mvn spring-boot:run
```
Requiere Java 17 y PostgreSQL corriendo con una base `asistiapp_db` (el servicio `postgresql-x64-18` de Windows). Variables de entorno con defaults de desarrollo — no hace falta setear nada salvo que quieras cambiar algo (ver `backend/README.md`). Queda en `http://localhost:8080`.

### 2. Frontend
```bash
cd frontend
npm install        # solo la primera vez, o si cambió package.json
npm run dev
```
Queda en `http://localhost:5173`. Necesita el backend corriendo para hacer cualquier cosa más allá del login.

### 3. Para cortar todo
`Ctrl+C` en cada terminal. Los datos quedan guardados en Postgres para la próxima vez — no hace falta re-crear los usuarios de demo salvo que limpies la base.

### Otros accesos útiles con el backend corriendo
- Swagger UI: `http://localhost:8080/swagger-ui/index.html`
- Spec OpenAPI cruda: `http://localhost:8080/v3/api-docs`
