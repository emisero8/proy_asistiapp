# AsistíAPP — Guion de la demo en vivo

**Duración:** 11:00 de recorrido + 1:00 de margen = 12:00. **Dónde:** demo online. **Cuándo:** entre las diapositivas 14 y 15.

| | Dirección |
|---|---|
| Sitio | https://asistiapp-demo.vercel.app |
| Servidor | https://asistiapp-demo.onrender.com |

> **Este archivo no lleva contraseñas ni correos.** Anótenlos aparte (papel o gestor de contraseñas) y no los proyecten.

## 1. Idea del recorrido

Se usan **dos eventos**:

| Evento | Para qué | Por qué |
|---|---|---|
| **A. "Noche de Prueba"** | Se crea en vivo | Muestra la creación y publicación |
| **B. Evento preparado** (por ejemplo, "Fiesta de Egresados 2026") | Compra, ingreso, venta en puerta y métricas | El Staff QR y el Vendedor quedan asignados a **un** evento. Si se compra en A, el escáner la rechaza por ser de otro evento |

Frase para el cambio: *"El evento ya está publicado. Para seguir usamos uno que preparamos antes, con su personal asignado."*

## 2. Equipos y ventanas

Cada navegador guarda **una sola sesión**: dos roles en el mismo perfil se pisan.

| Quién | Dónde | Qué deja abierto |
|---|---|---|
| Organizador | PC, navegador principal (se proyecta) | `/organizador/dashboard` con sesión |
| Comprador | PC, ventana de incógnito (se proyecta) | Página principal |
| Administrador | PC, **otro navegador** o perfil distinto | `/admin/auditoria` con sesión |
| Staff QR | Celular 1 | `/staff/scanner` con sesión y cámara permitida |
| Staff Vendedor | Celular 2 (o un cuarto perfil en la PC si hay que proyectarlo) | `/staff/pos` con sesión |

Reparto sugerido: **una persona narra y otra maneja**, y las dos restantes tienen los celulares. Nombres: Narra `______` · PC `______` · Escáner `______` · Venta `______`.

## 3. Datos de la demo

Cargar y verificar **antes** (no dar por hecho que están).

| Dato | Valor sugerido | Control |
|---|---|---|
| Cuenta de organizador | Una cuenta de demo | Con **contacto cargado** en Mi perfil (sin eso no publica) |
| Créditos | Saldo para publicar y para al menos 20 entradas, más los ensayos | Mirar el saldo en Créditos |
| Evento B | "Fiesta de Egresados 2026", 12/12 23:00; tandas Preventa $100 × 30, General $200 × 100, Cortesía × 10 | Publicado, con portada y ubicación |
| Staff QR | Asignado al evento B | Probar el ingreso |
| Staff Vendedor | Asignado al evento B, tope 20 | Que le queden ventas disponibles |
| Entrada de reserva | Una entrada **ya paga** del evento B, **sin usar** | Enlace guardado y QR a mano (plan B) |
| Correo del comprador | Una casilla de demo que se pueda mostrar | Sin correos personales a la vista |
| Comprador de prueba de Mercado Pago | Usuario de prueba con saldo | Entra y muestra dinero disponible |
| Evento A | Nombre "Noche de Prueba", una fecha futura, 21:00, una dirección; tanda "General", $100, cupo 20 | Tener el texto listo para escribir |

**Ojo con los ensayos:** consumen cupo, créditos y el tope del vendedor, y hay un tope de entradas por persona según el correo. Dejen margen y no ensayen con la entrada de reserva.

## 4. Lista de control

### La semana anterior
- [ ] **Actualizar la demo online** con las correcciones del 27/11 (hoy no las tiene). Antes, correr en Neon las migraciones nuevas, si las hubiera.
- [ ] Cargar los datos de la sección 3.
- [ ] Ensayo completo con cronómetro, en la demo online.
- [ ] **Grabar un video** del recorrido completo (plan B principal) y guardarlo en la PC.
- [ ] Rotar las credenciales de prueba que se hayan compartido por chat y volver a probar un pago.

### El día, una hora antes
- [ ] Despertar el servidor: abrir el sitio y esperar a que carguen los eventos (30 a 60 segundos).
- [ ] Iniciar las sesiones de todos los roles. Hacerlo de a una: el ingreso admite **5 intentos por minuto** desde la misma red.
- [ ] Probar la cámara del escáner (sin escanear la entrada de reserva).
- [ ] En la ventana de incógnito, comprobar que el comprador de prueba puede entrar a Mercado Pago.
- [ ] Permitir ventanas emergentes en la PC y silenciar notificaciones y chats.
- [ ] Zoom del navegador al 125 %, modo claro, celulares con batería y sin bloqueo automático.
- [ ] Datos móviles listos para compartir internet si falla la red del instituto.

### Durante las diapositivas
- [ ] **En la diapositiva 10 y otra vez en la 13**, alguien que no esté hablando recarga la lista de eventos. El servidor se duerme tras un rato sin uso y la exposición dura más que eso.

## 5. Recorrido

| # | Paso | Dura | Acumulado |
|---|---|---|---|
| 1 | Organizador crea y publica | 3:00 | 3:00 |
| 2 | Comprador compra y paga | 3:00 | 6:00 |
| 3 | Staff QR: ingreso y rechazo | 1:30 | 7:30 |
| 4 | Venta en puerta | 1:30 | 9:00 |
| 5 | Métricas | 1:00 | 10:00 |
| 6 | Auditoría | 1:00 | 11:00 |

**Puntos de control:** al minuto **6** hay que estar escaneando; al minuto **9**, mirando métricas. Si vienen atrasados, salteen la portada y el mapa en el paso 1, y en el 6 muestren solo la lista.

### Paso 1 — Organizador crea y publica (3:00)

| Hacer | Decir |
|---|---|
| Mostrar el panel | "Este es el panel del organizador: sus eventos, ventas y créditos." |
| **Crear evento**: nombre, fecha, hora y lugar | "El asistente tiene dos pasos. Primero los datos; el lugar se puede ubicar en el mapa." |
| **Siguiente: configurar tandas**: nombre, precio y cupo | "Cada tanda tiene precio y cupo. Cada entrada consume un crédito: el contador muestra cuántos quedan." |
| **Publicar evento** | "Publicar también cuesta créditos. Así gana la plataforma: no cobra comisión por venta." |
| En "¡Evento publicado!", señalar créditos consumidos y saldo | "El sistema muestra lo que se consumió." |
| En incógnito, abrir la lista de eventos | "Ya aparece en la página pública." |

### Paso 2 — Comprador compra y paga (3:00)

Todo en la ventana de incógnito.

| Hacer | Decir |
|---|---|
| Abrir el evento B | "El comprador no se registra." |
| Elegir **Preventa**, cantidad 1, **Comprar entradas** | "Elige tanda y cantidad; ve cuántas quedan." |
| Completar nombre, correo y confirmación; aceptar términos; **Pagar** | "Se confirma el correo porque ahí llega la entrada." |
| En Mercado Pago: **Ingresar con mi cuenta** → comprador de prueba → **Dinero disponible** → pagar. **Nunca** como invitado con tarjeta | "Es un pago de prueba: no se mueve dinero. Los datos de pago los maneja Mercado Pago, no nosotros." |
| Volver al sitio (solo o con el botón) y esperar **¡Pago aprobado!** | "No creemos en la redirección: el servidor confirma el pago consultando a Mercado Pago, y recién ahí crea la entrada y descuenta el cupo." |
| **Ver QR** | "Esta es la entrada. El mismo QR llega por correo." |
| Mostrar el correo si ya llegó (no esperar) | "El enlace es la entrada: por eso se avisa que no se comparta." |

**Límite de espera:** si a los 60 segundos no se aprueba, pasen a la entrada de reserva y revisen el pago más tarde.

### Paso 3 — Staff QR: ingreso y rechazo (1:30)

| Hacer | Decir |
|---|---|
| Mostrar el celular en el escáner | "El personal usa su propio teléfono, desde el navegador." |
| Escanear el QR de la pantalla | "Pantalla verde: ingreso válido, con el nombre y la tanda." |
| **Apartar el celular** antes de que se cierre el resultado | (Si sigue apuntando, vuelve a escanear solo.) |
| Escanear **otra vez** el mismo QR | "Pantalla roja: ya fue utilizada, y dice cuándo. Una entrada, un ingreso." |

Si la cámara no anda: **Ingresar código manualmente**, pegar el código que empieza con `QR-` y **Validar**.

### Paso 4 — Venta en puerta (1:30)

| Hacer | Decir |
|---|---|
| Mostrar el punto de venta y **Te quedan para vender** | "El vendedor solo vende el evento asignado y hasta su tope." |
| Elegir **General**, 1, titular y correo | "Cobra en la puerta, por fuera del sistema." |
| **Generar entrada** | "Se genera al momento, con su QR; se puede mandar el enlace y llega por correo." |
| Señalar que bajó el tope | "Queda registrado quién la vendió." |

### Paso 5 — Métricas (1:00)

| Hacer | Decir |
|---|---|
| Organizador → evento B | "Ventas por tanda, ingresos, entradas vendidas y validadas en puerta." |
| Señalar la venta online, la de puerta y el ingreso recién hechos | "Se actualiza cada 20 segundos." |
| Mostrar la lista de compradores y el botón **Excel** | "Puede exportar las entradas para trabajarlas aparte." |

### Paso 6 — Auditoría (1:00)

| Hacer | Decir |
|---|---|
| Navegador del administrador → **Auditoría** (recargar) | "El administrador ve quién hizo qué y cuándo." |
| Señalar publicación, venta manual, ingreso validado e ingreso rechazado | "Ahí está todo lo que acabamos de hacer, incluido el segundo escaneo rechazado." |
| Filtrar por rol **Staff QR** o por acción | "Se puede filtrar por persona, acción y fecha." |

**Cierre:** *"Eso es el circuito completo: publicar, comprar, ingresar y controlar. Volvemos a la presentación para contar cómo se protege la entrada."* → diapositiva 15.

## 6. Plan B

Regla: **no depurar en vivo.** Si algo no responde en 30 segundos, pasen al plan B y sigan narrando.

| Falla | Qué hacer | Qué decir |
|---|---|---|
| El servidor tarda en responder | Esperar hasta un minuto mientras explican la demo online | "Usamos un alojamiento gratuito que se duerme sin uso." |
| Mercado Pago da error o pide verificación | Abrir el enlace de la **entrada de reserva** y seguir desde el paso 3 | "El entorno de prueba de Mercado Pago falló; seguimos con una entrada comprada antes." |
| El pago no se aprueba | Lo mismo; revisar después | "La orden queda pendiente y el sistema la vuelve a consultar." |
| "Tu navegador bloqueó la ventana de pago" | Permitir ventanas emergentes y reintentar | — |
| No llega el correo | No esperar: usar **Ver QR** | "El correo es un canal; la entrada ya está en el sitio." |
| La cámara no funciona | Código manual | "Está previsto para cuando la cámara falla." |
| "Demasiadas solicitudes" al ingresar | Esperar un minuto o usar otro equipo con la sesión abierta | "Es la protección contra intentos repetidos." |
| Un staff no puede ingresar | Organizador → Staff → **Contraseña**: muestra una nueva | — |
| "Pertenece a un evento diferente" | Se escaneó una entrada del evento A: usar la del B | "El personal solo valida su evento." |
| La publicación falla | Leer el mensaje (contacto o créditos); si no se resuelve, usar el evento B | — |
| Se cae internet del lugar | Compartir datos del celular | — |
| Se cae todo | **Reproducir el video grabado** y narrarlo | "Les mostramos el recorrido grabado sobre la misma demo." |
| Se cae todo y no hay video | **Diapositivas 19 a 24** (capturas con datos inventados, una por paso) y volver a la 15 | "Les mostramos el recorrido en capturas." |
| El proyector falla | Mostrar desde la PC y los celulares a la mesa | — |

## 7. Después de la defensa

- [ ] Cancelar el evento "Noche de Prueba" (y los de los ensayos) desde el panel.
- [ ] Cerrar las sesiones en los celulares y equipos prestados.
