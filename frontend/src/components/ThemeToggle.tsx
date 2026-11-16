import { Moon, Sun } from "lucide-react";
import { useLocation } from "react-router";
import { useTheme } from "../lib/theme";
// Import directo (no el barrel "./ui"): este archivo va en el bundle inicial y el barrel
// arrastraría todos los componentes de ui a la carga inicial.
import { IconButton } from "./ui/Button";

/**
 * Botón de tema claro/oscuro para ubicar dentro de un header (shell de Organizador/Admin,
 * pantallas de acceso). Es la forma definitiva: cada pantalla le hace lugar en su propio
 * header en vez de que un botón flote encima del contenido.
 */
export function ThemeToggle({ variant = "ghost" }: { variant?: "ghost" | "secondary" }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <IconButton
      onClick={toggleTheme}
      label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      icon={theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      variant={variant}
      round
    />
  );
}

/**
 * Rutas que ya tienen el toggle en su propio header (o que no lo necesitan: el Scanner es
 * una pantalla siempre negra, independiente del tema). Se amplía a medida que cada sección
 * se migra (13.4–13.8); cuando cubra toda la app, `FloatingThemeToggle` se elimina.
 */
function tieneToggleEnSuHeader(pathname: string): boolean {
  return (
    pathname.startsWith("/organizador") ||
    pathname.startsWith("/admin") ||
    pathname === "/staff/login" ||
    pathname === "/staff/scanner" ||
    // Flujo de compra (13.4): PublicHeader
    pathname.startsWith("/eventos/") ||
    pathname === "/checkout" ||
    pathname === "/pago/resultado" ||
    pathname === "/mi-entrada"
  );
}

/**
 * Toggle flotante (fixed arriba a la derecha) — **transitorio**, solo para las pantallas que
 * todavía no tienen header propio con lugar para el toggle. z-[60] porque varias de esas
 * pantallas tienen headers sticky en z-50 que, montados después en el DOM, le tapaban los clicks.
 */
export function FloatingThemeToggle() {
  const { pathname } = useLocation();
  if (tieneToggleEnSuHeader(pathname)) return null;
  return (
    <div className="fixed right-3 top-3 z-[60] rounded-full bg-card shadow-raised">
      <ThemeToggle variant="secondary" />
    </div>
  );
}
