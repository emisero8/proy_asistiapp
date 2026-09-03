import { Moon, Sun } from "lucide-react";
import { useTheme } from "../lib/theme";

/**
 * Toggle de tema global — flota sobre cualquier pantalla (fixed, z-50) para no
 * depender de que cada layout (Buyer/Organizador/Staff/Admin) le haga lugar
 * en su propio header.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
      className="fixed top-3 right-3 z-50 w-9 h-9 rounded-full bg-card border border-border shadow-lg shadow-black/10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
