import { useId, type InputHTMLAttributes, type ReactNode, type Ref, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";
import { FieldContext, useFieldControl } from "./fieldContext";
import { CONTROL, SUPERFICIES, ALTOS, type Superficie, type TamanoControl } from "./controlStyles";

interface FieldProps {
  label: ReactNode;
  /** Texto de ayuda debajo del control. Si hay `error`, el error lo reemplaza (no se muestran los dos: suelen decir lo mismo). */
  hint?: ReactNode;
  /** Error de validación: pinta el control en rojo y lo anuncia (`aria-invalid` + `aria-describedby`). */
  error?: ReactNode;
  required?: boolean;
  /** Oculta el label visualmente (sigue disponible para lectores de pantalla). */
  labelHidden?: boolean;
  /** `mono`: etiqueta editorial en IBM Plex Mono, mayúsculas con tracking (formularios de tarjetas editoriales). */
  labelVariant?: "default" | "mono";
  className?: string;
  children: ReactNode;
}

/**
 * Campo de formulario: label + control + ayuda + error, **ya conectados entre sí** (el label
 * apunta al control, y la ayuda y el error quedan asociados con `aria-describedby`). El control
 * de adentro (`Input`, `Textarea`, `Select`) toma el `id` del contexto, no hace falta pasarlo.
 */
export function Field({ label, hint, error, required, labelHidden, labelVariant = "default", className, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-ayuda`;
  const errorId = `${id}-error`;
  const mostrarAyuda = Boolean(hint) && !error;
  const describedBy = error ? errorId : mostrarAyuda ? hintId : undefined;

  return (
    <FieldContext.Provider value={{ id, labelId: `${id}-label`, describedBy, invalid: Boolean(error), required }}>
      <div className={cn("space-y-1.5", className)}>
        <label id={`${id}-label`} htmlFor={id} className={cn(
            "block text-muted-foreground",
            labelVariant === "mono" ? "font-mono text-2xs font-semibold uppercase tracking-[0.12em]" : "text-xs font-medium",
            labelHidden && "sr-only",
          )}
        >
          {label}
          {required && (
            <span aria-hidden="true" className="text-destructive">
              {" "}
              *
            </span>
          )}
        </label>
        {children}
        {mostrarAyuda && (
          <p id={hintId} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="flex items-start gap-1.5 text-xs font-medium text-destructive">
            <AlertCircle size={13} className="mt-px flex-none" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** `card` sobre el fondo de la pantalla (default); `sunken` dentro de una tarjeta. */
  surface?: Superficie;
  size?: TamanoControl;
  /** Ícono decorativo a la izquierda (ej. lupa de un buscador). */
  leadingIcon?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

export function Input({ surface = "card", size = "md", leadingIcon, className, ref, ...rest }: InputProps) {
  const props = useFieldControl(rest);
  const input = (
    <input
      ref={ref}
      className={cn(CONTROL, SUPERFICIES[surface], ALTOS[size], leadingIcon ? "pl-10 pr-4" : "px-4", !leadingIcon && className)}
      {...props}
    />
  );
  if (!leadingIcon) return input;
  return (
    <div className={cn("relative", className)}>
      <span aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
        {leadingIcon}
      </span>
      {input}
    </div>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  surface?: Superficie;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({ surface = "card", rows = 3, className, ref, ...rest }: TextareaProps) {
  const props = useFieldControl(rest);
  return <textarea ref={ref} rows={rows} className={cn(CONTROL, SUPERFICIES[surface], "px-4 py-3 resize-none leading-relaxed", className)} {...props} />;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  surface?: Superficie;
  size?: TamanoControl;
  ref?: Ref<HTMLSelectElement>;
}

/** `<select>` nativo (lo más usable en mobile: abre el selector del sistema) con el estilo de los inputs. */
export function Select({ surface = "card", size = "md", className, children, ref, ...rest }: SelectProps) {
  const props = useFieldControl(rest);
  return (
    <div className={cn("relative", className)}>
      <select ref={ref} className={cn(CONTROL, SUPERFICIES[surface], ALTOS[size], "appearance-none pl-4 pr-10")} {...props}>
        {children}
      </select>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
