# AsistíAPP — Design System

## Overview

AsistíAPP is a ticketing and access-control platform for independent event organizers in Argentina. The UI is a set of high-fidelity functional mockups built in **React + TypeScript + Tailwind CSS v4**, rendered inside device frames so stakeholders can interact with every screen without a real backend.

There are **four audience modes**, each with its own frame:

| Mode | Frame | Screens |
|---|---|---|
| Buyer (`buyer`) | Phone 390×844 r-50 | A–D: Listing → Detail → Checkout → Ticket |
| Organizer (`org`) | Phone 390×844 r-50 | E–H + E2: Login, Register, Dashboard, Wizard, Wallet, Staff Mgmt |
| Staff (`staff`) | Phone 390×844 r-50 | I–J: Scanner QR, Valid overlay, Invalid overlay + POS for Vendedor |
| Admin (`admin`) | Desktop 1100×700 r-16 | K–N: Dashboard, Users, Events, Config |

---

## Color Tokens

All tokens are CSS custom properties set in `src/styles/theme.css`.

| Token | Value | Usage |
|---|---|---|
| `--background` | `#09090f` | App / screen background |
| `--foreground` | `#f0eeff` | Primary text |
| `--card` | `#131222` | Card surface |
| `--card-foreground` | `#f0eeff` | Text on cards |
| `--primary` | `#7c3aed` | Violet — CTA buttons, active states, brand accent |
| `--primary-foreground` | `#ffffff` | Text on primary buttons |
| `--secondary` | `#1e1b33` | Secondary surface |
| `--muted` | `#1e1b33` | Muted inputs, disabled buttons |
| `--muted-foreground` | `#6e6b8f` | Placeholder text, secondary labels |
| `--accent` | `#f59e0b` | Amber — prices, highlights, popular badges |
| `--accent-foreground` | `#09090f` | Text on accent elements |
| `--destructive` | `#ef4444` | Errors, cancel actions |
| `--border` | `rgba(255,255,255,0.08)` | Subtle card/input borders |
| `--ring` | `#7c3aed` | Focus ring color |

### Semantic Color Usage

| Context | Color |
|---|---|
| Success / Valid entry | `text-emerald-400`, `bg-emerald-400/10–15` |
| Error / Invalid entry | `text-red-400`, `bg-red-400/10–15` |
| Prices | `text-accent` (`#f59e0b`) |
| Active pulse indicator | `bg-green-400 animate-pulse` |
| Violet metric | `text-violet-400`, `bg-violet-400/10` |
| Sky/Info metric | `text-sky-400`, `bg-sky-400/10` |
| Amber metric | `text-amber-400`, `bg-amber-400/10` |

---

## Typography

Font: **Inter** (weights 400, 500, 600, 700, 800). Imported in `src/styles/fonts.css` from Google Fonts.

Do **not** add Tailwind font-size / font-weight classes unless overriding—the `theme.css` base layer handles default sizing for `h1–h4`, `label`, `button`, `input`.

| Element | Class pattern |
|---|---|
| Brand wordmark | `text-xl font-extrabold` + `<span className="text-primary">APP</span>` |
| Section heading | `text-lg font-extrabold text-foreground` |
| Card title | `text-sm font-bold text-foreground` |
| Body / description | `text-sm text-muted-foreground leading-relaxed` |
| Overline label | `text-[10px] text-muted-foreground tracking-[0.2em] uppercase` |
| Price | `text-accent font-bold text-sm` (listing) / `text-base font-extrabold text-foreground` (checkout) |
| Badge / tag | `text-[10px] font-bold tracking-widest uppercase` |
| Monospace code | `font-mono tracking-wider` (ticket IDs) |

---

## Spacing & Layout

- Base unit: Tailwind's 4px grid.
- Screen padding: `px-4` (mobile) / `px-7` (admin desktop).
- Top safe-area offset: `pt-14` (accounts for status bar + notch simulation).
- Card border-radius: `rounded-2xl` (16px). Inputs: `rounded-xl` or `rounded-2xl`.
- Gaps between cards/sections: `space-y-4` or `space-y-5`.

---

## Device Frames

### Phone Frame (Buyer / Org / Staff)
```
width: 390px  height: 844px  border-radius: 50px
background: var(--background)  [or #000 for Staff]
box-shadow: 0 0 0 1px rgba(255,255,255,0.08),
            0 40px 80px rgba(0,0,0,0.85),
            0 0 120px rgba(124,58,237,0.15)
```
- Status bar (`pt-3 pb-1`) simulates iOS notch: time left, pill center, signal/battery right.
- Staff QR scanner hides the status bar (full-bleed immersive).
- Organizer has a bottom tab bar when logged in (4 items: Dashboard, Crear, Créditos, Staff).

### Desktop Frame (Admin)
```
width: 1100px  height: 700px  border-radius: 16px
background: var(--background)
box-shadow: same as phone
```
- No browser chrome simulation — the `AdminShell` fills the frame directly.
- `AdminShell` uses a 208px sidebar + flex-1 main area.

---

## Component Patterns

### Buttons

**Primary CTA**
```tsx
<button className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base
  hover:bg-primary/90 active:scale-[0.98] transition-all">
  Label
</button>
```

**Disabled CTA**
```tsx
<button disabled className="w-full py-4 rounded-2xl bg-muted text-muted-foreground cursor-not-allowed">
  Label
</button>
```

**Ghost / secondary**
```tsx
<button className="w-full py-3.5 rounded-2xl bg-card border border-border
  text-foreground font-semibold text-sm hover:bg-muted transition-colors">
  Label
</button>
```

**Back link**
```tsx
<button className="flex items-center gap-1 text-muted-foreground text-sm
  hover:text-foreground transition-colors">
  <ChevronLeft size={15} />Volver
</button>
```

**Icon-only round** (used in headers)
```tsx
<button className="w-9 h-9 rounded-full bg-muted flex items-center justify-center
  text-muted-foreground hover:text-foreground transition-colors">
  <LogOut size={16} />
</button>
```

### Cards

**Standard info card**
```tsx
<div className="bg-card border border-border rounded-2xl p-4">
  …content…
</div>
```

**Selectable card (radio-style)**
```tsx
<button className={`w-full flex … p-4 rounded-xl border text-left transition-all
  ${selected ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}>
```

**Hero gradient card** (wallet balance)
```tsx
<div className="relative overflow-hidden rounded-3xl bg-primary p-5">
  <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
  …
</div>
```

### Inputs

**Standard text input**
```tsx
<input className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm
  text-foreground placeholder:text-muted-foreground
  focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
```

**Error state**: add `border-red-500/60` instead of `border-border`.

**Textarea**: same classes + `resize-none`.

### Filter Chips / Tabs
```tsx
<button className={`flex-none px-3 py-1 rounded-full text-xs font-semibold transition-all
  ${active ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
```
Buyer Listing uses a slightly larger variant (`px-3.5 py-1.5`) for the date-range chips (Todos/Hoy/Este finde/Próximo finde) — same active/inactive logic, just more tap-friendly since it's the primary filter on that screen.

### Poster Card (Buyer Listing)
Real event `imagenPortadaUrl` at `aspect-[3/4]`, not a small thumbnail — the artwork carries the card, same idea as the hero carousel below. Used both in the "Destacados" carousel and the main grid.
```tsx
<button className="group text-left" onClick={...}>
  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted">
    {imagenPortadaUrl ? (
      <img src={imagenPortadaUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
    ) : (
      <div className="w-full h-full bg-gradient-to-br from-primary/20 via-card to-background flex items-center justify-center">
        <Sparkles size={22} className="text-primary/40" />
      </div>
    )}
    <span className="absolute top-2.5 right-2.5 bg-background/85 backdrop-blur-sm text-accent
      text-[11px] font-bold px-2.5 py-1 rounded-full">Desde {fmt(precioDesde)}</span>
  </div>
  <div className="mt-2.5">
    <h3 className="text-foreground font-semibold text-sm leading-snug line-clamp-2">{nombre}</h3>
    {/* fecha + lugar, text-xs text-muted-foreground, con ícono de 11px */}
  </div>
</button>
```
No cover image → gradient placeholder (`from-primary/20 via-card to-background`) with a centered `Sparkles` icon at low opacity. Never leave a bare empty `bg-muted` box.

### Hero Carousel (Buyer Listing "Destacados")
Same poster card, bigger (`w-[62%] sm:w-[38%] lg:w-[24%]`), horizontal scroll-snap, with title+date overlaid on a bottom gradient instead of below the image (there's no room for a caption at that width, and it reads as "featured" rather than "browsable grid item"):
```tsx
<div className="flex gap-3 lg:gap-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory px-4 lg:px-8">
  <button className="relative flex-none w-[62%] sm:w-[38%] lg:w-[24%] aspect-[3/4] snap-start rounded-2xl overflow-hidden">
    {/* imagen o gradient placeholder, igual que la poster card */}
    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
    <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
      <p className="text-white font-extrabold text-sm leading-tight line-clamp-2">{nombre}</p>
      <p className="text-white/70 text-[11px] mt-1">{formatFecha(fechaEvento)}</p>
    </div>
  </button>
</div>
```

### Ticker / Marquee
Infinite horizontal scroll for a short list of value props. The content is duplicated once in the component (two `flex-none` groups with identical children) and CSS shifts exactly by `-50%`, so the loop seam never shows:
```tsx
<div className="overflow-hidden border-y border-border bg-card/60 py-2.5">
  <div className="flex w-max marquee-track">
    {[0, 1].map(copia => (
      <div key={copia} className="flex items-center flex-none">
        {ITEMS.map(item => (
          <span key={item} className="flex items-center gap-2 px-6 text-[11px] font-bold
            tracking-widest uppercase text-muted-foreground whitespace-nowrap">
            <span className="text-primary">✦</span>{item}
          </span>
        ))}
      </div>
    ))}
  </div>
</div>
```
`.marquee-track` (`marquee` keyframe, `translateX(0)` → `translateX(-50%)`, 26s linear infinite) lives in `globals.css` next to the other animation classes.

### Badges / Pills

| Type | Classes |
|---|---|
| Category (violet) | `bg-violet-400/15 text-violet-400 text-[10px] font-bold px-2.5 py-1 rounded-full` |
| Staff QR | `bg-violet-400/10 text-violet-400` |
| Staff Vendedor | `bg-amber-400/10 text-amber-400` |
| Status: activo | `bg-emerald-400/15 text-emerald-400` |
| Status: cancelado/suspendido | `bg-red-400/15 text-red-400` |
| Popular pack | `bg-accent text-accent-foreground` |

### Metric Cards (4-column grid in dashboards)
```tsx
<div className="bg-card border border-border rounded-2xl p-3.5">
  <div className={`w-8 h-8 rounded-xl ${m.bg} flex items-center justify-center mb-2.5`}>
    <m.icon size={16} className={m.color} />
  </div>
  <p className="text-lg font-extrabold text-foreground leading-none">{value}</p>
  <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
  <p className="text-[10px] text-primary mt-1 font-semibold flex items-center gap-0.5">
    <ArrowUpRight size={10} />{sub}
  </p>
</div>
```

### Three-dot Dropdown Menu
```tsx
// Parent must have: onClick={() => setOpenMenu(null)}
// Cell must have:   onClick={e => e.stopPropagation()}
<div className="relative" onClick={e => e.stopPropagation()}>
  <button onClick={() => setOpenMenu(openMenu === id ? null : id)}>···</button>
  {openMenu === id && (
    <div className="absolute right-0 top-9 z-50 bg-card border border-border
      rounded-xl shadow-xl shadow-black/40 overflow-hidden min-w-[160px]">
      <button className="w-full text-left px-4 py-2.5 text-xs font-semibold
        text-foreground hover:bg-muted transition-colors flex items-center gap-2">
        <Icon size={13} />Acción
      </button>
      <div className="border-t border-border" />
      <button className="w-full text-left px-4 py-2.5 text-xs font-semibold
        text-red-400 hover:bg-red-400/10 transition-colors flex items-center gap-2">
        <Trash2 size={13} />Eliminar
      </button>
    </div>
  )}
</div>
```

### Toggle Switch (Admin Config)
```tsx
<button onClick={toggle}
  className={`w-10 h-6 rounded-full transition-all flex items-center px-0.5
    ${enabled ? "bg-primary justify-end" : "bg-muted justify-start"}`}>
  <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
</button>
```

### QR Code Component
Custom SVG-based generator (no external library). `<QRCodeSVG seed="string" />` produces a deterministic 25-module QR-like grid with real finder patterns. Used in Buyer success screen and Staff Vendedor generated ticket.

### Scanner Camera Simulation
CSS-only camera effect:
```tsx
<div className="absolute inset-0 bg-gradient-to-b from-neutral-900 via-neutral-800 to-neutral-900" />
<div className="absolute inset-0 opacity-[0.04]"
  style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.4) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,0.4) 1px,transparent 1px)",
    backgroundSize: "20px 20px" }} />
<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_38%,rgba(0,0,0,0.82)_100%)]" />
```
Scan line animation via `scan-line-anim` CSS class (see globals.css).

---

## Scrolling

All scrollable areas use `.hide-scrollbar` (defined in `globals.css`):
```css
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.hide-scrollbar::-webkit-scrollbar { display: none; }
```
Always add `<div className="h-8" />` (or `h-24` above sticky footers) at the bottom of scroll containers so content isn't hidden under sticky bars.

---

## CSS Animations (globals.css)

| Class | Keyframe | Usage |
|---|---|---|
| `scan-line-anim` | `scan-line` 2s ease-in-out infinite | QR scanner sweep line |
| `countdown-bar` | `countdown` 3.5s linear forwards | Valid overlay auto-dismiss bar |
| `countdown-bar-red` | `countdown` 4s linear forwards | Invalid overlay auto-dismiss bar |
| `marquee-track` | `marquee` 26s linear infinite | Ticker en Buyer Listing (ver Poster Card / Ticker arriba) |

---

## Screen Inventory

### Section 1 — Buyer
| Screen | Key | Notable interactions |
|---|---|---|
| A. Listing | `listing` | Search input + category filter chips, featured card + list cards |
| B. Detail | `detail` | Tanda radio selection, quantity stepper, sticky buy footer |
| C. Checkout | `checkout` | Name + email fields enable button; payment method pre-selected as "mp" |
| D. Ticket | `success` | QR code display, download + back buttons |

### Section 2 — Organizer
| Screen | Key | Notable interactions |
|---|---|---|
| E. Login | `login` | Toggle to recover-password sub-view; "Registrate gratis" → register |
| E2. Register | `register` | 5 fields + terms checkbox; on success shows welcome credits screen |
| F. Dashboard | `dashboard` | Metrics grid, BarChart (recharts), recent sales list, quick-action buttons |
| G. Wizard | `wizard` | 2-step: basic info → tanda config; publish → success state with credit deduction |
| H. Wallet | `wallet` | Balance hero card, pack selection (expand-to-pay), transaction history |
| Staff Mgmt | `staff` | Role legend, staff list, add-member form with role toggle |

### Section 3 — Staff
| Screen | Key | Notable interactions |
|---|---|---|
| Staff Login | (entry) | Email + password; demo credential buttons; routes by `role` field |
| I. Scanner | `scanner` | Camera simulation, scan-frame corners, simulate-valid/invalid buttons, manual code entry, stats counters |
| J. Valid | `valid` | Full-screen emerald overlay, ticket holder info, countdown bar auto-dismiss |
| J. Invalid | `invalid` | Full-screen red overlay, reason code + detail, countdown bar auto-dismiss |
| Vendedor POS | (role-routed) | Tanda selection, quantity, optional buyer name, Efectivo/Transferencia payment, generate QR |

### Section 4 — Admin Backoffice
| Screen | Key | Notable interactions |
|---|---|---|
| Admin Login | `login` | Email + password; any credential enters |
| K. Dashboard | `dashboard` | 4 KPI cards, 3 quick-nav cards, activity log |
| L. Users | `users` | Search + role filter, sortable table, three-dot menu (Suspender/Activar / Cambiar Rol / Eliminar) |
| M. Events | `events` | Search, table with status badges, three-dot menu (Editar / Cancelar / Eliminar) |
| N. Config | `config` | Credit packs list (inline price edit + toggle), global settings card with save confirmation |

---

## State Architecture

Everything lives in `src/app/App.tsx`. Key state in `App()`:

```tsx
const [mode, setMode]           = useState<AppMode>("buyer");
const [buyerScreen, ...]        = useState<BuyerScreen>("listing");
const [orgScreen, ...]          = useState<OrgScreen>("login");
const [orgLoggedIn, ...]        = useState(false);
const [selEvent, ...]           = useState<BuyerEvent>(EVENTS[0]);
const [selTanda, ...]           = useState<Tanda>(EVENTS[0].tandas[0]);
const [selQty, ...]             = useState(1);
const [buyerName, ...]          = useState("");
const [staffForced, ...]        = useState<StaffScreen | undefined>(undefined);
```

`AdminShell` owns its own `screen: AdminScreen` state internally (including `"login"`).
`StaffShell` owns its own `account: StaffAccount | null` and `screen: StaffScreen` state.

---

## Data Layer (mock)

All data is static constant arrays at the top of `App.tsx`.

| Constant | Type | Count | Description |
|---|---|---|---|
| `EVENTS` | `BuyerEvent[]` | 6 | Events with tandas, images (Unsplash URLs) |
| `SALES_CHART` | array | 3 | Tanda names + sold qty for org BarChart |
| `TRANSACTIONS` | array | 5 | Credit wallet history |
| `CREDIT_PACKS` | array | 3 | Buyer-facing packs (Starter/Pro/Studio) |
| `ADMIN_USERS` | `AdminUser[]` | 6 | System users with roles + status |
| `ADMIN_EVENTS` | `AdminEvent[]` | 6 | Global event list for admin |
| `ADMIN_PACKS` | `CreditPackAdmin[]` | 4 | Packs with enabled toggle |
| `DEFAULT_STAFF` | `StaffMember[]` | 2 | Pre-populated org staff |
| `STAFF_ACCOUNTS` | `StaffAccount[]` | 2 | Login credentials (diego/sofia + pass 1234) |
| `INVALID_REASONS` | array | 4 | QR error codes + messages |
| `VALID_TICKETS` | array | 3 | Mock ticket holders for valid overlay |

---

## Icons

Package: `lucide-react` v0.487.0.

> **Important**: In v0.487, `XCircle` was renamed to `CircleX`. Always use `CircleX`.

Frequently used icons in this project:
`Search`, `MapPin`, `Calendar`, `Clock`, `ChevronLeft`, `ChevronRight`, `ChevronDown`,
`Plus`, `Minus`, `Download`, `Check`, `LayoutDashboard`, `Ticket`, `Wallet`, `LogOut`,
`Eye`, `EyeOff`, `TrendingUp`, `Users`, `ShieldCheck`, `ArrowUpRight`, `ArrowDownLeft`,
`Sparkles`, `ImagePlus`, `Trash2`, `CircleDollarSign`, `CreditCard`, `AlertCircle`,
`FlashlightOff`, `Flashlight`, `UserCheck`, `CircleX`, `Hash`, `UserPlus`, `BadgeCheck`,
`QrCode`, `Store`, `PartyPopper`, `RotateCcw`, `Share2`, `ClipboardCheck`.

---

## Charts

Package: `recharts`.

**Org Dashboard** — `BarChart` with custom cell colors per tanda:
```tsx
<BarChart data={SALES_CHART} barCategoryGap="30%">
  <XAxis dataKey="tanda" tick={{ fill: "#6e6b8f", fontSize: 10 }} axisLine={false} tickLine={false} />
  <YAxis hide />
  <Tooltip contentStyle={{ background: "#131222", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 11, color: "#f0eeff" }}
    cursor={{ fill: "rgba(124,58,237,0.08)" }} />
  <Bar dataKey="vendidas" radius={[6,6,0,0]}>
    {SALES_CHART.map((entry, i) => <Cell key={i} fill={entry.color} />)}
  </Bar>
</BarChart>
```

All charts wrapped in `<ResponsiveContainer width="100%" height={...}>`.

---

## Formatting Helpers

```tsx
const fmt = (n: number) => `$${Math.abs(n).toLocaleString("es-AR")}`;
```
Used for all peso amounts throughout the app.

---

## File Structure

```
src/
  app/
    App.tsx          ← all components + App root (single file)
    components/      ← empty (all code lives in App.tsx)
  styles/
    fonts.css        ← Google Fonts @import (Inter)
    globals.css      ← hide-scrollbar, scan-line, countdown keyframes
    theme.css        ← CSS custom properties + @theme inline block
    index.css        ← @import chain
```

---

## Naming Conventions

- Components: PascalCase — `ListingScreen`, `AdminShell`, `QRCodeSVG`
- Types: PascalCase — `BuyerScreen`, `OrgScreen`, `AdminUser`
- Data constants: SCREAMING_SNAKE_CASE — `EVENTS`, `ADMIN_PACKS`
- CSS animation classes: kebab-case — `scan-line-anim`, `countdown-bar`

---

## Do's and Don'ts

**Do:**
- Keep all component code in `src/app/App.tsx`.
- Use `hide-scrollbar` on every scrollable div.
- Pre-select default values so forms/selections feel ready (e.g., payment method, first tanda).
- Use `active:scale-[0.98]` on primary CTAs for tactile feel.
- Close three-dot menus on parent click via `e.stopPropagation()` / `onClick={() => setOpenMenu(null)}`.

**Don't:**
- Don't import `XCircle` from lucide-react — it doesn't exist in v0.487. Use `CircleX`.
- Don't add duplicate React imports — keep a single `import { useState, useEffect, useCallback } from "react"`.
- Don't use `npm`/`vite build`/`index.html` — the Figma Make harness handles all of that.
- Don't use font-size or font-weight Tailwind classes on elements already styled by `theme.css` base layer unless intentionally overriding.
- Don't put scrollable content behind sticky footers without a spacer div at the bottom.
