# AsistíAPP — Design System

> Fuente de verdad del lenguaje visual del frontend (`frontend/`). Los valores viven en
> `frontend/src/styles/theme.css`; este documento explica **qué** usar y **cuándo**.
> Última revisión: Fase 13.1 (2026-11-16). Las decisiones que lo cambiaron están en `DECISIONES.md`.

## Principios

1. **Jerarquía antes que decoración.** Un elemento se diferencia por tamaño, peso, contraste y superficie — no por sumarle un color, una sombra o un degradé.
2. **Cada elemento tiene una razón para estar.** Si un título ya lo dice, no se repite en la descripción; si una acción es obvia, no lleva etiqueta extra.
3. **Todo lo interactivo se nota y responde:** cursor, hover, foco con teclado, press y deshabilitado coherentes en toda la app.
4. **Accesible por defecto:** contraste ≥ 4,5:1 para texto en ambos temas, foco visible, `prefers-reduced-motion` respetado, controles con nombre accesible.
5. **Una sola interpretación por componente.** Un botón primario, un input o un badge se ven igual en todas las pantallas.

La app es real (no una demo en marcos de dispositivo): se usa en cualquier navegador, en mobile, tablet y desktop, en modo claro y oscuro. Audiencias: Comprador (público, sin cuenta), Organizador, Staff (QR y Vendedor) y Administrador.

---

## Color

Todos los colores son **tokens con valor por modo** (claro en `:root`, oscuro en `.dark`). El código usa siempre la utilidad del token (`bg-primary`, `text-success`, `border-border-strong`…) **sin condicionales `dark:`** — el token resuelve solo. Nunca hex/rgb literal en componentes, salvo la excepción documentada más abajo.

### Marca

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
Tres colores de marca con **roles fijos**: combinan (mismo peso, misma saturación contenida) pero se distinguen por tono — azul (225°), verde azulado (175°) y terracota (15°).

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `primary` | `#2b3c64` | `#9cadd3` | **Lo que se toca.** CTA principal, links, navegación activa, foco, selección, precios. |
| `primary-foreground` | `#ffffff` | `#0d1a2b` | Texto/ícono sobre relleno `primary`. |
| `secondary` | `#1d6b66` | `#7cc7bd` | **Identidad de apoyo, nunca interactiva.** Íconos de secciones, palabras destacadas de un título, eyebrows, "Próximo", 2.ª serie de gráficos, la métrica a mirar primero (`StatCard emphasis="highlight"`). |
| `secondary-foreground` | `#ffffff` | `#0b2522` | Texto sobre relleno `secondary`. |
| `accent` | `#9c4425` | `#f29a76` | **Atención puntual.** Badge "Hoy", el punto del hero, detalles chicos. 3.ª serie de gráficos. |
| `accent-foreground` | `#ffffff` | `#2a0f05` | Texto sobre relleno `accent`. |
| `highlight` | = `secondary` | = `secondary` | Alias por compatibilidad (`Badge tone="highlight"`, `StatCard`). |

Contraste como texto: entre 5,0:1 y 9,8:1 sobre `background` y `card` en los dos modos.

**Reglas:**
- Un botón o link es **siempre** `primary`. `secondary` y `accent` nunca indican que algo se puede tocar.
- Ninguno de los tres se usa para estados (para eso están los semánticos), fondos grandes ni degradés.
- `accent`: **como mucho uno o dos elementos por vista.** Si aparece en todos lados deja de llamar la atención.
- `secondary` en suave: `bg-secondary/12 text-secondary` (tiles de íconos), igual que los semánticos.
- Badges: `tone="highlight"` (secundario, "Próximo") y `tone="accent"` ("Hoy").

### Semánticos

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `success` | `#215f3a` | `#6fcf97` | Válido, pagada, activo, crédito acreditado. |
| `warning` | `#7a4600` | `#f0b44c` | Borrador, pendiente, "ya usada", cerca del límite. |
| `destructive` | `#772238` | `#e5788a` | Error, cancelar, eliminar, suspendido. |
| `info` | = `primary` | = `primary` | Avisos informativos (sin agregar un tono nuevo). |

Cada uno tiene su `-foreground` para cuando se usa como **relleno sólido** (`bg-success text-success-foreground`). Patrones:
- **Texto/ícono:** `text-success`.
- **Fondo suave (badges, avisos):** `bg-success/12 text-success` (+ `border-success/25` si lleva borde).
- **Relleno sólido:** `bg-destructive text-destructive-foreground`. **Nunca `text-white`** sobre un relleno semántico: en modo oscuro los rellenos son pasteles y el texto va oscuro.

> Las clases literales de Tailwind (`text-emerald-400`, `bg-red-400/15`, `text-amber-400`, `text-violet-400`…) **ya no se usan** para estados: no se adaptan al tema y en modo claro daban 1,6–1,9:1 de contraste. Desde 13.9 no queda ninguna en la app. **Excepciones:** el Scanner y el panel de marca de los accesos (siempre oscuros, ver abajo y "Scanner del Staff QR").

### Superficies y neutros

De la más baja a la más alta — cada nivel tiene que distinguirse del anterior:

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `surface-sunken` | `#f5efe2` | `#10182a` | "Hundido" **dentro** de una tarjeta: encabezado de tabla, input sobre card, código copiable. |
| `background` | `#ece4d1` | `#0a0f1e` | Fondo de pantalla. |
| `card` | `#fffdf8` | `#161f33` | Tarjetas, paneles, inputs sobre el fondo. |
| `popover` | `#fffdf8` | `#1c273d` | Menús, popovers, calendario. |
| `muted` | `#e2d7bf` | `#253247` | Chips inactivos, botones neutros, skeletons. |
| `foreground` | `#1c1a15` | `#f8fafc` | Texto principal. |
| `muted-foreground` | `#5c574b` | `#9aa8bd` | Texto secundario, labels, placeholders. |
| `border` | `rgba(51,42,24,.15)` | `rgba(238,242,250,.14)` | Bordes de tarjetas, separadores. |
| `border-strong` | `rgba(51,42,24,.30)` | `rgba(238,242,250,.26)` | Bordes de inputs, separadores con peso. |
| `ring` | = `primary` | = `primary` | Anillo de foco. |

**Regla de contraste de controles:** un input o un chip **sobre `background`** usa `bg-card` + borde (en modo claro `bg-muted` sobre `background` casi no se distingue). Sobre una `card`, el input puede ir en `bg-surface-sunken`.

### Gráficos (`recharts`)

`--chart-1` (= primary), `--chart-2` (= secondary), `--chart-3` (= accent), `--chart-4` (neutro), `--chart-5` (= destructive). Los `fill`/`contentStyle` de recharts son estilos inline de JS: se pasan como `"var(--chart-1)"`, `"var(--popover)"`, nunca hex.

### Excepción documentada

El panel de marca de las pantallas de acceso de Organizador (ingreso, registro, recupero) es **siempre oscuro, independiente del tema**: usa hex literal (`#09090b` + acentos `#9cadd3`) a propósito, centralizado en `components/AuthLayout.tsx` (constantes `MARCA_FONDO`/`MARCA_ACENTO`); las pantallas destacan una palabra del título con `<MarcaAcento>`, nunca con el hex.

---

## Modo claro / oscuro

- **Mecanismo:** clase `.dark` en `<html>` (`src/lib/theme.tsx`: `ThemeProvider` + `useTheme()`); Tailwind la usa vía `@custom-variant dark`.
- **Persistencia:** `localStorage` (`asistiapp_theme`). Default: oscuro.
- **Regla:** toda pantalla nueva se verifica en los dos modos. Si un color se lee bien solo en uno, el token está mal elegido — se corrige el token, no se agrega `dark:` en la pantalla.
- **Toast (`sonner`):** ya toma `var(--card)`/`var(--border)`/`var(--foreground)` en `App.tsx`.

---

## Tipografía

| Familia | Clase | Uso |
|---|---|---|
| **Inter** (400–800) | `font-sans` (default) | Toda la UI. |
| **Anybody** (700–900) | `font-display` | Solo titulares de marketing en mayúsculas (hero de la Home, encabezados de sección del catálogo). Nunca texto de UI. |
| **JetBrains Mono** (500–700) | `font-mono` | Códigos de ticket, IDs, datos técnicos. |

### Escala

| Rol | Clases | Notas |
|---|---|---|
| Display (marketing) | `font-display uppercase font-extrabold text-4xl sm:text-5xl lg:text-6xl` | Solo Home / landing. Sin degradé de texto. |
| Título de página | `text-xl lg:text-2xl font-extrabold` | Uno por pantalla, como `<h1>`. |
| Título de sección | `text-base lg:text-lg font-bold` | `<h2>`. |
| Título de tarjeta | `text-sm font-semibold` | `<h3>`. |
| Cuerpo | `text-sm` | Párrafos, celdas, inputs. |
| Secundario / meta | `text-xs text-muted-foreground` | Fechas, ayudas, subtítulos. |
| Overline / caption | `text-2xs font-semibold uppercase tracking-[0.12em] text-muted-foreground` | **Piso: 11 px** (`text-2xs`). |
| Precio | `font-bold text-accent` (listado) / `font-extrabold text-foreground` (totales) | |
| Código | `font-mono tracking-wider` | |

- **No usar `text-[9px]` ni `text-[10px]`** (ilegibles, sobre todo en mayúsculas con tracking). `text-2xs` (11 px) es el mínimo (desde 13.9 no queda ningún `text-[Npx]` en la app).
- **Pesos con intención:** `extrabold` solo para el título de página y cifras protagonistas; `bold` secciones; `semibold` títulos de tarjeta y botones; el resto `normal`/`medium`. Si todo es `extrabold`, nada resalta.
- La capa base de `theme.css` ya da a `h1–h4` el tamaño y peso de esta escala (útil para componentes nuevos); las clases explícitas la pisan.

---

## Espaciado y layout

- Grilla base de 4 px (Tailwind).
- Padding de pantalla: `px-4` mobile, `lg:px-8` desktop.
- Separación entre secciones: `space-y-6` (o `gap-6`); dentro de una tarjeta, `space-y-3`/`space-y-4`.
- Padding de tarjeta: `p-4` (compacta) / `p-5` (estándar).
- **Responsive real:** toda pantalla define `md:`/`lg:` desde el principio. Layout establecido: sidebar fija de **208 px** (`w-52`) en desktop para Organizador y Admin, barra inferior en mobile; pantallas de detalle/checkout en dos columnas con panel sticky en desktop.
- **Ancho de contenido:** formularios `max-w-2xl`, paneles con métricas/tablas `max-w-6xl`, listados públicos `max-w-[1400px]`. Entre `md` y `lg` (tablet) el contenido usa el ancho disponible — nunca `max-w-md` con el sidebar ya visible.
- Al pie de un contenedor con barra fija inferior, dejar espacio (`pb-32 lg:pb-0`) para que el contenido no quede tapado.

### Estructuras de pantalla

| Estructura | Dónde | Qué resuelve |
|---|---|---|
| `AppShell` (`components/AppShell.tsx`) | Organizador y Admin (vía `OrganizadorLayout`/`AdminLayout`, que solo lo configuran) | Sidebar de 208 px en desktop (logo + campanita, navegación, usuario, tema, "Salir"); barra superior + pestañas inferiores en mobile; link "Saltar al contenido". |
| `AuthLayout` + `AuthHeader` (`components/AuthLayout.tsx`) | Ingreso de Organizador/Admin/Staff, registro, recupero | Header con logo y tema, tarjeta sobre el fondo de marca, panel de marca oscuro opcional (desktop). |
| `PublicHeader` (`components/PublicHeader.tsx`) | `/eventos` y flujo de compra: detalle, checkout, resultado del pago, mi entrada (la Home tiene su propio header, transparente sobre el hero) | Header sticky: "Volver" (atrás si hay historial en la app, si no a `/eventos`), logo, link a Eventos y tema. |
| `AnimatedOutlet` (`components/AnimatedOutlet.tsx`) | Dentro de cada layout | Transición de página, `Suspense` y `RouteErrorBoundary` por ruta: si una pantalla falla, el shell sigue funcionando. |

- **Nada flota sobre el contenido.** Tema, campanita y "Salir" viven en el header de cada estructura
- **Compra en dos columnas:** en desktop, contenido a la izquierda y panel de compra/resumen sticky a la derecha (`lg:grid-cols-[minmax(0,1fr)_360px]`); en mobile, la misma acción en `StickyActionBar` y el resumen visible arriba del formulario.
- **Peso del bundle inicial:** los módulos que se cargan siempre (`App.tsx`, `ThemeToggle`, `RouteErrorBoundary`, `AnimatedOutlet`) importan componentes desde su archivo (`./ui/Button`), **no** desde el barrel `components/ui` — el barrel arrastraría todos los componentes a la carga inicial. Las pantallas (lazy) sí usan el barrel.
- **Errores de render:** `RouteErrorBoundary` evita la pantalla en blanco. Un chunk que no carga (versión nueva desplegada) recarga sola una vez y, si persiste, ofrece "Recargar".

## Radios

Escala monotónica (antes `rounded-xl` y `rounded-2xl` valían lo mismo):

| Clase | Valor | Uso |
|---|---|---|
| `rounded-md` | 8 px | Miniaturas, checkbox. |
| `rounded-lg` | 10 px | Chips dentro de tablas, ítems de menú, botones chicos de fila. |
| `rounded-xl` | 12 px | **Controles:** inputs, botones, filas seleccionables, avisos. |
| `rounded-2xl` | 16 px | **Tarjetas** y paneles. |
| `rounded-3xl` | 24 px | Modales grandes, la entrada (ticket), hero de saldo. |
| `rounded-full` | — | Pills, avatares, botones de ícono redondos. |

## Elevación

Las tarjetas **no llevan sombra por defecto**: el borde y el contraste de superficie alcanzan. Solo lo que flota:

| Clase | Uso |
|---|---|
| `shadow-raised` | Hover de tarjetas clickeables, botones flotantes. |
| `shadow-overlay` | Menús, popovers, calendario, campanita. |
| `shadow-modal` | Diálogos. |

**Sin sombras de color** (`shadow-primary/30` y similares, "glow") ni sombras ad hoc (`shadow-xl shadow-black/40`): solo las tres elevaciones de arriba.

## Movimiento

| Token | Valor | Uso |
|---|---|---|
| `--duration-fast` | 120 ms | Hover: color, borde, fondo. |
| `--duration-base` | 180 ms | Popovers, press, toggles. |
| `--duration-slow` | 260 ms | Overlays, entrada de contenido. |
| `ease-standard` | `cubic-bezier(.2,0,0,1)` | Transiciones de estado. |
| `ease-emphasized` | `cubic-bezier(.16,1,.3,1)` | Entradas (aparecer). |

Uso en clases: `transition-colors duration-(--duration-fast) ease-standard`.

- **Hover = cambio de color/borde/fondo.** Nada de `hover:scale-*` en chips, botones chicos ni tarjetas.
- **Press:** `active:scale-[0.98]` solo en el CTA principal de la pantalla.
- **Animaciones disponibles** (`globals.css`): `animate-fade-in-up` (280 ms, 8 px), `animate-fade-in` (200 ms), `animate-scale-in` (160 ms, menús/popovers), `.page-transition` (160 ms, solo opacidad), `.marquee-track`.
- **Transición de página:** la aplica `<AnimatedOutlet>` (`src/components/AnimatedOutlet.tsx`) adentro de cada layout — se remonta solo el contenido de la ruta; sidebar, campanita y barras quedan montados. Es solo opacidad y sin `fill-mode` para no romper los `position: fixed` de adentro.
- **`prefers-reduced-motion`:** resuelto **globalmente** en `theme.css` (animaciones y transiciones instantáneas, sin retrasos escalonados; los spinners siguen girando porque son feedback). En JS, lo que anima por código (carrusel automático, `scrollIntoView({ behavior: "smooth" })`) tiene que consultar `matchMedia("(prefers-reduced-motion: reduce)")` — se aplica al migrar cada pantalla.

---

## Estados de interacción

Resueltos en la capa base de `theme.css` — **no se repiten clase por clase**:

| Estado | Regla |
|---|---|
| **Cursor** | `pointer` en todo lo interactivo real (`button`, `a[href]`, `select`, checkbox/radio, `label[for]`, `[role=button|switch|tab|menuitem|option|checkbox|radio]`); `not-allowed` en `:disabled`/`[aria-disabled=true]`. Texto e inputs de texto mantienen su cursor. **No** agregar `cursor-pointer` a mano salvo un caso no cubierto; **nunca** a elementos que no son interactivos. |
| **Foco** | `:focus-visible` → anillo de 2 px `ring` con 2 px de separación, solo con teclado. Inputs pueden usar su propio anillo (`focus:ring-2 focus:ring-primary/40`). **Prohibido** `focus:outline-none` sin un reemplazo visible. |
| **Hover** | Cambio de color/fondo/borde en `--duration-fast`. Botón primario: `hover:bg-primary/90`. Neutros: `hover:bg-muted`. Fila/tarjeta clickeable: `hover:border-primary/40` (+ `hover:shadow-raised` opcional). |
| **Active** | `active:scale-[0.98]` solo en el CTA principal. |
| **Disabled** | `disabled:opacity-50` (el cursor ya lo pone la base). Si el motivo no es obvio, mostrarlo en texto cerca del control — un botón gris sin explicación no es un estado útil. |
| **Loading** | El control que dispara la acción muestra su propio estado (texto "Guardando…" o spinner + `aria-busy`) y queda deshabilitado; nunca dos envíos. |

## Estados de UI (carga, vacío, error, éxito)

- **Carga inicial:** skeleton con la forma del contenido real (`bg-muted animate-pulse rounded-*`), no un spinner de pantalla completa ni el texto "Cargando…".
- **Vacío:** ícono en cuadro + título + una línea de ayuda + **la acción que lo resuelve** (ej. "Crear evento"). Sin emojis.
- **Error de carga:** mensaje claro + botón **"Reintentar"** (y "Volver" si la pantalla depende de un parámetro). Un texto rojo suelto no es un estado de error.
- **Resultado de una acción (mutación):** toast (`sonner`) — `toast.success` / `toast.error`. **No** duplicar con un mensaje inline.
- **Error de un campo:** inline debajo del campo, `text-xs text-destructive`, conectado con `aria-describedby` + `aria-invalid`.

---

## Component Patterns

> **Estos patrones ya son componentes** en `src/components/ui/` (Fase 13.2) — en código nuevo se importan de ahí, no se copian clases:
>
> ```tsx
> import { Button, IconButton, Field, Input, Select, Textarea, Checkbox, Switch, RadioCardGroup,
>   Badge, StatusBadge, Alert, Card, CardHeader, PageHeader, StatCard, Skeleton, EmptyState,
>   ErrorState, Spinner, Menu, Tooltip, QuantityStepper, StickyActionBar } from "../../components/ui";
> ```
>
> **Catálogo vivo:** con `npm run dev`, abrir `/dev/ui` — todos los componentes en una pantalla, para revisarlos en claro/oscuro y en mobile/desktop (solo existe en desarrollo, no se incluye en el build). Las recetas de abajo documentan qué hace cada uno por dentro. Las pantallas existentes se migran en las sub-fases 13.3–13.8. **No inventar variantes nuevas**: si falta una, se agrega al componente.

### Botones

```tsx
// Primario — una acción principal por zona
<button className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl
  bg-primary text-primary-foreground text-sm font-semibold
  transition-colors duration-(--duration-fast) hover:bg-primary/90
  active:scale-[0.98] disabled:opacity-50">
  Guardar
</button>

// Secundario
<button className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl
  bg-card border border-border-strong text-foreground text-sm font-semibold
  transition-colors duration-(--duration-fast) hover:bg-muted disabled:opacity-50">

// Destructivo (confirmaciones)
<button className="... bg-destructive text-destructive-foreground hover:bg-destructive/90">

// Ghost / link
<button className="text-sm font-semibold text-primary hover:underline underline-offset-4">

// Solo ícono — siempre con aria-label
<button aria-label="Cerrar sesión" className="w-9 h-9 rounded-full inline-flex items-center
  justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
  <LogOut size={16} />
</button>
```
Tamaños: `h-9 px-3 text-xs` (chico, filas/tablas) · `h-11 px-5 text-sm` (estándar) · `h-12 px-6 text-base` (CTA de pantalla, ancho completo en mobile).

En código se usa `<Button variant size loading>` / `<IconButton label>` de `components/ui` (las recetas de arriba son lo que generan). Además:
- **`variant="danger-subtle"`**: acción destructiva secundaria dentro de una lista ("Dar de baja"): texto `destructive`, sin relleno. El relleno `danger` queda para confirmar.
- **Link que se ve como botón:** `<Link className={claseBoton("secondary", "sm")}>` (`ui/buttonStyles.ts`). Lo que navega es un link (se abre en otra pestaña); no un `<Button onClick={navigate}>`.
- **No pisar el color de una variante con `className`**: sin tailwind-merge, la clase de la variante puede ganar. Si hace falta otro color, es otra variante.

### Inputs

```tsx
<div>
  <label htmlFor="email" className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
  <input id="email" type="email" autoComplete="email"
    aria-invalid={!!error || undefined} aria-describedby={error ? "email-error" : undefined}
    className="w-full h-11 px-4 rounded-xl bg-card border border-border-strong text-sm text-foreground
      placeholder:text-muted-foreground transition-colors
      focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
      aria-[invalid=true]:border-destructive" />
  {error && <p id="email-error" className="mt-1.5 text-xs text-destructive">{error}</p>}
</div>
```
- **Todo `<label>` va conectado** (`htmlFor` + `id`). Todo campo de datos personales lleva `autoComplete` (`name`, `email`, `current-password`, `new-password`).
- **Ayuda y error:** con `<Field hint error>`, el error **reemplaza** a la ayuda mientras exista (no se muestran los dos: suelen decir lo mismo). Validar al salir del campo o al enviar, no mientras se escribe; al enviar con errores, llevar el foco al primer campo inválido (ver `organizador/RegisterPage`).
- **Placeholders:** solo como ejemplo de formato ("maria@ejemplo.com"), nunca en lugar del label. Van en `muted-foreground` completo (≥ 6:1): en 13.4 se habían bajado al 60 % para que no parecieran un valor cargado, pero así no llegaban a 4,5:1 (lo marcó axe en 13.9). El valor cargado se distingue igual: va en `foreground`, casi negro.
- **Contraseñas:** `<PasswordInput>` (mostrar/ocultar con `aria-pressed`, alcanzable con teclado).
- Textarea: mismas clases sin `h-11`, con `py-3 resize-none`.
- Select: `<select>` **nativo** estilado como input + `appearance-none` + chevron (es lo más usable en mobile).
- Fechas/horas: `DatePicker` / `TimePicker` / `DateRangeFilter` (componentes propios). Dentro de un `<Field>` toman su `id`, la ayuda/error y `aria-invalid`, igual que `Input`: `<Field label="Fecha" error={…}><DatePicker … /></Field>`.
- Formularios de evento: `DatosEventoCampos` y `TandaCard` (`pages/organizador/EventoFormCampos.tsx`), compartidos por Crear y Editar.

### Selección

- **Opción tipo radio en tarjeta** (tanda, pack de créditos): grupo con `role="radiogroup"`, cada opción `role="radio"` + `aria-checked`. Seleccionada `border-primary bg-primary/10`; resto `border-border bg-card hover:border-primary/40`; agotada/deshabilitada `opacity-50` + motivo en texto.
- **Chips de filtro:** `h-8 px-3.5 rounded-full text-xs font-semibold` + `aria-pressed`. Activo `bg-primary text-primary-foreground`; inactivo `bg-card border border-border text-muted-foreground hover:text-foreground`.
- **Switch:** `role="switch"` + `aria-checked` + nombre accesible. `w-10 h-6 rounded-full`, encendido `bg-primary`, apagado `bg-switch-background`.
- **Checkbox:** `<input type="checkbox">` real (estilado con `accent-primary` o custom), nunca un `<button>` que lo imita.

### Tarjetas

```tsx
<div className="bg-card border border-border rounded-2xl p-5">…</div>
```
- Tarjeta clickeable entera: un único `<button>`/`<a>` como elemento principal (patrón "enlace extendido" con `after:absolute after:inset-0` si tiene acciones secundarias encima, ver `organizador/DashboardPage`). **Nunca** controles interactivos anidados dentro de otro control.
- **No todo es una tarjeta:** listas, tablas y secciones pueden separarse con `divide-y divide-border` o espacio, sin caja propia.

### Badges

```tsx
<span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-2xs font-semibold bg-success/12 text-success">
  Publicado
</span>
```
Con `<StatusBadge tipo="evento" estado={ev.estado} />` el tono sale de un solo mapa (`lib/estados.ts`); TypeScript obliga a darle tono a cualquier estado nuevo:

| Estado | Tono |
|---|---|
| Evento Publicado · Usuario Activo · Transacción Aprobada · Paquete Activo | `success` |
| Entrada **Usada** (desde el Organizador: alguien ya ingresó, es un resultado positivo) | `success` |
| Entrada **Pagada** (vigente, todavía no ingresó) | `primary` (suave) |
| Evento Borrador · Transacción Pendiente | `warning` |
| Evento Cancelado · Usuario Suspendido · Transacción Rechazada | `danger` |
| Transacción Reembolsada (informativo: el dinero volvió) | `info` |
| Transacción Expirada · Usuario Inactivo · Paquete Deshabilitado | `neutral` |
| Roles (`TONO_ROL` + `ETIQUETA_ROL`: "Staff QR", no `Staff_QR`) | Administrador `primary-strong` · Organizador `primary` · Staff QR `neutral-strong` · Staff Vendedor `neutral` |
| Destacado / Próximo | `<Badge tone="highlight">` |

Para el comprador, "ya utilizada" en su propia entrada no es un badge sino un aviso `warning` (`MiEntradaPage`).

### Tarjeta de métrica

```tsx
<div className="bg-card border border-border rounded-2xl p-4">
  <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
    <Ticket size={13} /> Entradas vendidas
  </p>
  <p className="mt-2 text-2xl font-extrabold text-foreground tabular-nums">1.240</p>
  <p className="mt-0.5 text-xs text-muted-foreground">de 2.000 disponibles</p>
</div>
```
La métrica protagonista de un panel puede ir en `bg-primary/[0.08] border-primary/30` con la cifra en `text-primary`. Cifras con `tabular-nums`.

### Menú de acciones (tres puntos)

- Disparador: botón de ícono con `aria-label="Acciones de <nombre>"`, `aria-haspopup="menu"`, `aria-expanded`.
- Panel: `bg-popover border border-border rounded-xl shadow-overlay animate-scale-in min-w-[180px] py-1`; ítems `role="menuitem"`, `h-9 px-3 text-sm rounded-lg mx-1 hover:bg-muted`; ítem destructivo al final, separado, `text-destructive hover:bg-destructive/10`.
- Cierra con Escape, clic afuera y al elegir; se navega con flechas. **No debe recortarse** dentro de contenedores con `overflow` (posicionado fuera del flujo de la tabla) — `<Menu label="Acciones de …" items={[…]} />` ya lo resuelve (portal + `position: fixed`); se aplica en las tablas de Admin en 13.7.

### Tablas (Admin)

**Una sola `<table>`** que desde `lg` es tabla y en mobile/tablet muestra cada fila como tarjeta (no dos markups: duplicarían el contenido para lectores de pantalla y para los tests):
- `<thead className="sr-only lg:not-sr-only">` (los encabezados siguen existiendo para lectores de pantalla).
- `<tr className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 lg:table-row lg:p-0">`; cada `<td>` con `lg:table-cell` y `order-*` / `lg:order-none` para ubicar en la tarjeta (nombre + menú arriba, badges abajo).
- Datos que en desktop tienen su columna (email, fecha) se repiten como línea secundaria en la tarjeta (`lg:hidden`) y su celda queda `hidden lg:table-cell`.
- Encabezado `bg-surface-sunken text-2xs uppercase tracking-wider`; filas `divide-y divide-border`, hover `bg-surface-sunken`. Acciones en `<Menu label="Acciones de …">`.

### Feedback de una acción

- **Mutación** (suspender, guardar, crear): un toast (`toast.success` / `toast.error`). No además un aviso inline: el mismo mensaje dos veces no suma.
- **Carga fallida**: `<ErrorState onRetry>` en lugar del contenido.
- **Validación**: el error en el campo (`<Field error>`).

### Diálogos (confirm / alert / prompt)

**Nunca `window.confirm` / `alert` / `prompt`.** Se usa `useDialog()` (`lib/dialogs.ts`), provisto por `<DialogProvider>` en `App.tsx`:
```tsx
const { confirm, alert, prompt } = useDialog();
const ok = await confirm({
  titulo: "Cancelar evento",
  mensaje: `¿Cancelar "${ev.nombre}"? Se avisa por email a los compradores.`,
  confirmarTexto: "Cancelar evento",
  cancelarTexto: "No, volver",
  variante: "destructiva",
});
```
Ya resuelto en el componente: foco inicial en "Cancelar" si es destructivo, Tab atrapado, Escape cancela, scroll del fondo bloqueado, foco devuelto al cerrar, `role="alertdialog"`/`dialog`, botones apilados en mobile. En tests, renderizar dentro de `<DialogProvider>`.

### Avisos inline

```tsx
<div role="alert" className="flex gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
  <AlertCircle size={16} className="flex-none mt-0.5" /> {mensaje}
</div>
```
Mismo patrón con `warning`, `success` o `info` (`primary`).

### Imágenes de evento

`<EventoImagen>` (`components/EventoImagen.tsx`) para toda portada: si no hay URL o la imagen falla, muestra un placeholder (`ImageOff` sobre `from-primary/25 via-card to-background`), nunca el ícono de imagen rota del navegador. `loading="lazy"` salvo lo que se ve sin scrollear.

### Poster card y carrusel del catálogo

`<EventCard evento etiqueta? prioridad?>` (`components/EventCard.tsx`) — **la misma tarjeta** en la Home y en `/eventos` (y su `EventCardSkeleton` para la carga). Portada real a `aspect-[3/4]` con precio "Desde" en pill, título + fecha + lugar debajo. Es un `<Link>` (se puede abrir en otra pestaña; foco visible). Hover: borde `primary/40` + `shadow-raised` + zoom leve de la portada; **no se "levanta"**. Etiqueta opcional: "Hoy" con `accent`, "Próximo" con `highlight` (secundario) — una por pantalla visible, no en todas.

**Home:** hasta 4 eventos, una sola grilla; con más, carrusel de los 6 próximos (`snap-x`, sin avance automático; flechas en desktop en la fila del título, deshabilitadas en los extremos) + grilla "Más eventos" con los siguientes, **sin repetir ninguno**. Nada de autoplay: un carrusel que se mueve solo distrae y es difícil de leer.

### Ticker / marquee

Contenido duplicado dos veces en el componente; `.marquee-track` lo desplaza exactamente `-50%` en 26 s lineal infinito. Con reduced-motion queda quieto (regla global).

### Scanner del Staff QR

Pantalla **siempre negra** (no depende del tema). **En desktop conserva el marco de teléfono** (decisión 2026-11-16); en mobile ocupa toda la pantalla (`h-dvh`, áreas seguras del iPhone). Prioridad: velocidad y claridad del resultado.
- Es la otra excepción a "solo tokens": usa blanco con opacidad (`text-white/60` mínimo para texto) y verde/rojo fijos (`emerald-300/400/950`, `red-300/400/950`), porque los tokens cambian con el tema y esta pantalla no.
- Resultado: pantalla completa verde o roja, ícono de 52 px, nombre en `text-3xl`, tanda y motivo; **barra de cuenta regresiva** (keyframe `vaciar`) hasta volver a escanear (3,5 s válido / 4 s inválido). Se cierra tocando o con Enter/Espacio/Escape.
- Accesibilidad: el resultado se anuncia en una región `role="status" aria-live="assertive"` (el overlay visual es `aria-hidden`); código manual en un `<form>` con label (Enter valida); botones de 44 px.

---

## Iconos

`lucide-react` v0.487.0. **Usar `CircleX`, nunca `XCircle`** (no existe en esta versión). Tamaños: 13–14 px en texto `xs`/`sm`, 16 px en botones, 18 px en navegación. Íconos decorativos con `aria-hidden`; los que son la única etiqueta de un botón, con `aria-label` en el botón.

## Formato

`fmt(n)` (`lib/format.ts`) para montos en pesos (`$12.000`); `formatFecha`/`formatHora`/`formatRelativo` para fechas. Nunca mostrar una fecha ISO cruda (`2026-12-01`) en la UI.

## Scroll

`.hide-scrollbar` (globals.css) solo para carruseles y filas de chips horizontales — las listas verticales largas mantienen su scrollbar.

---

## Estructura

```
frontend/src/
  App.tsx                 rutas (code-split por pantalla)
  components/             componentes compartidos (AnimatedOutlet, DialogProvider, EventoImagen,
                          DatePicker, TimePicker, DateRangeFilter, EventMap, NotificationBell, …)
  components/ui/          primitivas del sistema de diseño (Fase 13.2)
  lib/                    api.ts, auth.tsx, types.ts, format.ts, theme.tsx, dialogs.ts, …
  pages/{buyer,organizador,staff,admin}/
  styles/
    fonts.css             Google Fonts (Inter, Anybody, JetBrains Mono)
    tailwind.css          import de Tailwind v4
    theme.css             TOKENS + capa base (interacción, tipografía, reduced-motion)
    globals.css           animaciones y utilidades (.hide-scrollbar, .marquee-track, …)
```

## Do / Don't

**Do**
- Usar tokens (`bg-card`, `text-success`, `border-border-strong`) — nunca hex/rgb en componentes.
- Verificar cada pantalla en mobile, tablet y desktop, en claro y oscuro, y con teclado.
- Mostrar el motivo cuando una acción está deshabilitada.
- Dar a cada carga un skeleton, a cada vacío una acción y a cada error un "Reintentar".

**Don't**
- `text-emerald-*`/`text-red-*`/`text-amber-*`/`text-violet-*` para estados — usar los semánticos.
- `focus:outline-none` sin reemplazo visible.
- `hover:scale-*` en elementos chicos, sombras de color, degradés decorativos, manchas difuminadas de fondo.
- `text-[9px]`/`text-[10px]`.
- Emojis como íconos o como estado vacío.
- Elementos interactivos anidados (`<button>` dentro de `role="button"`), o un `div` con `onClick` sin rol ni teclado.
- `window.confirm`/`alert`/`prompt`.
