import { Link } from "react-router";
import { cn } from "../lib/cn";

interface BrandLogoProps {
  /** Destino del link (default `/`). Los paneles internos lo apuntan a su inicio (dashboard). */
  to?: string;
  /** Clases de layout (margen, posición, visibilidad). No pisar colores/tamaño: usar `tone`/`size`. */
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
  /** Clase de display del Link (default `flex`). Para esconderlo en mobile: `"hidden sm:flex"`. */
  display?: string;
  /** `onDark`: variante para fondos siempre oscuros (el Scanner del Staff, siempre negro). */
  tone?: "default" | "onDark";
  /** Tamaño de la tipografía del wordmark (default `text-lg`, como Home/PublicHeader). */
  size?: "lg" | "xl";
}

/**
 * Marca "AsistíAPP": isotipo del ticket lima perforado + wordmark (tipografía Archivo) con la
 * microanimación de hover (gira/escala el ticket). Único componente de marca, compartido por la
 * Home, el header público del comprador y las pantallas de acceso — así el logo es idéntico en
 * todas. Siempre enlaza al inicio.
 */
export function BrandLogo({ to = "/", className, onClick, ariaLabel = "AsistíAPP — inicio", display = "flex", tone = "default", size = "lg" }: BrandLogoProps) {
  const onDark = tone === "onDark";
  // Trazo, muescas y perforación del ticket SIEMPRE en carbón (#141311): sobre el relleno lima se
  // leen nítidos en los dos temas. Con var(--foreground) el trazo quedaba blanco (e invisible
  // sobre el lima) en modo oscuro. Es un valor de marca fijo (excepción documentada en DESIGN.md).
  const trazo = "#141311";
  return (
    <Link
      to={to}
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "group flex-none items-center gap-2 rounded-md font-extrabold tracking-tight",
        display,
        size === "xl" ? "text-xl" : "text-lg",
        onDark ? "text-white" : "text-foreground",
        className,
      )}
    >
      <svg
        viewBox="0 0 30 20"
        aria-hidden="true"
        className="h-5 w-[30px] flex-none transition-transform duration-(--duration-base) ease-emphasized group-hover:-rotate-6 group-hover:scale-110 group-active:scale-95"
      >
        <path
          d="M2 1h26a1 1 0 0 1 1 1v5a3 3 0 0 0 0 6v5a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-5a3 3 0 0 0 0-6V2a1 1 0 0 1 1-1z"
          fill="var(--accent)"
          stroke={trazo}
          strokeWidth="1.5"
        />
        <path d="M20 3v14" stroke={trazo} strokeWidth="1.5" strokeDasharray="2 2" />
      </svg>
      <span>
        {/* En la Home "APP" usa text-primary, que en cada tema ≈ --foreground: la marca se lee
            monocromática. En el panel oscuro se hereda el blanco del wordmark para el mismo efecto. */}
        Asistí<span className={onDark ? undefined : "text-primary"}>APP</span>
      </span>
    </Link>
  );
}
