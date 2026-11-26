import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router";
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogIn,
  Menu as MenuIcon,
  Search,
  X,
  ShieldCheck,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
  Wallet,
  Zap,
  CalendarSearch,
} from "lucide-react";
import { BrandLogo } from "../../components/BrandLogo";
import { EventCard, EventCardSkeleton } from "../../components/EventCard";
import { DateRangeFilter } from "../../components/DateRangeFilter";
import { SupportContactLine } from "../../components/SupportContactLine";
import { ThemeToggle } from "../../components/ThemeToggle";
import { EmptyState, ErrorState, IconButton } from "../../components/ui";
import { api, ApiError } from "../../lib/api";
import { cn } from "../../lib/cn";
import { fmt, hoyLocal } from "../../lib/format";
import { comportamientoScroll } from "../../lib/motion";
import type { EstadisticasPublicasResponseDTO, EventoPublicoListItemDTO, PaqueteCreditoDisponibleDTO } from "../../lib/types";

/** Opciones del selector "Cuándo" del hero. Todas se resuelven a un rango de fechas (desde/hasta). */
type CuandoKey = "todos" | "hoy" | "semana" | "mes" | "rango";

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
/** "2026-11-20" → "20 nov". */
function fechaCorta(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${Number(dia)} ${MESES_CORTOS[Number(mes) - 1]}`;
}
/** Fecha local (hoy + `dias`) como "YYYY-MM-DD". */
function isoSumar(dias: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dias);
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** Con hasta esta cantidad de eventos se muestra una sola grilla (un carrusel de 3 tarjetas se ve vacío). */
const MAX_SOLO_GRILLA = 4;
const EN_CARRUSEL = 6;
const EN_GRILLA = 8;

const TICKER_ITEMS = [
  "Sin comisión de AsistíAPP por venta",
  "Entradas 100% digitales",
  "Validación QR en la puerta",
  "Sin filas, sin papel",
];

/**
 * El loop continuo anima el track `translateX(0) → -50%`: para que no haya saltos ni huecos, cada
 * una de las dos mitades (duplicadas exactamente al 100%) tiene que ser más ancha que la pantalla.
 * Con 4 ítems cortos eso no pasa en desktop, así que se repite la secuencia dentro de cada mitad.
 */
const TICKER_SECUENCIA = Array.from({ length: 3 }, () => TICKER_ITEMS).flat();

const FEATURES = [
  { icon: Zap, title: "Entrega instantánea", desc: "La entrada llega a tu email al toque, con su QR único." },
  { icon: ShieldCheck, title: "Acceso verificado", desc: "Cada QR se valida una sola vez en la puerta, sin reventa." },
  { icon: TrendingUp, title: "Sin comisión oculta", desc: "El organizador vende directo — vos pagás lo que ves." },
];

const ORG_FEATURES = [
  { icon: Sparkles, title: "Eventos en minutos", desc: "Creá un evento completo con tandas y cupos en un asistente paso a paso." },
  { icon: Wallet, title: "Créditos prepagos", desc: "Cargás créditos y publicás tus eventos. Sin comisión por venta." },
  { icon: ShieldCheck, title: "Control en la puerta", desc: "Tu staff valida entradas con QR, sin planillas ni entradas duplicadas." },
  { icon: TrendingUp, title: "Métricas en vivo", desc: "Ventas y validaciones actualizadas, por tanda y por canal." },
];

const ORG_STEPS = [
  { num: "01", title: "Creá tu cuenta", desc: "Registro gratuito, con créditos de bienvenida y sin tarjeta." },
  { num: "02", title: "Configurá tu evento", desc: "Nombre, fecha, lugar y tandas de precios." },
  { num: "03", title: "Compartí el link", desc: "Los compradores pagan sin registrarse y reciben la entrada al instante." },
  { num: "04", title: "Controlá accesos", desc: "Tu staff escanea los QR en la puerta." },
];

const NAV_LINKS = [
  { label: "Para organizadores", href: "#para-organizadores" },
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Empezar", href: "#empezar" },
];

/** Link de nav con subrayado animado que crece desde la izquierda (como el prototipo). */
const NAV_LINK_CLS =
  "group relative inline-flex h-9 items-center px-2 text-sm transition-colors duration-(--duration-fast) " +
  "after:pointer-events-none after:absolute after:inset-x-2 after:bottom-1.5 after:h-0.5 after:origin-left " +
  "after:scale-x-0 after:bg-foreground after:transition-transform after:duration-300 hover:after:scale-x-100";

export function ListingPage() {
  const [eventos, setEventos] = useState<EventoPublicoListItemDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<EstadisticasPublicasResponseDTO | null>(null);
  const [paquetes, setPaquetes] = useState<PaqueteCreditoDisponibleDTO[]>([]);

  const cargarEventos = useCallback(() => {
    setError(null);
    setEventos(null);
    api
      .get<EventoPublicoListItemDTO[]>("/public/eventos", { skipAuth: true })
      .then(setEventos)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "No pudimos cargar los eventos."));
  }, []);

  useEffect(() => {
    cargarEventos();
    api
      .get<EstadisticasPublicasResponseDTO>("/public/estadisticas", { skipAuth: true })
      .then(setStats)
      .catch(() => {});
    api
      .get<PaqueteCreditoDisponibleDTO[]>("/public/paquetes-credito", { skipAuth: true })
      .then(setPaquetes)
      .catch(() => {});
  }, [cargarEventos]);

  const ordenados = useMemo(() => [...(eventos ?? [])].sort((a, b) => a.fechaEvento.localeCompare(b.fechaEvento)), [eventos]);
  const hoyStr = useMemo(() => hoyLocal(), []);

  // Sin repetir eventos: antes "Destacados" eran los primeros 6 de la misma lista que la grilla
  // de abajo, así que esos 6 aparecían dos veces seguidas.
  const soloGrilla = ordenados.length <= MAX_SOLO_GRILLA;
  const carrusel = soloGrilla ? [] : ordenados.slice(0, EN_CARRUSEL);
  const grilla = soloGrilla ? ordenados : ordenados.slice(EN_CARRUSEL, EN_CARRUSEL + EN_GRILLA);
  const etiquetaDe = (ev: EventoPublicoListItemDTO, i: number) =>
    ev.fechaEvento === hoyStr ? "Hoy" : i === 0 && ev === ordenados[0] ? "Próximo" : undefined;

  const nav = useNavCarrusel();
  const navigate = useNavigate();

  // Buscador del hero: navega a /eventos con los parámetros (rango de fechas), que la pantalla de catálogo lee y aplica.
  const [heroQuery, setHeroQuery] = useState("");
  const [heroDesde, setHeroDesde] = useState("");
  const [heroHasta, setHeroHasta] = useState("");
  const [heroCuandoKey, setHeroCuandoKey] = useState<CuandoKey>("todos");
  function buscar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (heroQuery.trim()) params.set("q", heroQuery.trim());
    if (heroDesde) params.set("desde", heroDesde);
    if (heroHasta) params.set("hasta", heroHasta);
    const qs = params.toString();
    navigate(qs ? `/eventos?${qs}` : "/eventos");
  }

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-dvh bg-background">
      {/* Header — transparente sobre el hero, sólido al bajar */}
      <header
        className={cn(
          "sticky top-0 z-40 border-b transition-[background-color,border-color] duration-(--duration-base)",
          scrolled || menuOpen ? "border-border bg-background/95 backdrop-blur-md" : "border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 lg:gap-6">
            <BrandLogo
              onClick={() => window.scrollTo({ top: 0, behavior: comportamientoScroll() })}
              ariaLabel="AsistíAPP — volver arriba"
            />
            {/* Nav de escritorio */}
            <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
              <NavLink to="/eventos" className={cn(NAV_LINK_CLS, "font-semibold text-foreground")}>
                Eventos
              </NavLink>
              {NAV_LINKS.map((l) => (
                <a key={l.label} href={l.href} className={cn(NAV_LINK_CLS, "font-medium text-muted-foreground hover:text-foreground")}>
                  {l.label}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex flex-none items-center gap-1 sm:gap-2">
            {/* Acciones de escritorio */}
            <Link
              to="/organizador/login"
              className="hidden h-9 items-center rounded-xl border border-transparent px-3 text-sm font-semibold text-foreground transition-[background-color,border-color,transform] duration-(--duration-fast) hover:-translate-y-px hover:border-border-strong hover:bg-muted active:translate-y-0 active:scale-95 lg:inline-flex"
            >
              Ingresar
            </Link>
            <Link
              to="/organizador/registro"
              className="group/org hidden h-9 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-[filter,transform,box-shadow] duration-(--duration-fast) hover:-translate-y-px hover:shadow-hard-sm hover:brightness-110 active:translate-y-0 active:scale-95 lg:inline-flex"
            >
              Soy organizador
              <ArrowRight
                size={15}
                aria-hidden="true"
                className="w-0 -translate-x-1 opacity-0 transition-all duration-(--duration-base) ease-emphasized group-hover/org:w-[15px] group-hover/org:translate-x-0 group-hover/org:opacity-100"
              />
            </Link>
            <ThemeToggle />
            {/* Botón hamburguesa (mobile/tablet) */}
            <button
              type="button"
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuOpen}
              aria-controls="menu-mobile"
              onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex size-9 items-center justify-center rounded-xl text-foreground transition-colors duration-(--duration-fast) hover:bg-muted active:scale-95 lg:hidden"
            >
              {menuOpen ? <X size={20} aria-hidden="true" /> : <MenuIcon size={20} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Menú desplegable (mobile/tablet) */}
        {menuOpen && (
          <nav id="menu-mobile" aria-label="Principal" className="border-t border-border bg-background lg:hidden">
            <div className="mx-auto flex max-w-7xl flex-col px-4 py-3">
              <NavLink
                to="/eventos"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-3 text-base font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Eventos
                <ArrowRight size={16} aria-hidden="true" className="text-muted-foreground" />
              </NavLink>
              {NAV_LINKS.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-3 py-3 text-base font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {l.label}
                </a>
              ))}
              <div className="my-2 border-t border-border" />
              <Link
                to="/organizador/login"
                onClick={() => setMenuOpen(false)}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-3 text-base font-semibold text-foreground transition-[background-color,transform] duration-(--duration-fast) hover:bg-muted active:scale-[0.98]"
              >
                <LogIn size={17} aria-hidden="true" />
                Ingresar
              </Link>
              <Link
                to="/organizador/registro"
                onClick={() => setMenuOpen(false)}
                className="group/org-m mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-base font-semibold text-primary-foreground shadow-hard-sm transition-[filter,transform] duration-(--duration-fast) hover:brightness-110 active:scale-[0.98]"
              >
                Soy organizador
                <ArrowRight
                  size={16}
                  aria-hidden="true"
                  className="transition-transform duration-(--duration-base) ease-emphasized group-hover/org-m:translate-x-0.5"
                />
              </Link>
            </div>
          </nav>
        )}
      </header>

      <main>
        {/* Hero editorial — composición del prototipo: titular a la izquierda con raya + bloque lima,
            sello rotativo, párrafo y buscador segmentado full-width. Fondo de tickets apenas visible. */}
        {/* z-20: mantiene al popover de "Cuándo" (que desborda hacia abajo) por encima del ticker,
            que al ser hermano posterior en el flujo lo tapaba. Debajo del header (z-40). */}
        <section className="relative z-20 -mt-16 border-b border-border px-4 pt-16 lg:px-8">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <img
              src="/ticket2.webp"
              alt=""
              className="size-full object-cover opacity-[0.12] blur-[1px] [mask-image:linear-gradient(180deg,#000_0%,#000_45%,transparent_92%)] dark:opacity-20"
            />
          </div>

          <div className="relative mx-auto max-w-7xl py-12 animate-fade-in-up lg:py-20">
            <h1 className="font-display font-extrabold leading-[0.9] tracking-[-0.035em] text-foreground">
              <span className="block text-[clamp(2.75rem,10vw,7.5rem)]">Salí a ver algo</span>
              <span className="mt-1 flex items-center gap-3 text-[clamp(2.75rem,10vw,7.5rem)] lg:gap-6">
                <span aria-hidden="true" className="h-[0.18em] min-w-8 flex-1 rounded-full bg-foreground" />
                <span className="box-decoration-clone whitespace-nowrap bg-accent px-2 text-accent-foreground">en vivo.</span>
              </span>
            </h1>

            <div className="mt-8 grid items-end gap-6 lg:mt-10 lg:grid-cols-[1fr_auto]">
              <p className="max-w-xl text-base text-muted-foreground lg:text-lg">
                Recitales, partidos y obras de todo el país. <strong className="font-semibold text-foreground">Pagás con MercadoPago</strong> y entrás con el QR que te llega por mail.
              </p>
              {/* Sello rotativo */}
              <div aria-hidden="true" className="relative hidden size-28 flex-none justify-self-end sm:block lg:size-32">
                <svg viewBox="0 0 100 100" className="size-full animate-seal">
                  <circle cx="50" cy="50" r="49" fill="var(--accent)" stroke="var(--foreground)" strokeWidth="0.75" />
                  <defs>
                    <path id="sello" d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0" />
                  </defs>
                  <text className="fill-[var(--accent-foreground)] font-mono text-[8.4px] font-semibold" style={{ letterSpacing: "1.6px" }}>
                    <textPath href="#sello">ENTRADA DIGITAL · QR ÚNICO · PAGO SEGURO · </textPath>
                  </text>
                </svg>
                <span className="absolute inset-[29%] grid place-items-center rounded-full bg-primary text-primary-foreground">
                  <Ticket size={22} aria-hidden="true" />
                </span>
              </div>
            </div>

            {/* Buscador segmentado: celda de búsqueda + cuándo + botón, líneas de 1px, sombra dura */}
            <form
              onSubmit={buscar}
              role="search"
              aria-label="Buscar eventos"
              className="mt-10 grid w-full grid-cols-1 rounded-2xl border border-border-strong bg-card text-left shadow-hard sm:grid-cols-[1.7fr_1fr_auto]"
            >
              <div className="flex flex-col gap-0.5 rounded-t-[15px] px-4 py-3 transition-colors duration-(--duration-fast) focus-within:bg-surface-sunken sm:rounded-t-none sm:rounded-l-[15px] sm:border-r sm:border-border-strong">
                <label htmlFor="hero-q" className="font-mono text-2xs uppercase tracking-[0.1em] text-muted-foreground">
                  Evento o lugar
                </label>
                <input
                  id="hero-q"
                  type="search"
                  value={heroQuery}
                  onChange={(e) => setHeroQuery(e.target.value)}
                  placeholder="Buscá un recital, fiesta o sede"
                  className="w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground lg:text-base"
                />
              </div>
              <HeroCuando
                cuandoKey={heroCuandoKey}
                desde={heroDesde}
                hasta={heroHasta}
                onChange={(k, d, h) => {
                  setHeroCuandoKey(k);
                  setHeroDesde(d);
                  setHeroHasta(h);
                }}
              />
              <button
                type="submit"
                className="group/btn flex items-center justify-center gap-2 rounded-b-[15px] border-t border-border-strong bg-primary px-7 py-4 font-display text-sm font-bold text-primary-foreground transition-colors duration-(--duration-base) hover:bg-accent hover:text-accent-foreground active:translate-y-0.5 sm:rounded-b-none sm:rounded-r-[15px] sm:border-l sm:border-t-0 lg:text-base"
              >
                <Search size={17} aria-hidden="true" className="transition-transform duration-(--duration-base) ease-emphasized group-hover/btn:-translate-y-px group-hover/btn:scale-110" />
                Buscar entradas
                <ArrowRight size={16} aria-hidden="true" className="w-0 -translate-x-1 opacity-0 transition-all duration-(--duration-base) ease-emphasized group-hover/btn:w-4 group-hover/btn:translate-x-0 group-hover/btn:opacity-100" />
              </button>
            </form>

            <Link
              to="/organizador/registro"
              className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-foreground underline-offset-4 hover:underline"
            >
              ¿Organizás eventos? Publicá el tuyo
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* Ticker — misma paleta oscura que los tickets */}
        <div
          className="overflow-hidden border-y border-border bg-[var(--ticket-bg)] py-2.5 text-[var(--ticket-fg)]"
          aria-hidden="true"
        >
          <div className="flex w-max marquee-track">
            {[0, 1].map((copia) => (
              <div key={copia} className="flex flex-none items-center">
                {TICKER_SECUENCIA.map((item, i) => (
                  <span
                    key={`${copia}-${i}`}
                    className="flex items-center gap-2 whitespace-nowrap px-6 font-mono text-2xs font-medium uppercase tracking-[0.16em]"
                  >
                    <span className="text-accent">✦</span>
                    {item}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Eventos */}
        <section id="eventos" aria-labelledby="eventos-titulo" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-10 lg:px-8 lg:py-14">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 id="eventos-titulo" className="font-display text-xl font-extrabold uppercase tracking-tight text-foreground lg:text-2xl">
              Próximos eventos
            </h2>
            <div className="flex flex-none items-center gap-4">
              {ordenados.length > 0 && (
                <Link
                  to="/eventos"
                  className="inline-flex items-center gap-1 rounded-md text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Ver todos
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              )}
              {/* Flechas del carrusel en la misma fila del título (solo desktop: en mobile se desliza) */}
              {carrusel.length > 0 && (
                <div className="hidden gap-2 lg:flex">
                  <IconButton
                    label="Eventos anteriores"
                    icon={<ChevronLeft size={18} />}
                    variant="secondary"
                    round
                    disabled={nav.alInicio}
                    onClick={() => nav.mover(-1)}
                  />
                  <IconButton
                    label="Eventos siguientes"
                    icon={<ChevronRight size={18} />}
                    variant="secondary"
                    round
                    disabled={nav.alFinal}
                    onClick={() => nav.mover(1)}
                  />
                </div>
              )}
            </div>
          </div>

          {error && <ErrorState title="No pudimos cargar los eventos" description={error} onRetry={cargarEventos} />}

          {!error && eventos === null && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6" aria-busy="true">
              <span className="sr-only">Cargando eventos…</span>
              {[0, 1, 2, 3].map((i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          )}

          {!error && eventos !== null && ordenados.length === 0 && (
            <EmptyState
              icon={CalendarSearch}
              title="Todavía no hay eventos publicados"
              description="Volvé pronto: acá vas a encontrar los próximos recitales y fiestas."
            />
          )}

          {carrusel.length > 0 && <Carrusel eventos={carrusel} etiquetaDe={etiquetaDe} nav={nav} />}

          {grilla.length > 0 && (
            <div className={cn(carrusel.length > 0 && "mt-12")}>
              {carrusel.length > 0 && <h3 className="mb-4 text-base font-bold text-foreground">Más eventos</h3>}
              <ul className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
                {grilla.map((ev, i) => (
                  <li key={ev.id}>
                    <EventCard
                      evento={ev}
                      etiqueta={soloGrilla ? etiquetaDe(ev, i) : ev.fechaEvento === hoyStr ? "Hoy" : undefined}
                      prioridad={soloGrilla && i < 4}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {ordenados.length > carrusel.length + grilla.length && (
            <div className="mt-10 flex justify-center">
              <Link
                to="/eventos"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-border-strong bg-card px-6 text-sm font-semibold text-foreground transition-colors duration-(--duration-fast) hover:bg-muted"
              >
                Ver todos los eventos ({ordenados.length})
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          )}
        </section>

        {/* Por qué comprar acá — grilla arquitectónica de celdas con líneas de 1px */}
        <section aria-labelledby="ventajas-titulo" className="border-t border-border">
          <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8 lg:py-20">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-border-strong pb-5">
              <h2 id="ventajas-titulo" className="font-display text-3xl font-extrabold tracking-[-0.03em] text-foreground lg:text-4xl">
                Tu entrada, <span className="text-secondary">sin vueltas</span>
              </h2>
              <p className="font-mono text-2xs uppercase tracking-[0.14em] text-muted-foreground">Para el que va al show</p>
            </div>
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-3 lg:gap-6">
              {FEATURES.map((f, i) => (
                <li
                  key={f.title}
                  className="rounded-2xl border border-foreground bg-card p-6 shadow-hard transition-transform duration-(--duration-base) ease-emphasized hover:-translate-y-1 lg:p-7"
                >
                  <div className="flex items-start justify-between">
                    <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                      <f.icon size={22} aria-hidden="true" />
                    </span>
                    <span className="font-mono text-2xl font-semibold tabular-nums text-border-strong">0{i + 1}</span>
                  </div>
                  <h3 className="mt-6 font-display text-lg font-extrabold tracking-tight text-foreground">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Para organizadores — marketing al pie, debajo del catálogo (que sigue siendo lo primero) */}
        <section id="para-organizadores" aria-labelledby="org-titulo" className="scroll-mt-16 border-t border-border bg-surface-sunken">
          <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8 lg:py-20">
            <div className="mb-10 max-w-2xl lg:mb-14">
              <p className="mb-3 font-mono text-2xs font-semibold uppercase tracking-[0.16em] text-secondary">Para organizadores</p>
              <h2 id="org-titulo" className="mb-3 font-display text-3xl font-extrabold tracking-[-0.03em] text-foreground lg:text-5xl">
                Vendé entradas, <span className="text-secondary">sin comisión</span>
              </h2>
              <p className="text-base text-muted-foreground lg:text-lg">
                Publicá tu evento, vendé online o en la puerta y validá cada entrada con QR — todo desde un mismo panel.
              </p>
            </div>

            {/* Solo con números reales: un "0 · 0 · 0" en una página de marketing resta confianza. */}
            {stats && stats.eventosPublicados + stats.organizadoresActivos + stats.entradasVendidas > 0 && (
              <dl className="mb-14 grid grid-cols-1 overflow-hidden rounded-2xl border border-foreground shadow-hard sm:grid-cols-3 sm:divide-x sm:divide-border-strong [&>div+div]:border-t [&>div+div]:border-border-strong sm:[&>div+div]:border-t-0 lg:mb-20">
                {[
                  { icon: Calendar, value: stats.eventosPublicados, label: "Eventos publicados" },
                  { icon: Users, value: stats.organizadoresActivos, label: "Organizadores activos" },
                  { icon: Ticket, value: stats.entradasVendidas, label: "Entradas vendidas" },
                ].map((s) => (
                  <div key={s.label} className="bg-card p-7 lg:p-8">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                      <s.icon size={18} aria-hidden="true" />
                    </span>
                    <dd className="mt-5 font-display text-5xl font-extrabold tabular-nums leading-none text-foreground lg:text-6xl">
                      {s.value.toLocaleString("es-AR")}
                    </dd>
                    <dt className="mt-2.5 font-mono text-2xs uppercase tracking-[0.1em] text-muted-foreground">{s.label}</dt>
                  </div>
                ))}
              </dl>
            )}

            <ul className="mb-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:mb-20 lg:grid-cols-4 lg:gap-6">
              {ORG_FEATURES.map((f) => (
                <li
                  key={f.title}
                  className="rounded-2xl border border-border-strong bg-card p-6 transition-[transform,box-shadow,border-color] duration-(--duration-base) ease-emphasized hover:-translate-y-1 hover:border-foreground hover:[box-shadow:6px_7px_0_0_var(--foreground)] lg:p-7"
                >
                  <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                    <f.icon size={21} aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 font-display text-base font-extrabold tracking-tight text-foreground">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </li>
              ))}
            </ul>

            <div id="como-funciona" className="mb-14 scroll-mt-20 lg:mb-20">
              <h3 className="mb-10 font-mono text-2xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">De cero a venta en minutos</h3>
              <ol className="relative grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
                <li aria-hidden="true" className="absolute left-[12.5%] right-[12.5%] top-7 hidden h-px bg-border-strong lg:block" />
                {ORG_STEPS.map((s) => (
                  <li key={s.num} className="relative flex flex-col items-start">
                    <span className="relative z-10 mb-4 flex size-14 items-center justify-center rounded-2xl bg-foreground font-mono text-xl font-bold tabular-nums text-background shadow-hard-sm">
                      {s.num}
                    </span>
                    <h4 className="mb-1.5 font-display text-base font-bold tracking-tight text-foreground">{s.title}</h4>
                    <p className="max-w-[16rem] text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                  </li>
                ))}
              </ol>
            </div>

            {paquetes.length > 0 && (
              <div id="precios" className="scroll-mt-20">
                <h3 className="mb-2 font-display text-2xl font-extrabold tracking-[-0.02em] text-foreground lg:text-3xl">Créditos simples y transparentes</h3>
                <p className="mb-8 text-sm text-muted-foreground">Cada crédito = un evento publicado. Sin suscripción mensual.</p>
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {paquetes.map((p, i) => (
                    <li
                      key={p.id}
                      className={cn(
                        "rounded-2xl border bg-card p-6 transition-transform duration-(--duration-fast) hover:-translate-y-0.5",
                        i === 0 ? "border-foreground shadow-hard" : "border-border-strong",
                      )}
                    >
                      <p className="mb-3 font-mono text-2xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{p.nombre}</p>
                      <p className="font-display text-4xl font-extrabold tabular-nums leading-none text-foreground">
                        {p.cantidadCreditos}
                        <span className="ml-1.5 align-middle text-sm font-semibold text-muted-foreground">créditos</span>
                      </p>
                      <p className="mt-2 font-mono text-lg font-semibold tabular-nums text-foreground">{fmt(p.precio)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* CTA final para organizadores */}
        <section id="empezar" aria-labelledby="cta-titulo" className="scroll-mt-20 border-t border-border px-4 py-16 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-4xl rounded-3xl border border-foreground bg-card p-8 shadow-hard sm:p-10 lg:p-14">
            <p className="mb-4 font-mono text-2xs font-semibold uppercase tracking-[0.2em] text-secondary">Empezá hoy</p>
            <h2 id="cta-titulo" className="mb-6 font-display text-4xl font-extrabold leading-[0.95] tracking-[-0.03em] text-foreground sm:text-5xl lg:text-6xl">
              Tu primer evento,
              <br />
              <span className="box-decoration-clone bg-accent px-2 text-accent-foreground">en minutos.</span>
            </h2>
            <p className="mb-9 max-w-md text-base leading-relaxed text-muted-foreground">
              Creá tu cuenta gratis, recibís créditos de bienvenida y publicás tu primer evento sin pagar nada.
            </p>
            <Link
              to="/organizador/registro"
              className="group/btn inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-8 font-display text-base font-bold text-primary-foreground shadow-hard-sm transition-colors duration-(--duration-base) hover:bg-accent hover:text-accent-foreground active:translate-y-0.5"
            >
              <Sparkles size={16} aria-hidden="true" className="transition-transform duration-(--duration-base) ease-emphasized group-hover/btn:-translate-y-px group-hover/btn:scale-110" />
              Crear cuenta gratis
              <ArrowRight size={16} aria-hidden="true" className="w-0 -translate-x-1 opacity-0 transition-all duration-(--duration-base) ease-emphasized group-hover/btn:w-4 group-hover/btn:translate-x-0 group-hover/btn:opacity-100" />
            </Link>
            {/* Solo afirmaciones que el producto cumple (antes: "Soporte 24/7", "Cancelá cuando quieras") */}
            <ul className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3">
              {["Sin tarjeta de crédito", "Sin suscripción mensual", "Créditos de bienvenida"].map((t) => (
                <li key={t} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Check size={14} aria-hidden="true" className="flex-none text-success" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-14">
          <div className="mb-10 grid grid-cols-2 gap-8 sm:grid-cols-3 lg:gap-10">
            <div className="col-span-2 sm:col-span-1 sm:max-w-xs">
              <BrandLogo className="mb-3" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                Plataforma de ticketing y control de accesos para organizadores independientes de Argentina.
              </p>
            </div>
            <nav aria-label="Producto">
              <p className="mb-4 font-mono text-2xs font-semibold uppercase tracking-[0.16em] text-foreground">Producto</p>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link to="/eventos" className="text-muted-foreground transition-colors hover:text-foreground">
                    Eventos
                  </Link>
                </li>
                <li>
                  <a href="#como-funciona" className="text-muted-foreground transition-colors hover:text-foreground">
                    Cómo funciona
                  </a>
                </li>
                <li>
                  <a href="#precios" className="text-muted-foreground transition-colors hover:text-foreground">
                    Precios
                  </a>
                </li>
                <li>
                  <Link to="/ayuda" className="text-muted-foreground transition-colors hover:text-foreground">
                    Ayuda
                  </Link>
                </li>
              </ul>
            </nav>
            <nav aria-label="Cuenta">
              <p className="mb-4 text-2xs font-semibold uppercase tracking-[0.16em] text-foreground">Cuenta</p>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link to="/organizador/login" className="text-muted-foreground transition-colors hover:text-foreground">
                    Soy organizador
                  </Link>
                </li>
                <li>
                  <Link to="/staff/login" className="text-muted-foreground transition-colors hover:text-foreground">
                    Soy staff
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
          <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} AsistíAPP · Buenos Aires, Argentina
            </p>
            <SupportContactLine />
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * Selector "Cuándo" del buscador del hero: popover editorial (borde 1px + sombra dura) con
 * opciones rápidas (Hoy / Esta semana / Este mes) y un rango exacto reusando `DateRangeFilter`.
 * Todo se resuelve a un rango `desde`/`hasta` que se pasa a `/eventos`.
 */
function HeroCuando({
  cuandoKey,
  desde,
  hasta,
  onChange,
}: {
  cuandoKey: CuandoKey;
  desde: string;
  hasta: string;
  onChange: (key: CuandoKey, desde: string, hasta: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const rapidas: { key: CuandoKey; label: string; rango: [string, string] }[] = [
    { key: "hoy", label: "Hoy", rango: [isoSumar(0), isoSumar(0)] },
    { key: "semana", label: "Esta semana", rango: [isoSumar(0), isoSumar(6)] },
    { key: "mes", label: "Este mes", rango: [isoSumar(0), isoSumar(29)] },
  ];

  const etiqueta =
    cuandoKey === "rango" && desde
      ? hasta && hasta !== desde
        ? `${fechaCorta(desde)} – ${fechaCorta(hasta)}`
        : fechaCorta(desde)
      : { todos: "Cualquier fecha", hoy: "Hoy", semana: "Esta semana", mes: "Este mes", rango: "Fechas elegidas" }[cuandoKey];

  return (
    <div ref={ref} className="relative flex flex-col gap-0.5 border-t border-border-strong px-4 py-3 sm:border-t-0">
      <span id="hero-cuando-label" className="font-mono text-2xs uppercase tracking-[0.1em] text-muted-foreground">
        Cuándo
      </span>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby="hero-cuando-label"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between gap-2 text-left text-sm font-medium outline-none lg:text-base"
      >
        <span className={cn("truncate", cuandoKey === "todos" ? "text-muted-foreground" : "text-foreground")}>{etiqueta}</span>
        <ChevronDown size={16} aria-hidden="true" className={cn("flex-none text-muted-foreground transition-transform duration-(--duration-fast)", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Elegir cuándo"
          className="absolute left-0 top-full z-50 mt-2 w-[clamp(15rem,80vw,18rem)] rounded-2xl border border-border-strong bg-popover p-2 shadow-hard animate-scale-in"
        >
          <div className="flex flex-col">
            {[{ key: "todos" as const, label: "Cualquier fecha", rango: ["", ""] as [string, string] }, ...rapidas].map((o) => {
              const activo = cuandoKey === o.key;
              return (
                <button
                  key={o.key}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => {
                    onChange(o.key, o.rango[0], o.rango[1]);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors duration-(--duration-fast)",
                    activo ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
                  )}
                >
                  {o.label}
                  {activo && <Check size={15} aria-hidden="true" className="flex-none" />}
                </button>
              );
            })}
          </div>

          <div className="my-2 border-t border-border" />
          <p className="px-3 pb-1.5 font-mono text-2xs uppercase tracking-[0.1em] text-muted-foreground">Fecha o rango exacto</p>
          <div className="px-2 pb-1">
            <DateRangeFilter
              desde={cuandoKey === "rango" ? desde : ""}
              hasta={cuandoKey === "rango" ? hasta : ""}
              onChange={(d, h) => (d || h ? onChange("rango", d, h) : onChange("todos", "", ""))}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Estado del carrusel (bordes y desplazamiento), compartido entre la pista y las flechas, que
 * viven en el encabezado de la sección (misma fila que el título y "Ver todos").
 */
function useNavCarrusel() {
  const pistaRef = useRef<HTMLUListElement>(null);
  const [alInicio, setAlInicio] = useState(true);
  const [alFinal, setAlFinal] = useState(false);

  const actualizarBordes = useCallback(() => {
    const el = pistaRef.current;
    if (!el) return;
    setAlInicio(el.scrollLeft <= 4);
    setAlFinal(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    window.addEventListener("resize", actualizarBordes);
    return () => window.removeEventListener("resize", actualizarBordes);
  }, [actualizarBordes]);

  const mover = useCallback((sentido: 1 | -1) => {
    const el = pistaRef.current;
    if (!el) return;
    const tarjeta = el.querySelector("li");
    const paso = (tarjeta?.getBoundingClientRect().width ?? el.clientWidth * 0.8) + 16;
    el.scrollBy({ left: paso * sentido, behavior: comportamientoScroll() });
  }, []);

  return { pistaRef, alInicio, alFinal, actualizarBordes, mover };
}

type NavCarrusel = ReturnType<typeof useNavCarrusel>;

/** Carrusel horizontal de los próximos eventos: se desplaza a mano (o con las flechas en desktop), sin avance automático. */
function Carrusel({
  eventos,
  etiquetaDe,
  nav,
}: {
  eventos: EventoPublicoListItemDTO[];
  etiquetaDe: (ev: EventoPublicoListItemDTO, i: number) => string | undefined;
  nav: NavCarrusel;
}) {
  const { pistaRef, actualizarBordes } = nav;
  // Al aparecer la pista (después de cargar los eventos) se calculan los bordes por primera vez.
  useEffect(actualizarBordes, [actualizarBordes]);

  return (
    <div>
      <ul
        ref={pistaRef}
        onScroll={actualizarBordes}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 hide-scrollbar lg:mx-0 lg:gap-6 lg:px-0"
      >
        {eventos.map((ev, i) => (
          <li key={ev.id} className="w-[86%] flex-none snap-start sm:w-[60%] lg:w-[calc((100%-1.5rem)/2)]">
            <EventCard evento={ev} etiqueta={etiquetaDe(ev, i)} prioridad={i < 4} />
          </li>
        ))}
      </ul>
    </div>
  );
}
