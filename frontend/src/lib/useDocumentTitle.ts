import { useEffect } from "react";

const TITULO_BASE = "AsistíAPP";

/**
 * Pone el título de la pestaña del navegador (`"Crear evento · AsistíAPP"`) mientras la pantalla
 * está montada, y restaura el anterior al desmontarse. Con `null`/`undefined` (ej. el evento todavía
 * está cargando) deja solo el título base en vez de mostrar "undefined".
 */
export function useDocumentTitle(titulo?: string | null) {
  useEffect(() => {
    const anterior = document.title;
    document.title = titulo ? `${titulo} · ${TITULO_BASE}` : TITULO_BASE;
    return () => {
      document.title = anterior;
    };
  }, [titulo]);
}
