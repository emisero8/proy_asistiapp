interface Props {
  aceptado: boolean;
  onCambio: (aceptado: boolean) => void;
}

/**
 * Casilla de aceptación de los Términos y Condiciones y la Política de Privacidad (8.7). Los enlaces abren
 * en una pestaña nueva para no perder lo que la persona ya cargó en el formulario.
 */
export function AceptaTerminos({ aceptado, onCambio }: Props) {
  const enlace = "text-primary underline";
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={aceptado}
        onChange={(e) => onCambio(e.target.checked)}
        className="mt-0.5 w-4 h-4 flex-none accent-primary"
      />
      <span className="text-xs text-muted-foreground leading-relaxed">
        Acepto los{" "}
        <a href="/terminos" target="_blank" rel="noopener noreferrer" className={enlace}>
          Términos y Condiciones
        </a>{" "}
        y la{" "}
        <a href="/privacidad" target="_blank" rel="noopener noreferrer" className={enlace}>
          Política de Privacidad
        </a>{" "}
        de AsistíAPP.
      </span>
    </label>
  );
}
