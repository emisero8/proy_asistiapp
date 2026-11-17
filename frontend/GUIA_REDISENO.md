# Guía para rediseñar el frontend sin romper nada

Para quien aplique el nuevo diseño sobre esta base. El comportamiento ya está resuelto y probado; el rediseño debería tocar **la apariencia**, no la lógica. Esta guía dice qué hay que respetar y cómo comprobar que no se rompió algo.

## 1. Punto de partida

- Base: la rama `feature-mercadopago` (tiene todo lo hecho hasta el 17/11). Crear la rama del rediseño a partir de ella (`git checkout feature-mercadopago && git pull && git checkout -b rediseno`), no de `master`: `master` está varios cambios atrás.
- Levantar el entorno: ver `frontend/README.md` y `backend/README.md`. El backend tiene que estar corriendo para que cualquier pantalla funcione.
- Estado de las verificaciones al arrancar: `npx tsc -b`, `npm run lint` y `npm run build` limpios; `npx vitest run` → 25 archivos, 235 tests; `npm run e2e` → 4 tests (ver `e2e/README.md`). Correr vitest desde **PowerShell**, no desde Git Bash.

## 2. Dónde está el estilo

- Tailwind v4 con tokens de color en `src/styles/theme.css` (`:root` para claro, `.dark` para oscuro; se exponen como `bg-background`, `text-foreground`, `bg-primary`, `bg-card`, `border-border`, etc.). Las pantallas usan esos tokens, **no** `dark:`: cambiar la paleta ahí cambia todo.
- El tema claro/oscuro lo maneja `src/lib/theme.tsx` (`ThemeProvider` agrega/saca la clase `dark` en `<html>`). El nuevo diseño tiene que seguir funcionando en los dos temas, o decidir explícitamente quedarse con uno (en ese caso avisar: hay que sacar `ThemeToggle`).
- Fuentes en `src/styles/fonts.css`.

## 3. Lo que NO hay que cambiar (es la lógica, no el diseño)

- `src/lib/` (api, auth, types, pago, tanda, calendar, etc.) y las llamadas a la API dentro de las páginas.
- `src/lib/types.ts` solo se toca si cambia el backend; hay una guardia (`types.contract.ts`) que avisa de desfasajes.
- Las reglas de negocio visibles: tandas cerradas no seleccionables, tope de entradas por persona, aviso de que "el enlace de la entrada es la entrada", etc. Están cubiertas por tests.

## 4. Textos y nombres accesibles que usan los tests

Los tests (vitest) y el e2e buscan los elementos **como los ve una persona**: por rol, nombre accesible, placeholder o texto, no por clases CSS. Se puede cambiar cualquier clase, estructura o librería de estilos; lo que hay que conservar es:

- **Textos de botones y títulos** (ej. "Comprar entradas", "Confirmar compra", "Generar entrada", "Publicar evento", "Siguiente: configurar tandas", "Ingresar", "Ingresar al panel", "¡Evento publicado!", "¡Entrada generada!", "Esperando tu pago").
- **`aria-label` y `title`** de botones de ícono (ej. "Mes anterior", "Mes siguiente", "Hora 21", "Minutos 00", "Cancelar <evento>", "Editar <evento>", "Cambiar a modo claro/oscuro").
- **Placeholders** de los campos (ej. "María García", "tu@mail.com", "AST-XXXXXX", "Festival de Jazz al Aire Libre").
- **Días del calendario**: cada día es un botón con nombre accesible "28 de junio de 2030" (lo arma `fechaLarga` en `src/lib/calendar.ts`).

Si el diseño nuevo exige cambiar un texto, **cambiarlo también en el test que lo usa** (si falla un test, el mensaje dice cuál). Cambiar un texto a propósito está bien; que falle un test por casualidad es la señal de que se rompió algo sin querer.

## 5. Reglas que ya se resolvieron y conviene mantener

- **Botón de tema:** no es flotante. Cada pantalla lo pone en su propio header con `<ThemeToggle />` (variantes `normal`, `sobre-imagen` y `esquina` solo para pantallas sin header: login y registro). El escáner QR no lo lleva a propósito. Detalle en `docs/proyecto/DECISIONES.md` (2026-11-17). Si el nuevo header cambia, mover el toggle ahí; no volver a hacerlo `fixed` global (ya causó dos bugs).
- **`useTheme` exige `ThemeProvider`:** todo test que renderice una página con `ThemeToggle` tiene que envolverla en `<ThemeProvider>`.
- **Mobile y desktop:** toda pantalla nueva se revisa en los dos (hay navegación inferior en mobile para Organizador y Admin).
- **Pickers de fecha y hora:** son componentes propios (`DatePicker`, `TimePicker`) con tests propios; no se reemplazan por `<input type="date">` sin reescribir esos tests.

## 6. Cómo comprobar que no se rompió nada

1. `cd frontend; npx tsc -b` y `npm run lint` — sin errores nuevos.
2. `npx vitest run` — debe seguir en 235 tests pasando (o más, si se agregan).
3. `npm run build`.
4. `npm run e2e` — recorre publicación, compra, venta del vendedor y escaneo en el navegador real. Antes de correrlo leer `e2e/README.md` (backend con SMTP apuntado a un puerto vacío, esperar un minuto entre corridas, limpiar con `e2e/limpiar.sql`).
5. Revisión visual en desktop y mobile, en claro y oscuro, de las pantallas tocadas. No hay tests visuales: lo que se ve no lo verifica ninguna suite.

## 7. Mapa rápido de pantallas

- Comprador: `pages/buyer/` — listado, todos los eventos, detalle, checkout, resultado del pago, ticket, "mi entrada".
- Organizador: `pages/organizador/` — login/registro/recuperar contraseña, dashboard, asistente de creación, edición, detalle del evento, créditos, staff, perfil. Layout en `OrganizadorLayout.tsx`.
- Staff: `pages/staff/` — login, POS (vendedor) y escáner QR (cámara; overlay oscuro propio).
- Admin: `pages/admin/` — login, dashboard, usuarios, eventos, configuración, auditoría. Layout en `AdminLayout.tsx`.
- Componentes compartidos: `src/components/` (pickers, mapa, campanita de notificaciones, diálogos, fondo de login).
