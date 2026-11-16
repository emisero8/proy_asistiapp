import { createContext, useContext } from "react";

export interface FieldContextValue {
  id: string;
  /** id del <label>: los controles que no son inputs nativos (DatePicker) lo usan en aria-labelledby. */
  labelId: string;
  describedBy?: string;
  invalid: boolean;
  required?: boolean;
}

export const FieldContext = createContext<FieldContextValue | null>(null);

interface PropsControl {
  id?: string;
  required?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
}

/**
 * Conecta un control (`Input`, `Textarea`, `Select`) con el `<Field>` que lo envuelve:
 * `id` (para el `htmlFor` del label), `aria-describedby` (ayuda + error), `aria-invalid` y
 * `required`. Lo que el control reciba explícitamente por props tiene prioridad.
 */
export function useFieldControl<P extends PropsControl>(props: P): P {
  const campo = useContext(FieldContext);
  if (!campo) return props;
  const describedBy = [campo.describedBy, props["aria-describedby"]].filter(Boolean).join(" ") || undefined;
  return {
    ...props,
    id: props.id ?? campo.id,
    required: props.required ?? campo.required,
    "aria-describedby": describedBy,
    "aria-invalid": props["aria-invalid"] ?? (campo.invalid || undefined),
  };
}
