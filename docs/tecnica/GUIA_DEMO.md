# Guía de demo — AsistíAPP

Guion para mostrar el sistema funcionando de punta a punta, con un recorrido por cada rol. **No depende de datos precargados:** todo se crea durante la demo, así que sirve igual con una base vacía.

> Las credenciales de esta guía son **valores de desarrollo públicos**, válidos solo en una base local. Nunca escribir acá credenciales reales (MercadoPago, Gmail, Cloudinary, etc.).

## 1. Preparación (antes de empezar)

1. **Backend y frontend corriendo** (ver el [README](../../README.md) de la raíz): backend en `http://localhost:8080`, frontend en `http://localhost:5173`.
2. **Administrador:** con una base vacía el backend crea solo `admin@asistiapp.com` con contraseña `Admin123!`. Si tu base ya tenía un Administrador, esas credenciales no existen: usá las de ese usuario (`select email from usuarios where rol = 'Administrador';`).
3. **Pagos:** para mostrar la compra real hace falta configurar MercadoPago (credenciales de prueba y un usuario comprador de prueba). Está explicado paso a paso en [`backend/README.md`](../../backend/README.md), sección "Pagos con MercadoPago". Sin eso, el resto de la demo (todo menos pagar) funciona igual.
4. **Mails:** los mails (entradas, credenciales de staff, recuperar contraseña) salen por el SMTP configurado. Para verlos en la demo, ver la sección "Envío de mails" del mismo README (MailHog o una cuenta de Gmail de prueba).
5. **Imágenes:** subir la portada de un evento requiere Cloudinary configurado; sin eso el evento se puede crear igual, sin imagen.

## 2. Recorrido sugerido

Orden pensado para que cada paso deje lo que necesita el siguiente.

### Paso 1 — Administrador: dejar el sistema listo
Entrar en `http://localhost:5173/admin/login`.
- **Config:** ver y ajustar los parámetros globales: créditos de bienvenida, costo en créditos de publicar un evento y contacto de soporte (mail y WhatsApp). Desde ahí también se envían los **anuncios** a todos los usuarios. Cargar también un **paquete de créditos** (por ejemplo, 100 créditos) si no hay ninguno: sin paquetes un Organizador no puede comprar más créditos.
- **Dashboard:** métricas globales (se llenan a medida que avanza la demo; volver al final).

### Paso 2 — Organizador: crear y publicar un evento
Entrar en `http://localhost:5173/organizador/registro` y **crear una cuenta nueva** (recibe los créditos de bienvenida) o iniciar sesión en `/organizador/login`.
- **Créditos:** ver el saldo y el historial (el movimiento de bienvenida). Mostrar la compra de un paquete (abre MercadoPago).
- **Crear evento:** asistente de dos pasos. Paso 1: nombre, descripción, fecha, hora y lugar (con mapa; opcional una portada). Paso 2: una o más **tandas** (nombre, precio y cantidad de entradas) y **Publicar evento**. Publicar cuesta créditos, y cada entrada consume uno.
- **Dashboard:** el evento aparece como publicado, con su enlace público.
- **Staff:** crear un **Staff Vendedor** y un **Staff QR**, asignados a ese evento. Las credenciales iniciales llegan por mail; si no hay mail configurado, usar **"Resetear contraseña"** en la fila del staff: la pantalla muestra la contraseña nueva en el momento.

### Paso 3 — Comprador: comprar una entrada
Abrir `http://localhost:5173/` (no requiere cuenta).
- Entrar al evento publicado, elegir tanda y cantidad (hay un tope por persona), **Comprar entradas**, completar nombre y email y **Confirmar compra**.
- Se abre MercadoPago en una **pestaña nueva** (ver el README del backend para pagar con el usuario de prueba). La pestaña original queda en "Esperando tu pago" y pasa sola a "¡Pago aprobado!".
- Llega un mail con el QR; también se ve la entrada desde el enlace. **El enlace de la entrada es la entrada:** no hay que compartirlo.

### Paso 4 — Staff Vendedor: vender en la puerta
Entrar en `http://localhost:5173/staff/login` con el Staff Vendedor.
- Lleva directo al **punto de venta (POS)**: elegir la tanda, la cantidad, nombre y email del comprador y **Generar entrada**. Muestra el QR y el comprador recibe un mail con sus entradas.

### Paso 5 — Staff QR: validar en la puerta
Entrar en `http://localhost:5173/staff/login` con el Staff QR. Lleva al **escáner**.
- Con cámara, escanear el QR de una entrada. Sin cámara, tocar **"Ingresar código manualmente"** y pegar el código (empieza con `QR-`).
- Muestra "Ingreso válido" con el nombre del comprador. Volver a validar la misma entrada la **rechaza** (ya fue usada).

### Paso 6 — Volver al Organizador y al Administrador
- **Organizador:** el dashboard ya muestra ventas e ingresos; la **campanita** avisa de la primera venta (y de que se agotó una tanda, si pasó). Entrar al detalle del evento para ver las entradas vendidas y exportarlas.
- **Administrador:** **Usuarios** (suspender/reactivar), **Eventos** (editar o cancelar cualquiera), **Config** (enviar un anuncio a todos; les aparece en la campanita) y **Auditoría** (registro de las acciones administrativas).

## 3. Cosas útiles durante la demo

- **Tema claro/oscuro:** el botón con el sol/luna está en el encabezado de cada pantalla (el escáner no lo tiene a propósito).
- **Cancelar un evento** devuelve los créditos de las entradas sin vender y avisa por mail a los compradores.
- **Recuperar contraseña:** desde el login del Organizador ("¿Olvidaste tu contraseña?"); llega un mail con un enlace.
- **Documentación de la API:** `http://localhost:8080/swagger-ui/index.html`.

## 4. Si algo no anda

| Síntoma | Causa probable |
|---|---|
| Ninguna pantalla carga datos | El backend no está corriendo o el frontend apunta a otra URL (`VITE_API_BASE_URL`). |
| "Demasiadas solicitudes" al iniciar sesión | El login admite 5 por minuto desde la misma IP; esperar un minuto. |
| El pago no se confirma | Revisar que MercadoPago esté configurado y que se pagó con el usuario de prueba (ver README del backend). |
| No llegan mails | Revisar la configuración SMTP; en el log del backend queda el error. |
| No se puede subir la portada | Falta configurar Cloudinary. |
| Entrar como staff da 401 | Credenciales incorrectas: usar "Resetear contraseña" desde el panel del Organizador. |
