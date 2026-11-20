import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { AuthBackground } from "./AuthBackground";
import { BrandLogo } from "./BrandLogo";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Palabra destacada en el título del panel de marca: lavanda (`secondary`), la identidad de
 * apoyo. Adapta al tema igual que el resto del panel (ya no es un hex fijo).
 */
export function MarcaAcento({ children }: { children: ReactNode }) {
  return <span className="text-secondary">{children}</span>;
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

/**
 * Estructura común de las pantallas de acceso (logins, registro, recupero de contraseña):
 * header con el logo (vuelve al inicio) y el tema, y una tarjeta con el formulario sobre el
 * fondo ambiente de marca. Reemplaza las cinco versiones que tenía cada pantalla.
 */
export function AuthLayout({ brand, size = "sm", children }: AuthLayoutProps) {
  return (
    <div className={cn("relative min-h-dvh bg-background", brand && "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]")}>
      {brand && (
        // Panel de marca editorial, adaptable al tema: papel hundido + carbón en claro, carbón
        // profundo + papel en oscuro (token `surface-sunken`), con borde de 1px. El acento lima
        // lo aporta el isotipo del ticket (`BrandLogo`); el lavanda (`secondary`), la identidad.
        <aside className="relative z-10 hidden flex-col justify-between overflow-hidden border-r border-border bg-surface-sunken p-12 text-foreground lg:flex xl:p-16">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: "radial-gradient(circle, var(--foreground) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
          />
          <BrandLogo size="xl" className="relative w-fit" />
          <div className="relative max-w-md">
            <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
              <span aria-hidden="true">✦</span> AsistíAPP para organizadores
            </p>
            <p className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight">{brand.title}</p>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">{brand.description}</p>
            <ul className="mt-10 space-y-3">
              {brand.features.map(({ icon: Icono, text }) => (
                <li key={text} className="flex items-center gap-3 border-t border-border pt-3 text-sm font-medium text-foreground first:border-t-0 first:pt-0">
                  <span className="flex size-9 flex-none items-center justify-center rounded-lg border border-border bg-muted">
                    <Icono size={16} aria-hidden="true" className="text-secondary" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <p className="relative font-mono text-xs text-muted-foreground">© {new Date().getFullYear()} AsistíAPP</p>
        </aside>
      )}

      <div className="relative flex min-h-dvh flex-col">
        <AuthBackground />
        <header className="relative z-10 flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          {/* Con panel de marca, el logo ya está a la izquierda en desktop */}
          <BrandLogo className={cn(brand && "lg:invisible")} />
          <ThemeToggle variant="secondary" />
        </header>
        <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-12 pt-4 sm:px-6">
          <div
            className={cn(
              "w-full rounded-2xl border border-foreground bg-card p-6 shadow-hard sm:p-8",
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
        <span className="mb-4 flex size-11 items-center justify-center rounded-xl border border-foreground bg-primary text-primary-foreground shadow-hard-sm">
          <Icono size={20} aria-hidden="true" />
        </span>
      )}
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">{title}</h1>
      {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
