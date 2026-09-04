import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { MapPin, Calendar, Sparkles, ArrowRight, Zap, ShieldCheck, TrendingUp, Wallet, Users, Ticket, Check } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { fmt, formatFecha } from "../../lib/format";
import type { EstadisticasPublicasResponseDTO, EventoPublicoListItemDTO, PaqueteCreditoDisponibleDTO } from "../../lib/types";

const EVENTOS_HOME = 16; // 4 filas de 4 columnas en desktop

const TICKER_ITEMS = [
  "Sin comisión para el organizador",
  "Entradas 100% digitales",
  "Validación QR en la puerta",
  "Sin filas, sin papel",
];

const FEATURES = [
  { icon: Zap, title: "Entrega instantánea", desc: "La entrada llega a tu teléfono al toque, con QR único." },
  { icon: ShieldCheck, title: "Acceso verificado", desc: "Cada QR se valida una sola vez en la puerta, sin reventa." },
  { icon: TrendingUp, title: "Sin comisión oculta", desc: "El organizador vende directo — vos pagás lo que ves." },
];

const ORG_FEATURES = [
  { icon: Sparkles, title: "Wizard de eventos", desc: "Creá un evento completo con tandas y cupos en menos de 3 minutos." },
  { icon: Wallet, title: "Créditos prepagos", desc: "Cargás créditos una vez y publicás los eventos que quieras. Sin comisión por venta." },
  { icon: ShieldCheck, title: "Control en tiempo real", desc: "Tu staff valida entradas con QR, sin planillas ni entradas duplicadas." },
  { icon: TrendingUp, title: "Métricas en vivo", desc: "Dashboard con ventas y validaciones actualizadas al instante, por tanda." },
];

const ORG_STEPS = [
  { num: "01", title: "Creá tu cuenta", desc: "Registro gratuito en 2 minutos. Recibís créditos de bienvenida sin tarjeta." },
  { num: "02", title: "Configurá tu evento", desc: "Nombre, fecha, lugar y tandas de precios en un wizard claro." },
  { num: "03", title: "Compartí el link", desc: "Los compradores pagan sin registrarse. La entrada llega al instante." },
  { num: "04", title: "Controlá accesos", desc: "Tu staff escanea QRs en la puerta, validación instantánea." },
];

const NAV_LINKS = [
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Para organizadores", href: "#para-organizadores" },
  { label: "Precios", href: "#precios" },
];

export function ListingPage() {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState<EventoPublicoListItemDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<EstadisticasPublicasResponseDTO | null>(null);
  const [paquetes, setPaquetes] = useState<PaqueteCreditoDisponibleDTO[]>([]);

  useEffect(() => {
    api
      .get<EventoPublicoListItemDTO[]>("/public/eventos", { skipAuth: true })
      .then(setEventos)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "No pudimos cargar los eventos."));
    api
      .get<EstadisticasPublicasResponseDTO>("/public/estadisticas", { skipAuth: true })
      .then(setStats)
      .catch(() => {});
    api
      .get<PaqueteCreditoDisponibleDTO[]>("/public/paquetes-credito", { skipAuth: true })
      .then(setPaquetes)
      .catch(() => {});
  }, []);

  const ordenados = useMemo(
    () => [...(eventos ?? [])].sort((a, b) => a.fechaEvento.localeCompare(b.fechaEvento)),
    [eventos],
  );

  const destacados = ordenados.slice(0, 6);

  const hoyStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const hayShowsHoy = ordenados.some((e) => e.fechaEvento === hoyStr);

  const carruselRef = useRef<HTMLDivElement>(null);
  const [pausado, setPausado] = useState(false);

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (pausado || destacados.length < 2) return;
    const el = carruselRef.current;
    if (!el) return;

    const id = setInterval(() => {
      const tarjeta = el.firstElementChild as HTMLElement | null;
      const avance = (tarjeta?.getBoundingClientRect().width ?? el.clientWidth * 0.6) + 12; // ancho de tarjeta + gap
      const alFinal = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      el.scrollTo({ left: alFinal ? 0 : el.scrollLeft + avance, behavior: "smooth" });
    }, 2200);

    return () => clearInterval(id);
  }, [pausado, destacados.length]);

  const visibles = ordenados.slice(0, EVENTOS_HOME);

  return (
    <div className="min-h-screen bg-background">
      {/* Header — fijo al hacer scroll, con blur y borde que aparecen recién al bajar */}
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/90 backdrop-blur-md border-b border-border" : "bg-transparent"}`}>
        <div className="max-w-[1800px] mx-auto pl-4 pr-16 lg:pl-8 lg:pr-20 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h2 className="text-lg font-extrabold text-foreground tracking-tight">
              Asistí<span className="text-primary">APP</span>
            </h2>
            <div className="hidden lg:flex items-center gap-6">
              {NAV_LINKS.map((l) => (
                <a key={l.label} href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {l.label}
                </a>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate("/organizador/login")}
              className="hidden sm:block px-4 py-2 rounded-xl text-sm text-foreground hover:bg-muted transition-colors font-medium"
            >
              Ingresar
            </button>
            <button
              onClick={() => navigate("/organizador/registro")}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all shadow-md shadow-primary/25"
            >
              Crear cuenta gratis
            </button>
          </div>
        </div>
      </nav>

      {/* HERO — banner de entradas de fondo, apenas difuminado (es un gráfico prolijo, no una foto ruidosa),
          con degradé hacia el fondo del tema para que el titular quede legible arriba. */}
      <section className="relative overflow-hidden min-h-[62vh] flex items-center justify-center px-4">
        <div className="absolute inset-0 z-0">
          <img
            src="/ticket2.png"
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover opacity-70 dark:opacity-40 blur-[2px] scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center py-16 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 mb-6">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-accent">
              {hayShowsHoy ? "Hay shows hoy" : "Entradas 100% digitales"}
            </span>
          </div>

          <h1 className="font-display uppercase font-extrabold leading-[0.95] text-4xl sm:text-5xl lg:text-6xl tracking-tight mb-5 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/50">
            Viví el show
            <br />
            en primera fila
          </h1>
          <p className="text-sm lg:text-base text-muted-foreground max-w-md mb-8">
            Encontrá los próximos recitales y fiestas, comprá tu entrada digital y entrá con un QR — sin filas, sin papel.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <a
              href="#eventos-grid"
              className="px-7 py-3.5 rounded-2xl bg-accent text-accent-foreground font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-2 hover:opacity-90 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200"
            >
              Ver eventos
              <ArrowRight size={16} />
            </a>
            <button
              onClick={() => navigate("/organizador/registro")}
              className="px-7 py-3.5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/15 text-foreground font-bold text-sm uppercase tracking-wide hover:bg-white/10 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200"
            >
              Publicá tu evento
            </button>
          </div>
        </div>
      </section>

      {/* Destacados — carrusel horizontal con las portadas reales de los próximos eventos */}
      {destacados.length > 0 && (
        <div className="mb-6 -mt-2">
          <div
            ref={carruselRef}
            onMouseEnter={() => setPausado(true)}
            onMouseLeave={() => setPausado(false)}
            onTouchStart={() => setPausado(true)}
            className="flex gap-3 lg:gap-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory px-4 lg:px-8 pb-1"
          >
            {destacados.map((ev, i) => (
              <button
                key={ev.id}
                onClick={() => navigate(`/eventos/${ev.urlPublica}`)}
                style={{ animationDelay: `${i * 60}ms` }}
                className="group relative flex-none w-[62%] sm:w-[30%] lg:w-[19%] aspect-[3/4] snap-start rounded-2xl overflow-hidden bg-muted border border-border focus:outline-none shadow-lg shadow-transparent hover:shadow-primary/30 hover:-translate-y-1.5 transition-all duration-300 animate-fade-in-up"
              >
                {ev.imagenPortadaUrl ? (
                  <img
                    src={ev.imagenPortadaUrl}
                    alt={ev.nombre}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/30 via-card to-background flex items-center justify-center">
                    <Sparkles size={28} className="text-primary/50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                {i === 0 && (
                  <span className="absolute top-2.5 left-2.5 px-2 py-1 rounded-lg bg-accent text-accent-foreground text-[9px] font-extrabold uppercase tracking-widest">
                    Próximo
                  </span>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
                  <p className="text-white font-extrabold text-sm leading-tight line-clamp-2">{ev.nombre}</p>
                  <p className="text-white/70 text-[11px] mt-1">{formatFecha(ev.fechaEvento)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ticker */}
      <div className="overflow-hidden border-y border-border bg-card/60 py-2.5 mb-6">
        <div className="flex w-max marquee-track">
          {[0, 1].map((copia) => (
            <div key={copia} className="flex items-center flex-none">
              {TICKER_ITEMS.map((item) => (
                <span key={item} className="flex items-center gap-2 px-6 text-[11px] font-bold tracking-widest uppercase text-muted-foreground whitespace-nowrap">
                  <span className="text-primary">✦</span>
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div id="eventos-grid" className="max-w-5xl mx-auto px-4 lg:px-8 pb-6 lg:pb-10 scroll-mt-4">
        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-sm p-4">
            {error}
          </div>
        )}

        {!error && eventos === null && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        )}

        {!error && eventos !== null && visibles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-4xl mb-3">🎭</p>
            <p className="text-sm text-muted-foreground">Todavía no hay eventos publicados.</p>
          </div>
        )}

        {!error && visibles.length > 0 && (
          <>
            <p className="font-display uppercase text-lg lg:text-xl font-extrabold text-foreground tracking-tight mb-4">
              Próximos eventos
            </p>
            <div className="relative">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
                {visibles.map((ev, i) => (
                  <button
                    key={ev.id}
                    onClick={() => navigate(`/eventos/${ev.urlPublica}`)}
                    style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                    className="group text-left focus:outline-none animate-fade-in-up"
                  >
                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted border border-border shadow-lg shadow-transparent group-hover:shadow-primary/25 group-hover:-translate-y-1 transition-all duration-300">
                      {ev.imagenPortadaUrl ? (
                        <img
                          src={ev.imagenPortadaUrl}
                          alt={ev.nombre}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 via-card to-background flex items-center justify-center">
                          <Sparkles size={22} className="text-primary/40" />
                        </div>
                      )}
                      {ev.precioDesde !== null && (
                        <span className="absolute top-2.5 right-2.5 bg-background/85 backdrop-blur-sm text-accent text-[11px] font-bold px-2.5 py-1 rounded-full">
                          Desde {fmt(ev.precioDesde)}
                        </span>
                      )}
                    </div>
                    <div className="mt-2.5">
                      <h3 className="text-foreground font-semibold text-sm leading-snug line-clamp-2">{ev.nombre}</h3>
                      <p className="text-muted-foreground text-xs mt-1 flex items-center gap-1">
                        <Calendar size={11} />
                        {formatFecha(ev.fechaEvento)}
                      </p>
                      <p className="text-muted-foreground text-xs mt-0.5 flex items-center gap-1">
                        <MapPin size={11} />
                        <span className="truncate">{ev.lugar}</span>
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {ordenados.length > EVENTOS_HOME && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 sm:h-56 lg:h-64 bg-gradient-to-b from-background/0 via-background/75 to-background" />
              )}
            </div>

            {ordenados.length > EVENTOS_HOME && (
              <div className="flex justify-center -mt-10 sm:-mt-12 relative">
                <button
                  onClick={() => navigate("/eventos")}
                  className="px-7 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center gap-2 shadow-xl shadow-primary/30 hover:opacity-90 hover:scale-[1.04] active:scale-[0.97] transition-all duration-200"
                >
                  Ir a ver todos los eventos
                  <ArrowRight size={15} className="animate-[bounce-x_1.4s_ease-in-out_infinite]" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Showcase — por qué comprar acá, mismo trío de íconos que usa el login de organizador */}
      <div className="border-t border-border bg-card/40">
        <div className="max-w-[1800px] mx-auto px-4 lg:px-8 py-12 lg:py-14">
          <h2 className="font-display uppercase text-xl lg:text-2xl font-extrabold text-foreground tracking-tight text-center mb-8">
            Tu entrada, <span className="text-primary">sin vueltas</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl bg-card border border-border p-5 text-center sm:text-left transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 mx-auto sm:mx-0">
                  <f.icon size={18} className="text-primary" />
                </div>
                <h3 className="text-foreground font-bold text-sm mb-1">{f.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Para organizadores — sección de marketing al pie, debajo del catálogo (que sigue siendo lo primero) */}
      <div id="para-organizadores" className="relative overflow-hidden border-t border-border bg-background scroll-mt-16">
        <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[32rem] h-[32rem] rounded-full bg-primary/[0.08] blur-[110px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 translate-x-1/2 w-[26rem] h-[26rem] rounded-full bg-accent/[0.06] blur-[100px] pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.05] text-foreground pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />

        <div className="relative max-w-[1800px] mx-auto px-4 lg:px-8 py-14 lg:py-20">
          <div className="text-center max-w-xl mx-auto mb-10 lg:mb-14">
            <p className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase mb-2">Para organizadores</p>
            <h2 className="font-display uppercase text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight mb-3">
              Vendé entradas, <span className="text-primary">sin comisión</span>
            </h2>
            <p className="text-sm lg:text-base text-muted-foreground">
              Publicá tu evento, vendé online o en la puerta y validá cada entrada con QR — todo desde un mismo panel.
            </p>
          </div>

          {stats && (
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-12 lg:mb-16 max-w-2xl mx-auto">
              {[
                { icon: Calendar, value: stats.eventosPublicados, label: "Eventos publicados", color: "text-violet-400", bg: "bg-violet-400/10" },
                { icon: Users, value: stats.organizadoresActivos, label: "Organizadores activos", color: "text-emerald-400", bg: "bg-emerald-400/10" },
                { icon: Ticket, value: stats.entradasVendidas, label: "Entradas vendidas", color: "text-sky-400", bg: "bg-sky-400/10" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl bg-card border border-border p-4 sm:p-5 text-center">
                  <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-2.5 mx-auto`}>
                    <s.icon size={16} className={s.color} />
                  </div>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground leading-none">{s.value.toLocaleString("es-AR")}</p>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1.5 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12 lg:mb-16">
            {ORG_FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl bg-card border border-border p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <f.icon size={18} className="text-primary" />
                </div>
                <h3 className="text-foreground font-bold text-sm mb-1">{f.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          <div id="como-funciona" className="mb-12 lg:mb-16 scroll-mt-20">
            <h3 className="text-center text-lg font-extrabold text-foreground mb-10">De cero a venta en minutos</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 relative">
              <div className="hidden lg:block absolute top-7 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
              {ORG_STEPS.map((s) => (
                <div key={s.num} className="relative flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-background border border-primary/30 flex items-center justify-center mb-4 relative z-10 shadow-lg shadow-primary/10">
                    <span className="text-lg font-extrabold text-primary">{s.num}</span>
                  </div>
                  <h4 className="text-sm font-bold text-foreground mb-1.5">{s.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-[15rem]">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {paquetes.length > 0 && (
            <div id="precios" className="mb-12 lg:mb-14 scroll-mt-20">
              <h3 className="text-center text-lg font-extrabold text-foreground mb-2">Créditos simples y transparentes</h3>
              <p className="text-center text-xs text-muted-foreground mb-8">Cada crédito = un evento publicado. Sin suscripción mensual.</p>
              <div className="flex flex-wrap justify-center gap-4">
                {paquetes.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-border bg-card p-6 text-center w-full sm:w-60 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{p.nombre}</p>
                    <p className="text-3xl font-extrabold text-foreground">
                      {p.cantidadCreditos}
                      <span className="text-sm font-semibold text-muted-foreground ml-1.5">créditos</span>
                    </p>
                    <p className="text-lg font-extrabold text-accent mt-1">{fmt(p.precio)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <button
              onClick={() => navigate("/organizador/registro")}
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200"
            >
              Crear cuenta gratis
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Empezá hoy — CTA final antes del footer */}
      <section className="relative overflow-hidden border-t border-border py-20 lg:py-32">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[26rem] rounded-full bg-primary/10 blur-[120px]" />
        </div>
        <div className="relative max-w-2xl mx-auto px-4 text-center">
          <p className="text-primary text-[10px] font-bold tracking-[0.25em] uppercase mb-4">Empezá hoy</p>
          <h2 className="font-display uppercase text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-5 leading-tight">
            Tu primer evento,
            <br />
            en 3 minutos.
          </h2>
          <p className="text-sm lg:text-base text-muted-foreground mb-9 max-w-md mx-auto leading-relaxed">
            Creá tu cuenta gratis, recibís créditos de bienvenida y publicás tu primer evento sin pagar nada.
          </p>
          <button
            onClick={() => navigate("/organizador/registro")}
            className="px-9 py-4 lg:px-11 lg:py-5 rounded-2xl bg-primary text-primary-foreground font-extrabold text-base lg:text-lg hover:opacity-90 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 shadow-2xl shadow-primary/30"
          >
            Crear cuenta gratis →
          </button>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-7 mt-8">
            {["Sin tarjeta de crédito", "Soporte 24/7", "Cancelá cuando quieras"].map((t) => (
              <span key={t} className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Check size={11} className="text-emerald-400 flex-none" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-[1800px] mx-auto px-4 lg:px-8 py-12 lg:py-14">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 lg:gap-10 mb-10">
            <div className="col-span-2 sm:col-span-1 sm:max-w-xs">
              <h2 className="text-base font-extrabold text-foreground mb-3">
                Asistí<span className="text-primary">APP</span>
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Plataforma de ticketing y control de accesos para organizadores independientes de Argentina.
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-foreground uppercase tracking-widest mb-4">Producto</p>
              <div className="space-y-3">
                <a href="#como-funciona" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Cómo funciona
                </a>
                <a href="#para-organizadores" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Para organizadores
                </a>
                <a href="#precios" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Precios
                </a>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-foreground uppercase tracking-widest mb-4">Cuenta</p>
              <div className="space-y-3">
                <button onClick={() => navigate("/organizador/login")} className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Soy organizador
                </button>
                <button onClick={() => navigate("/staff/login")} className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Soy staff
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-6">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Asistí<span className="text-primary font-bold">APP</span> · Buenos Aires, Argentina
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
