import type { ReactNode } from "react";
import { Link } from "react-router";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { AuthBackground } from "./AuthBackground";
import { ThemeToggle } from "./ThemeToggle";

/*
 * Panel de marca: SIEMPRE oscuro, independiente del tema (excepción documentada en
 * DESIGN.md). Por eso usa colores literales, centralizados acá en vez de repetidos en cada
 * pantalla de acceso.
 */
const MARCA_FONDO = "bg-[#09090b]";
const MARCA_ACENTO = "text-[#9cadd3]";

/** Palabra destacada en el título del panel de marca (siempre oscuro): usa el acento de la marca. */
export function MarcaAcento({ children }: { children: ReactNode }) {
  return <span className={MARCA_ACENTO}>{children}</span>;
}

export interface AuthBrand {
  title: ReactNode;
  description: string;
  features: { icon: LucideIcon; text: string }[];
}

interface AuthLayoutProps {
  /**
   * Panel de marca a la izquierda, solo en desktop (Organizador: ingreso, registro, recupero).
   * Sin `brand`, la tarjeta va centrada (Admin, Staff).
   */
  brand?: AuthBrand;
  /** Ancho de la tarjeta: `sm` para un login, `md` para formularios más largos (registro). */
  size?: "sm" | "md";
  children: ReactNode;
}

function Logo({ className, acento = "text-primary" }: { className?: string; acento?: string }) {
  return (
    <Link to="/" className={cn("rounded-md text-xl font-extrabold tracking-tight", className)} aria-label="AsistíAPP — volver al inicio">
      Asistí<span className={acento}>APP</span>
    </Link>
  );
}

/**
 * Estructura común de las pantallas de acceso (logins, registro, recupero de contraseña):
 * header con el logo (vuelve al inicio) y el tema, y una tarjeta con el formulario sobre el
 * fondo ambiente de marca. Reemplaza las cinco versiones que tenía cada pantalla.
 */
export function AuthLayout({ brand, size = "sm", children }: AuthLayoutProps) {
  return (
    <div className={cn("relative min-h-dvh bg-background", brand && "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]")}>
      {brand && (
        <aside className={cn("relative z-10 hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex xl:p-16", MARCA_FONDO)}>
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "22px 22px" }}
          />
          <Logo className="relative w-fit text-white" acento={MARCA_ACENTO} />
          <div className="relative max-w-md">
            <p className="text-4xl font-extrabold leading-tight tracking-tight">{brand.title}</p>
            <p className="mt-4 text-base leading-relaxed text-white/70">{brand.description}</p>
            <ul className="mt-10 space-y-4">
              {brand.features.map(({ icon: Icono, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm font-medium text-white/90">
                  <span className="flex size-9 flex-none items-center justify-center rounded-xl border border-white/10 bg-white/5">
                    <Icono size={16} aria-hidden="true" className={MARCA_ACENTO} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <p className="relative text-xs text-white/40">© {new Date().getFullYear()} AsistíAPP</p>
        </aside>
      )}

      <div className="relative flex min-h-dvh flex-col">
        <AuthBackground />
        <header className="relative z-10 flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          {/* Con panel de marca, el logo ya está a la izquierda en desktop */}
          <Logo className={cn("text-foreground", brand && "lg:invisible")} />
          <ThemeToggle variant="secondary" />
        </header>
        <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-12 pt-4 sm:px-6">
          <div
            className={cn(
              "w-full rounded-3xl border border-border bg-card/95 p-6 shadow-modal backdrop-blur-xl sm:p-8",
              size === "sm" ? "max-w-sm" : "max-w-md",
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

interface AuthHeaderProps {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
}

/** Encabezado de la tarjeta de acceso — el único `<h1>` de la pantalla. */
export function AuthHeader({ title, description, icon: Icono }: AuthHeaderProps) {
  return (
    <div className="mb-6">
      {Icono && (
        <span className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Icono size={20} aria-hidden="true" />
        </span>
      )}
      <h1 className="text-xl font-extrabold tracking-tight text-foreground">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
