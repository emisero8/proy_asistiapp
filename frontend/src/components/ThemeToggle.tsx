import { Moon, Sun } from "lucide-react";
import { useTheme } from "../lib/theme";

type Props = {
  /**
   * - `normal`: botón redondo de la paleta, para usar dentro de un header (lo común).
   * - `sobre-imagen`: translúcido y oscuro, para ponerlo encima de una foto (portada del evento).
   * - `esquina`: fijo arriba a la derecha, SOLO para pantallas que no tienen header (login, registro).
   */
  variante?: "normal" | "sobre-imagen" | "esquina";
  className?: string;
};

const ESTILOS = {
  normal:
    "w-9 h-9 bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40",
  "sobre-imagen": "w-8 h-8 bg-black/50 backdrop-blur-sm text-white hover:bg-black/70",
  esquina:
    "fixed top-3 right-3 z-20 w-9 h-9 bg-card border border-border shadow-lg shadow-black/10 text-muted-foreground hover:text-foreground hover:border-primary/40",
} as const;

/**
 * Botón de tema claro/oscuro. Cada pantalla lo coloca en su propio header (antes era un
 * botón global flotante: tapaba los botones del escáner y, por z-index, quedaba debajo de
 * los headers fijos de otras pantallas, que le tapaban los clics).
 *
 * El escáner de QR (`/staff/scanner`) no lo muestra a propósito: es un overlay de cámara
 * negro que ignora el tema.
 */
export function ThemeToggle({ variante = "normal", className = "" }: Props) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
      className={`flex-none rounded-full flex items-center justify-center transition-colors ${ESTILOS[variante]} ${className}`}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
