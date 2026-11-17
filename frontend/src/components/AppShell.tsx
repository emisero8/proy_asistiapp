import type { CSSProperties } from "react";
import { Link, NavLink } from "react-router";
import { LogOut, type LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { AnimatedOutlet } from "./AnimatedOutlet";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { Button, IconButton } from "./ui";

export interface ShellNavItem {
  to: string;
  label: string;
  /** Versión corta para la barra inferior de mobile (5 pestañas comparten el ancho). */
  mobileLabel?: string;
  icon: LucideIcon;
}

interface AppShellProps {
  /** Navegación del sidebar (desktop). */
  nav: ShellNavItem[];
  /** Pestañas de la barra inferior (mobile), hasta 5. */
  mobileNav: ShellNavItem[];
  usuario: {
    nombre: string;
    rol: string;
    fotoUrl?: string | null;
    /** Si el rol tiene pantalla de perfil, el bloque de usuario del sidebar lleva ahí. */
    perfilTo?: string;
  };
  onLogout: () => void;
}

function Logo({ to }: { to: string }) {
  return (
    <Link to={to} className="rounded-md text-lg font-extrabold tracking-tight text-foreground">
      Asistí<span className="text-primary">APP</span>
    </Link>
  );
}

function Avatar({ nombre, foto, className }: { nombre: string; foto?: string | null; className?: string }) {
  return foto ? (
    <img src={foto} alt="" className={cn("flex-none rounded-full bg-muted object-cover", className)} />
  ) : (
    <span
      aria-hidden="true"
      className={cn("flex flex-none items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground", className)}
    >
      {nombre.charAt(0).toUpperCase() || "?"}
    </span>
  );
}

/**
 * Estructura de las secciones con sesión (Organizador y Admin) — un solo componente para las
 * dos, así se ven y se comportan igual:
 *
 * - **Desktop (md+):** sidebar fija de 208 px: logo + campanita, navegación, y abajo el usuario,
 *   el tema y "Salir". Nada flota sobre el contenido.
 * - **Mobile:** barra superior (logo, campanita, tema, salir) y barra de pestañas inferior.
 * - El contenido de cada ruta entra por `<AnimatedOutlet>`: al navegar se remonta solo eso.
 */
export function AppShell({ nav, mobileNav, usuario, onLogout }: AppShellProps) {
  const inicio = nav[0]?.to ?? "/";
  const columnas: CSSProperties = { gridTemplateColumns: `repeat(${mobileNav.length}, minmax(0, 1fr))` };

  const bloqueUsuario = (
    <>
      <Avatar nombre={usuario.nombre} foto={usuario.fotoUrl} className="size-8" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold leading-tight text-foreground">{usuario.nombre}</span>
        <span className="block truncate text-xs leading-tight text-muted-foreground">{usuario.rol}</span>
      </span>
    </>
  );

  return (
    <div className="min-h-dvh bg-background md:pl-52">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Saltar al contenido
      </a>

      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-52 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-16 flex-none items-center justify-between gap-2 pl-5 pr-3">
          <Logo to={inicio} />
          <NotificationBell placement="bottom-start" />
        </div>

        <nav aria-label="Principal" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {nav.map(({ to, label, icon: Icono }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors duration-(--duration-fast)",
                  // Marcador de sección activa: una barrita lima fina a la izquierda (identidad de la plataforma).
                  isActive
                    ? "relative bg-primary/10 font-semibold text-primary before:absolute before:left-0 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-accent"
                    : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              <Icono size={17} aria-hidden="true" className="flex-none" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex-none space-y-1 border-t border-border p-3">
          {usuario.perfilTo ? (
            <NavLink
              to={usuario.perfilTo}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors duration-(--duration-fast)",
                  isActive ? "bg-primary/10" : "hover:bg-muted",
                )
              }
            >
              <span className="sr-only">Mi perfil: </span>
              {bloqueUsuario}
            </NavLink>
          ) : (
            <div className="flex items-center gap-2.5 px-2 py-2">{bloqueUsuario}</div>
          )}
          <div className="flex items-center justify-between gap-2 pl-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" leftIcon={<LogOut size={15} />} onClick={onLogout} className="text-muted-foreground">
              Salir
            </Button>
          </div>
        </div>
      </aside>

      {/* Barra superior — mobile */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border bg-background/90 pl-4 pr-2 backdrop-blur-md md:hidden">
        <Logo to={inicio} />
        <div className="flex items-center gap-0.5">
          <NotificationBell placement="bottom-end" />
          <ThemeToggle />
          <IconButton label="Cerrar sesión" icon={<LogOut size={16} />} onClick={onLogout} round tooltip={false} />
        </div>
      </header>

      <main id="contenido" tabIndex={-1} className="pb-[calc(4.5rem+env(safe-area-inset-bottom))] focus:outline-none md:pb-0">
        <AnimatedOutlet variant="content" />
      </main>

      {/* Pestañas — mobile */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <div className="mx-auto grid max-w-lg" style={columnas}>
          {mobileNav.map(({ to, label, mobileLabel, icon: Icono }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-2xs font-semibold transition-colors duration-(--duration-fast)",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span aria-hidden="true" className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-accent" />}
                  <Icono size={19} aria-hidden="true" />
                  <span className="max-w-full truncate">{mobileLabel ?? label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
