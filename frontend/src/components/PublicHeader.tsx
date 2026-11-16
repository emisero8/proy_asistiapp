import { Link, useNavigate } from "react-router";
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
            className={`rounded-md text-lg font-extrabold tracking-tight text-foreground ${back ? "hidden sm:inline" : ""}`}
            aria-label="AsistíAPP — inicio"
          >
            Asistí<span className="text-primary">APP</span>
          </Link>
        </div>
        <nav aria-label="Secciones" className="flex items-center gap-1">
          <Link
            to="/eventos"
            className="inline-flex h-9 items-center rounded-xl px-3 text-sm font-semibold text-foreground transition-colors duration-(--duration-fast) hover:bg-muted"
          >
            Eventos
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
