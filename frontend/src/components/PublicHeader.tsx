import { Link, NavLink, useNavigate } from "react-router";
import { ChevronLeft } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

interface PublicHeaderProps {
  /**
   * Botón "Volver" a la izquierda del logo. `"historial"` vuelve a la pantalla anterior
   * (si se entró por link directo y no hay historial dentro de la app, va al catálogo).
   */
  back?: "historial" | { to: string; label?: string };
}

/**
 * Header de las pantallas públicas del comprador (detalle, checkout, resultado del pago,
 * mi entrada): logo (inicio), acceso al catálogo y el tema. Sticky y liviano: no compite con
 * el contenido.
 */
export function PublicHeader({ back }: PublicHeaderProps) {
  const navigate = useNavigate();

  function volver() {
    // window.history.state.idx lo mantiene React Router: 0 = primera pantalla de la sesión.
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate("/eventos");
  }

  const claseVolver =
    "inline-flex h-9 items-center gap-1 rounded-xl pl-1.5 pr-3 text-sm font-medium text-muted-foreground transition-colors duration-(--duration-fast) hover:bg-muted hover:text-foreground";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          {back === "historial" && (
            <button type="button" onClick={volver} className={claseVolver}>
              <ChevronLeft size={18} aria-hidden="true" />
              Volver
            </button>
          )}
          {back && back !== "historial" && (
            <Link to={back.to} className={claseVolver}>
              <ChevronLeft size={18} aria-hidden="true" />
              {back.label ?? "Volver"}
            </Link>
          )}
          <Link
            to="/"
            className={`group items-center gap-2 rounded-md text-lg font-extrabold tracking-tight text-foreground ${back ? "hidden sm:flex" : "flex"}`}
            aria-label="AsistíAPP — inicio"
          >
            <svg
              viewBox="0 0 30 20"
              aria-hidden="true"
              className="h-5 w-[30px] flex-none transition-transform duration-(--duration-base) ease-emphasized group-hover:-rotate-6 group-hover:scale-110 group-active:scale-95"
            >
              <path
                d="M2 1h26a1 1 0 0 1 1 1v5a3 3 0 0 0 0 6v5a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-5a3 3 0 0 0 0-6V2a1 1 0 0 1 1-1z"
                fill="var(--accent)"
                stroke="var(--foreground)"
                strokeWidth="1.5"
              />
              <path d="M20 3v14" stroke="var(--foreground)" strokeWidth="1.5" strokeDasharray="2 2" />
            </svg>
            <span>
              Asistí<span className="text-primary">APP</span>
            </span>
          </Link>
        </div>
        <nav aria-label="Secciones" className="flex items-center gap-1">
          <NavLink
            to="/eventos"
            end
            className={({ isActive }) =>
              `group relative inline-flex h-9 items-center px-2 text-sm font-semibold transition-colors duration-(--duration-fast) after:pointer-events-none after:absolute after:inset-x-2 after:bottom-1.5 after:h-0.5 after:origin-left after:bg-foreground after:transition-transform after:duration-300 ${
                isActive ? "text-foreground after:scale-x-100" : "text-muted-foreground hover:text-foreground after:scale-x-0 hover:after:scale-x-100"
              }`
            }
          >
            Eventos
          </NavLink>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
