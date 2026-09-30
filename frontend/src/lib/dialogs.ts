import { createContext, useContext, type ReactNode } from "react";

/** Variante `destructiva`: botón de confirmar en rojo y foco inicial en "Cancelar" (para no borrar algo con un Enter distraído). */
export type VarianteDialogo = "normal" | "destructiva";

export interface ConfirmOpciones {
  titulo: string;
  mensaje?: ReactNode;
  confirmarTexto?: string;
  /** Útil cuando "Cancelar" sería ambiguo (ej. confirmar la cancelación de un evento → "No, volver"). */
  cancelarTexto?: string;
  variante?: VarianteDialogo;
}

export interface AlertOpciones {
  titulo: string;
  mensaje?: ReactNode;
  cerrarTexto?: string;
  /** Texto destacado con botón "Copiar" (ej. una contraseña temporal que se muestra una sola vez). */
  copiable?: string;
}

export interface PromptOpciones {
  titulo: string;
  mensaje?: ReactNode;
  etiqueta: string;
  placeholder?: string;
  tipo?: "text" | "password";
  confirmarTexto?: string;
  /** Devuelve el mensaje de error a mostrar, o `null` si el valor es válido. El diálogo no se cierra mientras haya error. */
  validar?: (valor: string) => string | null;
}

export interface DialogosApi {
  /** `true` si el usuario confirma; `false` si cancela, aprieta Escape o hace clic afuera. */
  confirm: (opciones: ConfirmOpciones) => Promise<boolean>;
  alert: (opciones: AlertOpciones) => Promise<void>;
  /** El texto ingresado, o `null` si el usuario cancela. */
  prompt: (opciones: PromptOpciones) => Promise<string | null>;
}

export const DialogContext = createContext<DialogosApi | undefined>(undefined);

/**
 * Reemplazo de `window.confirm` / `window.alert` / `window.prompt`, con el diseño de la app.
 * Requiere estar dentro de `<DialogProvider>`.
 */
export function useDialog(): DialogosApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog debe usarse dentro de <DialogProvider>");
  return ctx;
}
