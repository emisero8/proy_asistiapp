import { Moon, Sun } from "lucide-react";
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
