import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "../../lib/cn";
import { Input, type InputProps } from "./Field";

interface PasswordInputProps extends Omit<InputProps, "type" | "leadingIcon"> {
  /** Qué contraseña es, para el nombre del botón de mostrar/ocultar (ej. "la confirmación"). */
  toggleLabel?: string;
}

/**
 * Campo de contraseña con botón para mostrarla. Se usa dentro de un `<Field>` como cualquier
 * `Input` (toma el id, la ayuda y el error del campo). El botón de mostrar/ocultar se alcanza
 * con teclado y anuncia su estado con `aria-pressed`.
 */
export function PasswordInput({ toggleLabel = "contraseña", className, ...rest }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={cn("relative", className)}>
      <Input {...rest} type={visible ? "text" : "password"} className="pr-11" />
      <button
        type="button"
        aria-label={visible ? `Ocultar ${toggleLabel}` : `Mostrar ${toggleLabel}`}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-(--duration-fast) hover:bg-muted hover:text-foreground"
      >
        {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
      </button>
    </div>
  );
}
