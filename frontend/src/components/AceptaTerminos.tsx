import { useId } from "react";
import { AlertCircle } from "lucide-react";

interface Props {
  aceptado: boolean;
  onCambio: (aceptado: boolean) => void;
  /** Mensaje de validación. Si viene, la casilla se marca como inválida y el mensaje se anuncia. */
  error?: string;
}

/**
 * Casilla de aceptación de los Términos y Condiciones y la Política de Privacidad (8.7). Los enlaces abren
 * en una pestaña nueva para no perder lo que la persona ya cargó en el formulario.
 */
export function AceptaTerminos({ aceptado, onCambio, error }: Props) {
  const errorId = useId();
  const enlace = "text-primary underline";
  return (
    <div>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={aceptado}
          onChange={(e) => onCambio(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
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
      {error && (
        <p id={errorId} className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-destructive">
          <AlertCircle size={13} className="mt-px flex-none" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
