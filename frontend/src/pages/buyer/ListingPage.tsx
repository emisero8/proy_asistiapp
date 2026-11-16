import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink } from "react-router";
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  LogIn,
  ShieldCheck,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
  Wallet,
  Zap,
  CalendarSearch,
} from "lucide-react";
import { EventCard, EventCardSkeleton } from "../../components/EventCard";
import { SupportContactLine } from "../../components/SupportContactLine";
import { ThemeToggle } from "../../components/ThemeToggle";
import { EmptyState, ErrorState, IconButton } from "../../components/ui";
import { api, ApiError } from "../../lib/api";
import { cn } from "../../lib/cn";
import { fmt, hoyLocal } from "../../lib/format";
import { comportamientoScroll } from "../../lib/motion";
import type { EstadisticasPublicasResponseDTO, EventoPublicoListItemDTO, PaqueteCreditoDisponibleDTO } from "../../lib/types";

/** Con hasta esta cantidad de eventos se muestra una sola grilla (un carrusel de 3 tarjetas se ve vacío). */
const MAX_SOLO_GRILLA = 4;
const EN_CARRUSEL = 6;
const EN_GRILLA = 8;

const TICKER_ITEMS = [
  "Sin comisión para el organizador",
  "Entradas 100% digitales",
  "Validación QR en la puerta",
  "Sin filas, sin papel",
];

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
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Para organizadores", href: "#para-organizadores" },
  { label: "Precios", href: "#precios" },
];

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
  const hayShowsHoy = ordenados.some((e) => e.fechaEvento === hoyStr);

  // Sin repetir eventos: antes "Destacados" eran los primeros 6 de la misma lista que la grilla
  // de abajo, así que esos 6 aparecían dos veces seguidas.
  const soloGrilla = ordenados.length <= MAX_SOLO_GRILLA;
  const carrusel = soloGrilla ? [] : ordenados.slice(0, EN_CARRUSEL);
  const grilla = soloGrilla ? ordenados : ordenados.slice(EN_CARRUSEL, EN_CARRUSEL + EN_GRILLA);
  const etiquetaDe = (ev: EventoPublicoListItemDTO, i: number) =>
    ev.fechaEvento === hoyStr ? "Hoy" : i === 0 && ev === ordenados[0] ? "Próximo" : undefined;

  const nav = useNavCarrusel();

  const [scrolled, setScrolled] = useState(false);
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
          scrolled ? "border-border bg-background/90 backdrop-blur-md" : "border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-6">
            <Link to="/" className="flex-none rounded-md text-lg font-extrabold tracking-tight text-foreground">
              Asistí<span className="text-primary">APP</span>
            </Link>
            <nav aria-label="Principal" className="flex items-center gap-1">
              <NavLink
                to="/eventos"
                className="inline-flex h-9 items-center rounded-xl px-3 text-sm font-semibold text-foreground transition-colors duration-(--duration-fast) hover:bg-muted"
              >
                Eventos
              </NavLink>
              {NAV_LINKS.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  className="hidden h-9 items-center rounded-xl px-3 text-sm text-muted-foreground transition-colors duration-(--duration-fast) hover:bg-muted hover:text-foreground lg:inline-flex"
                >
                  {l.label}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex flex-none items-center gap-1 sm:gap-2">
            <Link
              to="/organizador/login"
              aria-label="Ingresar (organizadores)"
              className="inline-flex size-9 items-center justify-center rounded-xl text-sm font-semibold text-foreground transition-colors duration-(--duration-fast) hover:bg-muted sm:w-auto sm:px-3"
            >
              <LogIn size={16} aria-hidden="true" className="sm:hidden" />
              <span className="hidden sm:inline">Ingresar</span>
            </Link>
            <Link
              to="/organizador/registro"
              className="inline-flex h-9 items-center rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors duration-(--duration-fast) hover:bg-primary/90 sm:px-4 sm:text-sm"
            >
              <span className="sm:hidden">Organizador</span>
              <span className="hidden sm:inline">Soy organizador</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main>
        {/* Hero — el banner de entradas apenas difuminado, con degradé hacia el fondo para que el titular se lea */}
        <section className="relative -mt-16 flex min-h-[60vh] items-center justify-center overflow-hidden px-4 pt-16">
          <div className="absolute inset-0" aria-hidden="true">
            <img src="/ticket2.webp" alt="" className="size-full scale-105 object-cover opacity-70 blur-[2px] dark:opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
          </div>

          <div className="relative mx-auto flex max-w-3xl flex-col items-center py-16 text-center animate-fade-in-up">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-2xs font-semibold uppercase tracking-[0.16em] text-foreground backdrop-blur-md">
              <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
              {hayShowsHoy ? "Hay shows hoy" : "Entradas 100% digitales"}
            </span>
            <h1 className="mb-5 font-display text-4xl font-extrabold uppercase leading-[0.95] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Viví el show
              <br />
              <span className="text-secondary">en primera fila</span>
            </h1>
            <p className="mb-8 max-w-md text-sm text-muted-foreground lg:text-base">
              Encontrá los próximos recitales y fiestas, comprá tu entrada digital y entrá con un QR — sin filas, sin papel.
            </p>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <a
                href="#eventos"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-7 text-sm font-semibold text-primary-foreground transition-colors duration-(--duration-fast) hover:bg-primary/90 active:scale-[0.98]"
              >
                Ver eventos
                <ArrowRight size={16} aria-hidden="true" />
              </a>
              <Link
                to="/organizador/registro"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-border-strong bg-card/80 px-7 text-sm font-semibold text-foreground backdrop-blur-md transition-colors duration-(--duration-fast) hover:bg-card"
              >
                Publicá tu evento
              </Link>
            </div>
          </div>
        </section>

        {/* Ticker */}
        <div className="overflow-hidden border-y border-border bg-card/60 py-2.5" aria-hidden="true">
          <div className="flex w-max marquee-track">
            {[0, 1].map((copia) => (
              <div key={copia} className="flex flex-none items-center">
                {TICKER_ITEMS.map((item) => (
                  <span
                    key={item}
                    className="flex items-center gap-2 whitespace-nowrap px-6 text-2xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
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
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6" aria-busy="true">
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
              <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
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

        {/* Por qué comprar acá */}
        <section aria-labelledby="ventajas-titulo" className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
            <h2 id="ventajas-titulo" className="mb-8 text-center font-display text-xl font-extrabold uppercase tracking-tight text-foreground lg:text-2xl">
              Tu entrada, <span className="text-secondary">sin vueltas</span>
            </h2>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-6">
              {FEATURES.map((f) => (
                <li key={f.title} className="rounded-2xl border border-border bg-card p-5">
                  <span className="mb-3 flex size-10 items-center justify-center rounded-xl bg-secondary/12 text-secondary">
                    <f.icon size={18} aria-hidden="true" />
                  </span>
                  <h3 className="mb-1 text-sm font-semibold text-foreground">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Para organizadores — marketing al pie, debajo del catálogo (que sigue siendo lo primero) */}
        <section id="para-organizadores" aria-labelledby="org-titulo" className="scroll-mt-16 border-t border-border">
          <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8 lg:py-20">
            <div className="mx-auto mb-10 max-w-xl text-center lg:mb-14">
              <p className="mb-2 text-2xs font-semibold uppercase tracking-[0.16em] text-secondary">Para organizadores</p>
              <h2 id="org-titulo" className="mb-3 font-display text-2xl font-extrabold uppercase tracking-tight text-foreground lg:text-3xl">
                Vendé entradas, <span className="text-secondary">sin comisión</span>
              </h2>
              <p className="text-sm text-muted-foreground lg:text-base">
                Publicá tu evento, vendé online o en la puerta y validá cada entrada con QR — todo desde un mismo panel.
              </p>
            </div>

            {/* Solo con números reales: un "0 · 0 · 0" en una página de marketing resta confianza. */}
            {stats && stats.eventosPublicados + stats.organizadoresActivos + stats.entradasVendidas > 0 && (
              <dl className="mx-auto mb-12 grid max-w-2xl grid-cols-3 gap-3 sm:gap-4 lg:mb-16">
                {[
                  { icon: Calendar, value: stats.eventosPublicados, label: "Eventos publicados" },
                  { icon: Users, value: stats.organizadoresActivos, label: "Organizadores activos" },
                  { icon: Ticket, value: stats.entradasVendidas, label: "Entradas vendidas" },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-border bg-card p-4 text-center sm:p-5">
                    <s.icon size={18} aria-hidden="true" className="mx-auto mb-2 text-secondary" />
                    <dd className="text-xl font-extrabold tabular-nums leading-none text-foreground sm:text-2xl lg:text-3xl">
                      {s.value.toLocaleString("es-AR")}
                    </dd>
                    <dt className="mt-1.5 text-xs leading-tight text-muted-foreground">{s.label}</dt>
                  </div>
                ))}
              </dl>
            )}

            <ul className="mb-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mb-20 lg:grid-cols-4">
              {ORG_FEATURES.map((f) => (
                <li key={f.title} className="rounded-2xl border border-border bg-card p-5">
                  <span className="mb-3 flex size-10 items-center justify-center rounded-xl bg-secondary/12 text-secondary">
                    <f.icon size={18} aria-hidden="true" />
                  </span>
                  <h3 className="mb-1 text-sm font-semibold text-foreground">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </li>
              ))}
            </ul>

            <div id="como-funciona" className="mb-14 scroll-mt-20 lg:mb-20">
              <h3 className="mb-10 text-center text-lg font-bold text-foreground">De cero a venta en minutos</h3>
              <ol className="relative grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
                <li aria-hidden="true" className="absolute left-[12.5%] right-[12.5%] top-7 hidden h-px bg-border-strong lg:block" />
                {ORG_STEPS.map((s) => (
                  <li key={s.num} className="relative flex flex-col items-center text-center">
                    <span className="relative z-10 mb-4 flex size-14 items-center justify-center rounded-2xl border border-secondary/40 bg-background text-lg font-extrabold text-secondary">
                      {s.num}
                    </span>
                    <h4 className="mb-1.5 text-sm font-semibold text-foreground">{s.title}</h4>
                    <p className="max-w-[15rem] text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                  </li>
                ))}
              </ol>
            </div>

            {paquetes.length > 0 && (
              <div id="precios" className="scroll-mt-20">
                <h3 className="mb-2 text-center text-lg font-bold text-foreground">Créditos simples y transparentes</h3>
                <p className="mb-8 text-center text-sm text-muted-foreground">Cada crédito = un evento publicado. Sin suscripción mensual.</p>
                <ul className="flex flex-wrap justify-center gap-4">
                  {paquetes.map((p) => (
                    <li key={p.id} className="w-full rounded-2xl border border-border bg-card p-6 text-center sm:w-60">
                      <p className="mb-2 text-2xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{p.nombre}</p>
                      <p className="text-3xl font-extrabold tabular-nums text-foreground">
                        {p.cantidadCreditos}
                        <span className="ml-1.5 text-sm font-semibold text-muted-foreground">créditos</span>
                      </p>
                      <p className="mt-1 text-lg font-bold tabular-nums text-primary">{fmt(p.precio)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* CTA final para organizadores */}
        <section aria-labelledby="cta-titulo" className="border-t border-border bg-card/40 px-4 py-20 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-4 text-2xs font-semibold uppercase tracking-[0.2em] text-secondary">Empezá hoy</p>
            <h2 id="cta-titulo" className="mb-5 font-display text-3xl font-extrabold uppercase leading-tight text-foreground sm:text-4xl lg:text-5xl">
              Tu primer evento,
              <br />
              en minutos.
            </h2>
            <p className="mx-auto mb-9 max-w-md text-sm leading-relaxed text-muted-foreground lg:text-base">
              Creá tu cuenta gratis, recibís créditos de bienvenida y publicás tu primer evento sin pagar nada.
            </p>
            <Link
              to="/organizador/registro"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground transition-colors duration-(--duration-fast) hover:bg-primary/90 active:scale-[0.98]"
            >
              Crear cuenta gratis
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            {/* Solo afirmaciones que el producto cumple (antes: "Soporte 24/7", "Cancelá cuando quieras") */}
            <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
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
              <p className="mb-3 text-base font-extrabold text-foreground">
                Asistí<span className="text-primary">APP</span>
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Plataforma de ticketing y control de accesos para organizadores independientes de Argentina.
              </p>
            </div>
            <nav aria-label="Producto">
              <p className="mb-4 text-2xs font-semibold uppercase tracking-[0.16em] text-foreground">Producto</p>
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
          <li key={ev.id} className="w-[62%] flex-none snap-start sm:w-[38%] lg:w-[calc((100%-4.5rem)/4)]">
            <EventCard evento={ev} etiqueta={etiquetaDe(ev, i)} prioridad={i < 4} />
          </li>
        ))}
      </ul>
    </div>
  );
}
